import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

/**
 * Hero-slider tests.
 *
 * The homepage suite is seeded with the guarded, non-destructive demo seeder so
 * the carousel has deterministic content. It skips itself when the demo data
 * cannot be written (for example on a machine with no dev database).
 *
 * The upload suite creates a temporary admin account, exercises the real
 * authenticated endpoint, then deletes the account again.
 */

const NODE = process.execPath;

// Admin routes compile lazily in dev; give the first visit room beyond the
// default per-test budget.
test.describe.configure({ timeout: 120_000 });

function runScript(script: string, args: string[], env: Record<string, string> = {}) {
  return execFileSync(NODE, ["--env-file-if-exists=.env.local", script, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: "pipe",
    timeout: 120_000,
  }).toString();
}

const INACTIVE_DEMO_TITLE = "Coming Soon (demo, inactive)";
const FIRST_ACTIVE_TITLE = "Signature Burgers";
const SECOND_ACTIVE_TITLE = "Pizza & Sharing";

// A minimal 1×1 PNG, used where a real image payload matters.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Open the storefront and return the carousel region. The remote dev database
 * can be briefly slow, which renders the fallback hero instead; reload a couple
 * of times so a transient hiccup does not hide a real regression.
 */
async function openHomepage(page: Page) {
  const region = page.getByRole("region", { name: "Featured offers" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    if ((await region.count()) > 0) break;
  }
  return region;
}

/**
 * The first-visit fulfilment modal would otherwise intercept clicks on every
 * page. Seed a completed pickup preference into the persisted store before the
 * app boots.
 */
async function seedFulfillment(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "bsc-location",
        JSON.stringify({
          fulfillmentType: "pickup",
          selectedBranch: { id: "test-branch", name: "Bachelor's Street H-13" },
          deliveryAddress: null,
          coordinates: null,
        }),
      );
    } catch {
      // Storage unavailable; the modal will simply appear.
    }
  });
}

