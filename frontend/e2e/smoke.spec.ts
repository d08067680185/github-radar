import { test, expect } from "@playwright/test";

test("首页加载且有榜单卡片", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /综合优质榜/ })).toBeVisible();
  // 至少有一张项目卡片（链接到 /repo/...）
  await expect(page.locator('a[href^="/repo/"]').first()).toBeVisible();
});

test("Hero 搜索跳转到搜索页并出结果", async ({ page }) => {
  await page.goto("/");
  // 回车提交：填词会触发自动补全下拉，可能挡住「搜索」按钮，按 Enter 更稳
  await page.getByPlaceholder(/搜索项目/).fill("react");
  await page.getByPlaceholder(/搜索项目/).press("Enter");
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

test("详情页显示领域定位模块", async ({ page }) => {
  // 从领域页进，保证项目有 category → 必出「领域定位」
  await page.goto("/category/ai-ml");
  await page.locator('a[href^="/repo/"]').first().click();
  await expect(page).toHaveURL(/\/repo\//);
  await expect(page.getByRole("heading", { name: /领域定位/ })).toBeVisible();
});

test("公开收藏集：发布后公开页可访问", async ({ page, request }) => {
  // 经 /proxy-api 走后端：注册 → 收藏 → 发布 → 访问公开页
  const email = `e2e_${Date.now()}@test.com`;
  const reg = await request.post("/proxy-api/auth/register", {
    data: { email, password: "secret123" },
  });
  expect(reg.ok()).toBeTruthy();
  const token = (await reg.json()).access_token;
  const auth = { Authorization: `Bearer ${token}` };

  const top = await (await request.get("/proxy-api/rankings/top?limit=1")).json();
  const fullName = top[0].full_name;
  await request.post("/proxy-api/favorites", {
    headers: auth,
    data: { full_name: fullName, tags: ["e2e"], note: "测试备注" },
  });
  const share = await (
    await request.put("/proxy-api/me/share", {
      headers: auth,
      data: { listed: true, title: "E2E 精选清单" },
    })
  ).json();
  expect(share.slug).toBeTruthy();

  await page.goto(`/list/${share.slug}`);
  await expect(page.getByRole("heading", { name: /E2E 精选清单/ })).toBeVisible();
  await expect(page.locator(`a[href="/repo/${fullName}"]`).first()).toBeVisible();
});
