import { expect, test } from "@playwright/test";

test("workspace navigation renders each section and uses native view transitions", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__viewTransitionCalls = 0;

    const startViewTransition = document.startViewTransition?.bind(document);

    if (startViewTransition) {
      document.startViewTransition = (...args) => {
        window.__viewTransitionCalls += 1;
        return startViewTransition(...args);
      };
    }
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "بخش‌های کاربری" });
  await expect(navigation.getByRole("button", { name: "تنظیمات اصلی" })).toBeVisible();

  await navigation.getByRole("button", { name: "پالایه و ماژول‌ها" }).click();
  await navigation.getByRole("button", { name: "افزودن قطعه جدید" }).click();
  await expect(page.getByRole("heading", { name: "پالایه و ماژول‌ها" })).toBeVisible();

  await navigation.getByRole("button", { name: "اتوماسیون‌ها" }).click();
  await navigation.getByRole("button", { name: "افزودن اتوماسیون جدید" }).click();
  await expect(page.getByRole("heading", { name: "اتوماسیون‌ها" })).toBeVisible();

  await navigation.getByRole("button", { name: "تنظیمات اصلی" }).click();
  await navigation.getByRole("button", { name: "چیدمان و عنوان" }).click();
  await expect(page.getByRole("heading", { name: "تنظیمات اصلی" })).toBeVisible();

  await navigation.getByRole("button", { name: "داشبورد خانه" }).click();
  await expect(page.getByRole("heading", { name: "نمای خانه و کنترل تجهیزات هوشمند" })).toBeAttached();

  const transitionCalls = await page.evaluate(() => window.__viewTransitionCalls);
  expect(transitionCalls).toBeGreaterThan(0);
});

test("workspace navigation remains usable with reduced motion enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "بخش‌های کاربری" });
  await expect(navigation.getByRole("button", { name: "تنظیمات اصلی" })).toBeVisible();

  await navigation.getByRole("button", { name: "تنظیمات اصلی" }).click();
  await navigation.getByRole("button", { name: "چیدمان و عنوان" }).click();
  await expect(page.getByRole("heading", { name: "تنظیمات اصلی" })).toBeVisible();

  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  );
});
