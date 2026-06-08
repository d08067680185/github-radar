import { NextRequest, NextResponse } from "next/server";

// 应用层强制 HTTPS：反代(nginx)带 X-Forwarded-Proto 头，检测到 http 就 308 跳 https。
// 这样跳转随 Docker 自动部署生效，无需改宿主机 nginx。
// 本地开发(直连 :3000，无该头) 不触发；ACME 续期路径放行。
export function middleware(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("host");
  const { pathname, search } = req.nextUrl;

  // 仅生产强制；本地开发(localhost 无 TLS)不跳，否则会死循环到 https://localhost
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  // Let's Encrypt 续期校验必须走 http，放行
  if (pathname.startsWith("/.well-known/")) return NextResponse.next();

  if (proto === "http" && host) {
    return NextResponse.redirect(`https://${host}${pathname}${search}`, 308);
  }
  return NextResponse.next();
}

export const config = {
  // 跳过 Next 内部资源，减少无谓执行
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
