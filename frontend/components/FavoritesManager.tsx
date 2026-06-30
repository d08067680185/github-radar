"use client";

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/auth";
import { useLocale } from "@/lib/i18n-client";
import { localeHref } from "@/lib/locale-link";
import type { Favorite } from "@/lib/types";

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function FavoritesManager({ token }: { token: string }) {
  const { t } = useLocale();
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null); // 当前标签筛选
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // 正在编辑的 full_name

  const reload = useCallback(async () => {
    const [f, tg] = await Promise.all([
      authFetch(token, "/favorites").then((r) => r.json()),
      authFetch(token, "/favorites/tags").then((r) => r.json()),
    ]);
    setFavs(f);
    setTags(tg);
    setLoaded(true);
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const shown = active ? favs.filter((f) => f.tags.includes(active)) : favs;

  const save = async (fullName: string, rawTags: string, note: string) => {
    const parsed = rawTags.split(",").map((s) => s.trim()).filter(Boolean);
    await authFetch(token, `/favorites/${fullName}`, {
      method: "PATCH",
      body: JSON.stringify({ tags: parsed, note: note.trim() || null }),
    });
    setEditing(null);
    await reload();
  };

  const remove = async (fullName: string) => {
    await authFetch(token, `/favorites/${fullName}`, { method: "DELETE" });
    await reload();
  };

  const exportFile = async (fmtType: "json" | "markdown") => {
    const res = await authFetch(token, `/favorites/export?fmt=${fmtType}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fmtType === "json" ? "github-radar-favorites.json" : "github-radar-favorites.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loaded && favs.length === 0) {
    return <p className="page-sub">{t.search_empty}</p>;
  }

  return (
    <div>
      {/* 工具条：标签筛选 + 导出 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "8px 0 16px" }}>
        {tags.length > 0 && (
          <>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{t.fav_filter_by}</span>
            <button className={`chip${active === null ? " active" : ""}`} onClick={() => setActive(null)}>
              {t.fav_all} · {favs.length}
            </button>
            {tags.map((tg) => (
              <button key={tg} className={`chip${active === tg ? " active" : ""}`} onClick={() => setActive(tg)}>
                {tg}
              </button>
            ))}
          </>
        )}
        <span style={{ flex: 1 }} />
        <button className="chip" onClick={() => exportFile("json")}>{t.fav_export_json}</button>
        <button className="chip" onClick={() => exportFile("markdown")}>{t.fav_export_md}</button>
      </div>

      {/* 收藏列表 */}
      <div style={{ display: "grid", gap: 10 }}>
        {shown.map((f) => (
          <FavRow
            key={f.project.full_name + (editing === f.project.full_name ? "-e" : "")}
            fav={f}
            editing={editing === f.project.full_name}
            onEdit={() => setEditing(f.project.full_name)}
            onCancel={() => setEditing(null)}
            onSave={save}
            onRemove={remove}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function FavRow({
  fav,
  editing,
  onEdit,
  onCancel,
  onSave,
  onRemove,
  t,
}: {
  fav: Favorite;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (fullName: string, tags: string, note: string) => void;
  onRemove: (fullName: string) => void;
  t: ReturnType<typeof useLocale>["t"];
}) {
  const { locale } = useLocale();
  const p = fav.project;
  const [tagStr, setTagStr] = useState(fav.tags.join(", "));
  const [note, setNote] = useState(fav.note || "");

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <a className="repo-name" href={localeHref(`/repo/${p.full_name}`, locale)}>{p.full_name}</a>
        <span style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>⭐ {fmt(p.stars)}</span>
      </div>
      {p.description && (
        <div style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0" }}>{p.description}</div>
      )}

      {!editing ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 6 }}>
          {fav.tags.map((tg) => (
            <span key={tg} className="chip" style={{ cursor: "default" }}>{tg}</span>
          ))}
          {fav.note && <span style={{ fontSize: 13, color: "var(--faint)" }}>📝 {fav.note}</span>}
          <span style={{ flex: 1 }} />
          <button className="chip" onClick={onEdit}>{t.fav_edit}</button>
          <button className="chip" onClick={() => onRemove(p.full_name)}>{t.fav_remove}</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <input className="search-input" style={{ margin: 0 }} placeholder={t.fav_tags_ph}
                 value={tagStr} onChange={(e) => setTagStr(e.target.value)} />
          <input className="search-input" style={{ margin: 0 }} placeholder={t.fav_note_ph}
                 value={note} onChange={(e) => setNote(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="chip active" onClick={() => onSave(p.full_name, tagStr, note)}>{t.fav_save}</button>
            <button className="chip" onClick={onCancel}>{t.fav_cancel}</button>
          </div>
        </div>
      )}
    </div>
  );
}
