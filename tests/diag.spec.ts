import { test, expect } from "@playwright/test";
test("console/network", async ({ page }) => {
  const consoleErrors: string[] = [];
  const failed: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("requestfailed", (r) => failed.push(r.url()));
  await page.goto("/", { waitUntil: "networkidle" });
  await page.goto("/menu", { waitUntil: "networkidle" });
  console.log("CONSOLE_ERRORS=" + consoleErrors.length);
  consoleErrors.forEach((e) => console.log("ERR: " + e));
  console.log("FAILED_REQUESTS=" + failed.length);
  failed.forEach((u) => console.log("FAIL: " + u));
  await expect(consoleErrors, "console errors present").toEqual([]);
  await expect(failed, "failed requests present").toEqual([]);
});