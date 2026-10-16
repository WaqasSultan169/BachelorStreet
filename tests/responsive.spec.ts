import { test, expect, type Page } from "@playwright/test";

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const publicPages = ["/", "/menu", "/contact", "/track", "/privacy", "/terms", "/about"];

async function overflowReport(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const vw = window.innerWidth;
    let bad: string | null = null;
    const all = Array.from(document.querySelectorAll("*"));
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : "";
        const cls = (el.className && typeof el.className === "string")
          ? "." + el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".")
          : "";
        bad = `${tag}${id}${cls}: left=${Math.round(r.left)} right=${Math.round(r.right)} scrollWidth=${root.scrollWidth}`;
        break;
      }
    }
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, vw, bad };
  });
}

for (const vp of viewports) {
  test.describe(`viewport ${vp.width}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of publicPages) {
      test(`${route} has no unintended horizontal overflow`, async ({ page }) => {
        await page.goto(route, { waitUntil: "networkidle" });
        const r = await overflowReport(page);
        expect(r.scrollWidth, JSON.stringify(r)).toBeLessThanOrEqual(r.vw + 1);
      });
    }

    if (vp.width <= 430) {
      test("mobile menu opens, closes, Escape and body scroll", async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });
        // First-time visitors are prompted to choose fulfillment; dismiss it for layout checks.
        const dialog = page.getByRole("dialog");
        if (await dialog.isVisible().catch(() => false)) {
          await page.keyboard.press("Escape");
        }
        const toggle = page.getByRole("button", { name: /open menu/i });
        await expect(toggle).toBeVisible();
        await toggle.click();
        await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
        const locked = await page.evaluate(() => document.body.style.overflow);
        expect(locked).toBe("hidden");
        await page.keyboard.press("Escape");
        await expect(page.getByRole("navigation", { name: "Mobile" })).not.toBeVisible();
        const unlocked = await page.evaluate(() => document.body.style.overflow);
        expect(unlocked).not.toBe("hidden");
      });
    }
  });
}

test("invalid route shows custom 404", async ({ page }) => {
  await page.goto("/this-page-does-not-exist-12345", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Oops! This page isn't on the menu\./i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Back to Home/i })).toBeVisible();
});

test("logo navigates home", async ({ page }) => {
  await page.goto("/menu", { waitUntil: "networkidle" });
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) await page.keyboard.press("Escape");
  await page.getByRole("link", { name: /Bachelor's Street.*home/i }).first().click();
  await expect(page).toHaveURL("/");
});

test("page title and metadata", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page).toHaveTitle("Bachelor's Street | Fast Food & Online Ordering");
});