test.describe("homepage hero carousel", () => {
  test.beforeEach(async ({ page }) => {
    await seedFulfillment(page);
  });

  test.beforeAll(() => {
    try {
      runScript("scripts/seed-demo.mjs", [], {
        NODE_ENV: process.env.NODE_ENV ?? "development",
        DEMO_SEED_ENABLED: "true",
        DEMO_SEED_ALLOW_REMOTE: "true",
      });
    } catch {
      // Assertions below skip themselves when no demo slides are available.
    }
  });

  test("shows active slides on the storefront and hides inactive slides", async ({ page }) => {
    const region = await openHomepage(page);
    test.skip((await region.count()) === 0, "No active hero slides available in this database");

    await expect(region).toBeVisible();
    // Reset to the first slide so the assertion does not race the autoplay.
    await region.getByRole("button", { name: /^Show slide 1:/ }).click();
    await expect(region.getByRole("heading", { level: 1 })).toHaveText(FIRST_ACTIVE_TITLE);

    // The banner is served from the app origin and never contains baked-in
    // text. Read it from the active layer: neighbouring slides stay mounted for
    // the crossfade, so the first <img> on the page is not always the visible one.
    const banner = region.locator('[data-active="true"] img').first();
    await expect(banner).toHaveAttribute("src", /signature-burgers\.jpg/);

    // Real CTA pointing at a real route.
    const cta = region.getByRole("link", { name: "Order now" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/menu");

    // The inactive demo slide is never rendered, anywhere on the page.
    await expect(page.getByText(INACTIVE_DEMO_TITLE)).toHaveCount(0);
  });

  test("supports next/previous controls and slide indicators", async ({ page }) => {
    const region = await openHomepage(page);
    test.skip((await region.count()) === 0, "No active hero slides available in this database");

    const heading = region.getByRole("heading", { level: 1 });
    // Reset to the first slide so the assertions do not race the autoplay.
    await region.getByRole("button", { name: /^Show slide 1:/ }).click();
    await expect(heading).toHaveText(FIRST_ACTIVE_TITLE);

    await region.getByRole("button", { name: "Next slide" }).click();
    await expect(heading).toHaveText(SECOND_ACTIVE_TITLE);

    await region.getByRole("button", { name: "Previous slide" }).click();
    await expect(heading).toHaveText(FIRST_ACTIVE_TITLE);

    // One indicator per active slide.
    const indicators = region.getByRole("button", { name: /^Show slide / });
    expect(await indicators.count()).toBeGreaterThanOrEqual(2);

    await indicators.nth(1).click();
    await expect(heading).toHaveText(SECOND_ACTIVE_TITLE);
  });

  test("is responsive and never overflows horizontally on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const region = await openHomepage(page);
    test.skip((await region.count()) === 0, "No active hero slides available in this database");

    await expect(region).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("advances automatically and pauses while the pointer rests on it", async ({ page }) => {
    const region = await openHomepage(page);
    test.skip((await region.count()) === 0, "No active hero slides available in this database");
    await expect(region).toBeVisible();
    await expect(region).toHaveAttribute("data-rotating", "true");

    // Autoplay moves the carousel without any interaction.
    const start = (await region.getAttribute("data-slide-index")) ?? "";
    await expect
      .poll(() => region.getAttribute("data-slide-index"), { timeout: 15_000, intervals: [500] })
      .not.toBe(start);

    // Hovering pauses rotation and it stays put past a full rotation window.
    await region.hover();
    await expect(region).toHaveAttribute("data-paused", "true");
    const pausedAt = (await region.getAttribute("data-slide-index")) ?? "";
    await page.waitForTimeout(6500);
    await expect(region).toHaveAttribute("data-slide-index", pausedAt);

    // Leaving resumes rotation with a fresh countdown.
    await page.mouse.move(2, 2);
    await expect(region).toHaveAttribute("data-paused", "false");
    await expect
      .poll(() => region.getAttribute("data-slide-index"), { timeout: 15_000, intervals: [500] })
      .not.toBe(pausedAt);
  });

  test("wraps around in both directions", async ({ page }) => {
    const region = await openHomepage(page);
    test.skip((await region.count()) === 0, "No active hero slides available in this database");

    const count = Number(await region.getAttribute("data-slide-count"));
    await region.getByRole("button", { name: /^Show slide 1:/ }).click();
    await expect(region).toHaveAttribute("data-slide-index", "0");

    // Backwards from the first slide lands on the last one.
    await region.getByRole("button", { name: "Previous slide" }).click();
    await expect(region).toHaveAttribute("data-slide-index", String(count - 1));
    await expect(region.getByRole("heading", { level: 1 })).not.toBeEmpty();

    // Forwards from the last slide returns to the first.
    await region.getByRole("button", { name: "Next slide" }).click();
    await expect(region).toHaveAttribute("data-slide-index", "0");
    await expect(region.getByRole("heading", { level: 1 })).toHaveText(FIRST_ACTIVE_TITLE);
  });

  test("supports arrow-key navigation while the carousel is focused", async ({ page }) => {
    const region = await openHomepage(page);
    test.skip((await region.count()) === 0, "No active hero slides available in this database");

    await region.getByRole("button", { name: /^Show slide 1:/ }).click();
    await expect(region).toHaveAttribute("data-slide-index", "0");

    await region.focus();
    await page.keyboard.press("ArrowRight");
    await expect(region).toHaveAttribute("data-slide-index", "1");
    await page.keyboard.press("ArrowLeft");
    await expect(region).toHaveAttribute("data-slide-index", "0");
  });

  test("restarts the autoplay countdown after manual navigation", async ({ page }) => {
    const region = await openHomepage(page);
    test.skip((await region.count()) === 0, "No active hero slides available in this database");

    const count = Number(await region.getAttribute("data-slide-count"));
    const before = Number(await region.getAttribute("data-slide-index"));
    const expected = String((before + 1) % count);

    await region.getByRole("button", { name: "Next slide" }).click();
    await expect(region).toHaveAttribute("data-slide-index", expected);

    // Move the pointer off the carousel so hovering is not what holds it.
    await page.mouse.move(2, 2);
    await expect(region).toHaveAttribute("data-paused", "false");

    // A freshly restarted five-second countdown has not fired yet...
    await page.waitForTimeout(3000);
    await expect(region).toHaveAttribute("data-slide-index", expected);

    // ...and rotation is still running afterwards.
    await expect
      .poll(() => region.getAttribute("data-slide-index"), { timeout: 12_000, intervals: [500] })
      .not.toBe(expected);
  });
});

test.describe("homepage hero carousel with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await seedFulfillment(page);
  });

  test("paints the copy immediately and keeps navigation usable", async ({ page }) => {
    const region = await openHomepage(page);
    test.skip((await region.count()) === 0, "No active hero slides available in this database");
    await expect(region).toBeVisible();

    const heading = region.getByRole("heading", { level: 1 });
    // Reset to the first slide so the assertion does not race the autoplay.
    await region.getByRole("button", { name: /^Show slide 1:/ }).click();
    await expect(heading).toHaveText(FIRST_ACTIVE_TITLE);

    // No entrance offset and no fade: the text is simply there.
    const textStyle = await heading.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return { opacity: style.opacity, transform: style.transform };
    });
    expect(Number(textStyle.opacity)).toBe(1);
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(textStyle.transform);

    // The slow zoom on the photograph is switched off too.
    const imageScale = await region
      .locator('[data-active="true"] img')
      .first()
      .evaluate((element) => window.getComputedStyle(element).scale);
    expect(imageScale).toBe("1");

    // Slide navigation still works.
    await region.getByRole("button", { name: /^Show slide 2:/ }).click();
    await expect(region).toHaveAttribute("data-slide-index", "1");
    await expect(heading).toHaveText(SECOND_ACTIVE_TITLE);
  });
});

test.describe("hero upload API", () => {
  test("rejects unauthenticated uploads before reading the file", async ({ request }) => {
    const response = await request.post("/api/admin/hero/upload", {
      multipart: { file: { name: "banner.png", mimeType: "image/png", buffer: PNG_1X1 } },
    });
    expect([401, 403]).toContain(response.status());
    const json = await response.json();
    expect(json.success).toBe(false);
  });
});

