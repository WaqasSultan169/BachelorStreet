import { test, expect } from "@playwright/test";

const viewports = [{ width: 375, height: 667 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }];

for (const vp of viewports) {
  test.describe(`auth viewport ${vp.width}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ["/login", "/register"]) {
      test(`${route} no overflow`, async ({ page }) => {
        await page.goto(route, { waitUntil: "networkidle" });
        const r = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          vw: window.innerWidth,
          google: !!Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("Continue with Google")),
        }));
        expect(r.sw).toBeLessThanOrEqual(r.vw + 1);
        expect(r.google).toBe(true);
      });
    }
  });
}