import { cookies, headers } from "next/headers";
import { type Locale, LOCALE_COOKIE, getDictFor } from "./i18n";

// 服务端组件：locale 来源优先级 = 中间件按 URL 路径写入的 x-ghradar-locale（路径权威，
// 让 /en/* 对无 cookie 的爬虫也渲染英文）→ cookie → 默认 zh。
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  const fromHeader = h.get("x-ghradar-locale");
  if (fromHeader === "en" || fromHeader === "zh") return fromHeader;
  const c = await cookies();
  return c.get(LOCALE_COOKIE)?.value === "en" ? "en" : "zh";
}

// 当前请求的规范路径（已去 /en 前缀），供 layout 生成 hreflang 对照链接。
export async function getCanonicalPath(): Promise<string> {
  const h = await headers();
  return h.get("x-ghradar-path") || "/";
}

export async function getDict() {
  return getDictFor(await getLocale());
}
