import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

test.describe("admin access and chrome", () => {
  for (const path of ["/admin/orders", "/admin/customers", "/admin/staff", "/admin/catalog"]) {
    test(`unauthenticated ${path} redirects to login`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("storefront keeps the customer header and footer", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    await expect(
      page.locator("header").getByRole("link", { name: "Menu", exact: true }),
    ).toBeVisible();
  });
});

test.describe("demo seed safety", () => {
  function runSeed(env: Record<string, string>): { status: number; stderr: string } {
    try {
      execFileSync(process.execPath, ["scripts/seed-demo.mjs"], {
        cwd: process.cwd(),
        env: { ...process.env, ...env },
        stdio: "pipe",
        timeout: 60_000,
      });
      return { status: 0, stderr: "" };
    } catch (error) {
      const failed = error as { status?: number; stderr?: Buffer };
      return { status: failed.status ?? 1, stderr: failed.stderr?.toString() ?? "" };
    }
  }

  test("refuses to run without DEMO_SEED_ENABLED", () => {
    const result = runSeed({
      NODE_ENV: "development",
      DEMO_SEED_ENABLED: "",
      DEMO_SEED_ALLOW_REMOTE: "",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("DEMO_SEED_ENABLED is not 'true'");
  });

  test("refuses to run against production", () => {
    const result = runSeed({
      NODE_ENV: "production",
      DEMO_SEED_ENABLED: "true",
      DEMO_SEED_ALLOW_REMOTE: "true",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("production");
  });
});
