/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // 生产 Docker 用精简独立产物
  // 后端基址：服务端取数用
  env: {
    API_BASE: process.env.API_BASE || "http://127.0.0.1:8077",
    SITE_URL: process.env.SITE_URL || "http://localhost:3000",
  },
  // 代理到后端同域：RSS 源 + 浏览器侧的用户接口(登录/收藏/推荐)
  async rewrites() {
    const api = process.env.API_BASE || "http://127.0.0.1:8077";
    return [
      { source: "/feed/:path*", destination: `${api}/feed/:path*` },
      { source: "/proxy-api/:path*", destination: `${api}/api/:path*` },
    ];
  },
};
module.exports = nextConfig;
