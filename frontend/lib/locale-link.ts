import type { Locale } from "./i18n";

/**
 * 给内部路径加 /en 前缀，使内链跟随当前语言。
 * 服务端组件配合 getLocale()，客户端组件配合 useLocale()。
 */
export function localeHref(path: string, locale: Locale): string {
  if (locale !== "en") return path;
  return path === "/" ? "/en" : `/en${path}`;
}
