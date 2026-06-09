"""README / 描述 AI 双语简介。

给项目生成一句话亮点，中文写入 Project.readme_summary，英文写入 Project.readme_summary_en，
前端按当前 locale（zh/en）择一展示。
- 模型：Haiku 4.5（最便宜，一句话摘要足够）
- 批量回填：Batches API（异步、5 折），每个缺失语言一条请求
- 增量：只处理「缺中文 或 缺英文」且有素材(description 或 topics)的项目
未配置 ANTHROPIC_API_KEY 时整体跳过（降级桩）。
"""
import logging
import time

from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Project, CollectLog

logger = logging.getLogger(__name__)

_SYSTEM_ZH = (
    "你是开源项目策展人。根据给定信息，用一句不超过40字的中文，"
    "概括这个开源项目是做什么的、亮点在哪。只输出这句话，不要前缀、不要引号。"
    "信息不足时基于项目名简要描述，不要编造具体功能或数字。"
)
_SYSTEM_EN = (
    "You are an open-source curator. Based on the given info, write ONE sentence "
    "(max 25 words, in English) summarizing what this project does and why it stands out. "
    "Output only that sentence — no prefix, no quotes. "
    "If info is sparse, describe briefly from the name; do not invent features or numbers."
)

# 语言 → (Project 属性名, system 提示词)
LANGS: dict[str, tuple[str, str]] = {
    "zh": ("readme_summary", _SYSTEM_ZH),
    "en": ("readme_summary_en", _SYSTEM_EN),
}


def _client():
    if not settings.anthropic_api_key:
        return None
    try:
        import anthropic
    except ImportError:
        logger.warning("未安装 anthropic SDK，AI 简介跳过。pip install anthropic")
        return None
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _prompt(p: Project) -> str:
    return (
        f"项目：{p.full_name}\n"
        f"描述：{p.description or '(无)'}\n"
        f"语言：{p.language or '(无)'}\n"
        f"Topics：{', '.join(p.topics) or '(无)'}"
    )


def _missing_langs(p: Project) -> list[str]:
    """该项目还缺哪些语言的简介。"""
    return [lang for lang, (attr, _) in LANGS.items() if not getattr(p, attr)]


def _pending(db: Session, limit: int):
    """待生成简介的项目：缺中文 或 缺英文，且 有素材(描述或 topics)。"""
    stmt = (
        select(Project)
        .where(
            or_(Project.readme_summary.is_(None), Project.readme_summary_en.is_(None)),
            Project.is_archived.is_(False),
            or_(Project.description.is_not(None), func.cardinality(Project.topics) > 0),
        )
        .order_by(Project.score.desc())
        .limit(limit)
    )
    return db.execute(stmt).scalars().all()


def summarize_missing(db: Session, limit: int = 50) -> int:
    """增量(同步)：少量项目即时生成双语简介。日常新项目用这个。返回生成的字段数。"""
    client = _client()
    if client is None:
        logger.info("AI 简介未启用（无 ANTHROPIC_API_KEY），跳过。")
        return 0
    rows = _pending(db, limit)
    n = 0
    for p in rows:
        for lang in _missing_langs(p):
            attr, system = LANGS[lang]
            try:
                resp = client.messages.create(
                    model=settings.summarize_model, max_tokens=150,
                    system=system, messages=[{"role": "user", "content": _prompt(p)}],
                )
                text = next((b.text for b in resp.content if b.type == "text"), "").strip()
                if text:
                    setattr(p, attr, text)
                    n += 1
            except Exception as e:  # noqa: BLE001
                logger.warning("简介失败 %s[%s]：%s", p.full_name, lang, e)
    db.commit()
    logger.info("AI 简介(同步)完成：%d 条", n)
    return n


def summarize_backfill(db: Session, limit: int | None = None) -> int:
    """批量回填：用 Batches API（5 折）一次性给大量项目生成缺失语言的简介。"""
    from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
    from anthropic.types.messages.batch_create_params import Request

    client = _client()
    if client is None:
        logger.info("AI 简介未启用，跳过回填。")
        return 0

    limit = limit or settings.summarize_max_per_run
    rows = _pending(db, limit)
    if not rows:
        logger.info("没有待生成简介的项目。")
        return 0

    by_id = {p.id: p for p in rows}
    requests = []
    for p in rows:
        for lang in _missing_langs(p):
            _, system = LANGS[lang]
            requests.append(Request(
                custom_id=f"p-{p.id}-{lang}",
                params=MessageCreateParamsNonStreaming(
                    model=settings.summarize_model, max_tokens=150,
                    system=system,
                    messages=[{"role": "user", "content": _prompt(p)}],
                ),
            ))
    if not requests:
        logger.info("没有待生成简介的项目。")
        return 0
    logger.info("提交 Batches：%d 条请求（%d 项目 × 双语缺口）", len(requests), len(rows))

    try:
        batch = client.messages.batches.create(requests=requests)
    except Exception as e:  # noqa: BLE001  余额不足/限流等 → 友好失败，不崩调用方
        msg = str(e)
        if "credit balance" in msg.lower():
            logger.error("AI 简介失败：Anthropic 账户余额不足，请充值后重试。")
        else:
            logger.error("AI 简介批量提交失败：%s", msg[:300])
        db.add(CollectLog(task="summarize", status="error", detail=msg[:500]))
        db.commit()
        return 0

    # 轮询直到完成（通常几分钟到 1 小时）
    while True:
        b = client.messages.batches.retrieve(batch.id)
        if b.processing_status == "ended":
            break
        logger.info("Batches 处理中：%s", b.request_counts)
        time.sleep(20)

    n = 0
    for result in client.messages.batches.results(batch.id):
        # custom_id 形如 p-123-zh / p-123-en
        try:
            _, pid_str, lang = result.custom_id.rsplit("-", 2)
            pid = int(pid_str)
        except ValueError:
            continue
        p = by_id.get(pid)
        if p is None or lang not in LANGS or result.result.type != "succeeded":
            continue
        msg = result.result.message
        text = next((blk.text for blk in msg.content if blk.type == "text"), "").strip()
        if text:
            setattr(p, LANGS[lang][0], text)
            n += 1
    db.add(CollectLog(task="summarize", status="ok", repos_affected=n,
                      detail=f"batch {batch.id}"))
    db.commit()
    logger.info("AI 简介(批量)完成：%d 条", n)
    return n
