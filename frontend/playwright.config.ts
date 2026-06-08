import { defineConfig, devices } from "@playwright/test";

// 冒烟测试：需后端(:8077)+前端(:3000)都在跑。
//   npm run dev  (另起后端 uvicorn :8077)
//   npx playwright test
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