test.describe("authenticated hero admin", () => {
  let admin: { id: string; email: string; password: string } | null = null;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          "bsc-location",
          JSON.stringify({
            fulfillmentType: "pickup",
            selectedBranch: { id: "test-branch", name: "Bachelor's Street H-13" },
            deliveryAddress: null,
            coordinates: null,
          }),
        );
      } catch {
        // Storage unavailable; the modal will simply appear.
      }
    });
  });

  test.beforeAll(() => {
    try {
      admin = JSON.parse(runScript("tests/helpers/test-admin.mjs", ["create"])) as {
        id: string;
        email: string;
        password: string;
      };
    } catch {
      admin = null;
    }
  });

  test.afterAll(() => {
    if (!admin) return;
    try {
      runScript("tests/helpers/test-admin.mjs", ["delete", admin.id]);
    } catch {
      // Best-effort cleanup; the account is marked isDemo and harmless.
    }
  });

  async function signIn(page: Page) {
    const account = admin;
    if (!account) throw new Error("test admin unavailable");

    // The sign-in form is a client component, so a click that lands before
    // hydration performs a native GET back to /login instead of signing in.
    // A cold `/login` compile in the dev server is enough to lose that race, so
    // retry the whole submission once before failing the test.
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.getByLabel("Email").fill(account.email);
      await page.getByLabel("Password").fill(account.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      try {
        await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
        return;
      } catch (error) {
        if (attempt === 2) throw error;
      }
    }
  }

  test("admin hero page lists slides with status, source and demo marker", async ({ page }) => {
    test.skip(admin === null, "temporary admin account could not be created");
    await signIn(page);
    await page.goto("/admin/hero", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Hero slider" })).toBeVisible({ timeout: 30_000 });

    const active = page.getByRole("article").filter({ hasText: FIRST_ACTIVE_TITLE });
    await expect(active).toBeVisible();
    await expect(active).toContainText("Active");
    await expect(active).toContainText("External URL");
    await expect(active).toContainText("Demo");

    const inactive = page.getByRole("article").filter({ hasText: INACTIVE_DEMO_TITLE });
    await expect(inactive).toBeVisible();
    await expect(inactive).toContainText("Inactive");
  });

  test("validates uploads server-side (type and size, never trusting the browser)", async ({ page }) => {
    test.skip(admin === null, "temporary admin account could not be created");
    await signIn(page);

    // 1. A text file pretending to be an image is rejected by magic-byte sniffing.
    const spoofed = await page.request.post("/api/admin/hero/upload", {
      multipart: { file: { name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an image") } },
    });
    expect(spoofed.status()).toBe(400);
    const spoofedJson = await spoofed.json();
    expect(spoofedJson.success).toBe(false);
    expect(JSON.stringify(spoofedJson)).toMatch(/JPG|PNG|WebP|AVIF/i);

    // 2. An unsupported type is rejected.
    const wrongType = await page.request.post("/api/admin/hero/upload", {
      multipart: { file: { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") } },
    });
    expect(wrongType.status()).toBe(400);

    // 3. Oversized images are rejected before they are stored.
    const oversized = Buffer.alloc(6 * 1024 * 1024 + 2048);
    PNG_1X1.copy(oversized, 0);
    const tooBig = await page.request.post("/api/admin/hero/upload", {
      multipart: { file: { name: "big.png", mimeType: "image/png", buffer: oversized } },
    });
    expect([400, 413]).toContain(tooBig.status());
    const tooBigJson = await tooBig.json();
    expect(tooBigJson.success).toBe(false);
    expect(JSON.stringify(tooBigJson)).toMatch(/6 MB|smaller/i);

    // 4. A missing file is a clean 400, not a crash.
    const missing = await page.request.post("/api/admin/hero/upload", {
      multipart: { note: "no file here" },
    });
    expect(missing.status()).toBe(400);
  });

  test("creates and deletes a URL-based slide through the admin UI", async ({ page }) => {
    test.skip(admin === null, "temporary admin account could not be created");
    const title = `Hero test slide ${randomUUID().slice(0, 8)}`;

    await signIn(page);
    await page.goto("/admin/hero", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Title", { exact: true }).fill(title);
    await page
      .getByRole("tablist", { name: "Desktop image source" })
      .getByRole("tab", { name: "Image URL" })
      .click();
    await page
      .getByRole("textbox", { name: "Desktop image", exact: true })
      .fill("/images/hero/signature-burgers.jpg");
    await page.getByLabel("CTA label").fill("Order now");
    await page.getByLabel("CTA destination").fill("/menu");
    // Keep the temporary slide off the storefront while it exists.
    await page.getByLabel("Active on the homepage").uncheck();
    await page.getByRole("button", { name: "Create slide" }).click();

    const created = page.getByRole("article").filter({ hasText: title });
    await expect(created).toBeVisible({ timeout: 20_000 });
    await expect(created).toContainText("Inactive");

    page.on("dialog", (dialog) => void dialog.accept());
    await created.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("article").filter({ hasText: title })).toHaveCount(0, {
      timeout: 20_000,
    });
  });
});
