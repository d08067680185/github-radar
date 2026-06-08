import { cookies } from "next/headers";
import { type Locale, LOCALE_COOKIE, getDictFor } from "./i18n";

// 服务端组件：从 cookie 读 locale（默认 zh）
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  return c.get(LOCALE_COOKIE)?.value === "en" ? "en" : "zh";
}

export async function getDict() {
  return getDictFor(await getLocale());
}
