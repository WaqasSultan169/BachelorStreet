import { test, expect } from "@playwright/test";

test.describe("security and API behavior", () => {
  test("unauthenticated admin page redirects to login", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated account page redirects to login", async ({ page }) => {
    await page.goto("/account", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("invalid tracking id does not leak order data", async ({ request }) => {
    const response = await request.get("/api/orders/does-not-exist-tracking-id");
    expect([400,404]).toContain(response.status());
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(JSON.stringify(json)).not.toMatch(/customer|phone|address/i);
  });

  test("delivery coverage check rejects out-of-range point", async ({ request }) => {
    const response = await request.post("/api/delivery/check", {
      data: { coordinates: { lat: 0, lng: 0 } },
    });
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.data.deliverable).toBe(false);
  });

  test("delivery check rejects malformed JSON", async ({ request }) => {
    const response = await request.post("/api/delivery/check", {
      data: "not-json",
      headers: { "content-type": "application/json" },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("realtime ticket route requires authentication", async ({ request }) => {
    const response = await request.post("/api/realtime/order-ticket", {
      data: { orderId: "000000000000000000000000" },
    });
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test("unauthenticated hero admin page redirects to login", async ({ page }) => {
    await page.goto("/admin/hero", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
  });
});