import { test, expect } from "@playwright/test";

test("首页加载且有榜单卡片", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /综合优质榜/ })).toBeVisible();
  // 至少有一张项目卡片（链接到 /repo/...）
  await expect(page.locator('a[href^="/repo/"]').first()).toBeVisible();
});

test("Hero 搜索跳转到搜索页并出结果", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder(/搜索项目/).fill("react");
  await page.getByRole("button", { name: "搜索" }).click();
  await expect(page).toHaveURL(/\/search\?q=react/);
  await expect(page.locator('a[href^="/repo/"]').first()).toBeVisible();
});

test("点击卡片进入详情页", async ({ page }) => {
  await page.goto("/");
  const first = page.locator('a[href^="/repo/"]').first();
  await first.click();
  await expect(page).toHaveURL(/\/repo\//);
  await expect(page.getByRole("heading", { name: /相似项目|Star 趋势/ }).first()).toBeVisible();
});

test("主题切换改变 data-theme", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await page.getByRole("button", { name: /切换到/ }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("Trending 榜可访问且能翻页", async ({ page }) => {
  await page.goto("/trending");
  await expect(page.getByRole("heading", { name: /Trending 榜/ })).toBeVisible();
  await expect(page.getByText(/下一页/)).toBeVisible();
});

test("星图页加载且画布渲染、图例可用", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/map");
  await expect(page.getByRole("heading", { name: /开源星图/ })).toBeVisible();
  // canvas 存在且有实际尺寸（说明已挂载渲染）
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box && box.width).toBeGreaterThan(100);
  // 领域图例至少一个，点击不报错
  await page.locator(".galaxy-chip").first().click();
  expect(errors).toEqual([]);
});
