import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE } from "@/lib/i18n";

// 1) 应用层强制 HTTPS（生产，反代带 X-Forwarded-Proto）；
// 2) per-URL 语言路由：/en/* = 英文，其余 = 中文。把 locale 放进请求头 x-ghradar-locale
//    供服务端组件读取，并同步 cookie，让用户在未加前缀的内链上也保持英文（SEO 由路径决定，
//    无 cookie 的爬虫按路径拿到正确语种）。
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ── HTTPS 强跳（仅生产；ACME 续期放行）──
  if (process.env.NODE_ENV === "production" && !pathname.startsWith("/.well-known/")) {
    const proto = req.headers.get("x-forwarded-proto");
    const host = req.headers.get("host");
    if (proto === "http" && host) {
      return NextResponse.redirect(`https://${host}${pathname}${search}`, 308);
    }
  }

  // ── 语言路由 ──
  const isEn = pathname === "/en" || pathname.startsWith("/en/");
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value === "en" ? "en" : "zh";
  // 路径权威：/en → en；非 /en → 跟随 cookie（让用户跨未前缀链接保持英文）
  const locale = isEn ? "en" : cookieLocale;
  // 规范路径（去掉 /en 前缀）：既是 /en 的重写目标，也供 layout 生成 hreflang 对照
  const canonicalPath = isEn ? (pathname === "/en" ? "/" : pathname.slice(3)) : pathname;

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-ghradar-locale", locale);
  reqHeaders.set("x-ghradar-path", canonicalPath);

  let res: NextResponse;
  if (isEn) {
    // 去掉 /en 前缀后重写到真实页面
    const url = req.nextUrl.clone();
    url.pathname = canonicalPath;
    res = NextResponse.rewrite(url, { request: { headers: reqHeaders } });
    res.cookies.set(LOCALE_COOKIE, "en", { path: "/", maxAge: 31536000 });
  } else {
    res = NextResponse.next({ request: { headers: reqHeaders } });
  }
  return res;
}

export const config = {
  // 跳过 Next 内部资源与静态文件；只排除具体资产扩展名，避免误伤带点的仓库名
  // （如 /en/repo/vercel/next.js 必须命中中间件才能去 /en 前缀重写）。
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif|txt|xml|json|woff2?|ttf|map)$).*)",
  ],
};
