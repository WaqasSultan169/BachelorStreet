/**
 * Bachelor's Street — development demo-data seeder (NON-DESTRUCTIVE)
 * ---------------------------------------------------------------------------
 * Creates a small, clearly-labelled SAMPLE dataset so the admin dashboard has
 * realistic analytics to display: demo customers, demo delivery riders and
 * demo orders (with status history, payment state and delivery assignments),
 * plus demo homepage hero slides that point at the bundled banner assets in
 * `public/images/hero`.
 *
 * This is deliberately SEPARATE from `scripts/seed.mjs` (the catalog seeder).
 * It NEVER deletes anything and NEVER overwrites an existing record.
 *
 * Usage
 * ---------------------------------------------------------------------------
 *   PowerShell:
 *     $env:DEMO_SEED_ENABLED="true"; npm run seed:demo
 *
 *   Bash:
 *     DEMO_SEED_ENABLED=true npm run seed:demo
 *
 *   Preview only (no writes):
 *     $env:DEMO_SEED_ENABLED="true"; npm run seed:demo -- --dry-run
 *
 * Safety guards (all must pass)
 * ---------------------------------------------------------------------------
 *   1. NODE_ENV must not be "production" (hard refusal, no override).
 *   2. DEMO_SEED_ENABLED must be exactly "true".
 *   3. A non-local Mongo host additionally requires DEMO_SEED_ALLOW_REMOTE=true
 *      so an operator explicitly acknowledges a remote database.
 *   4. Host names containing "prod" are refused outright.
 *
 * Idempotency & data isolation
 * ---------------------------------------------------------------------------
 *   - Every demo user has `isDemo: true` and a `.test` email address
 *     (RFC 2606 reserved — never routable, so no mail can be delivered).
 *   - Every demo order has `isDemo: true` and a deterministic
 *     `idempotencyKey` (`demo:order:NNN`). Records are upserted with
 *     `$setOnInsert`, so re-running inserts nothing and changes nothing.
 *   - Phone numbers are obvious placeholders (`0300-0000001` style), not real.
 *   - Payment `status: "paid"` is only used for delivered cash-on-delivery
 *     orders (cash collected by the rider). No payment provider is contacted
 *     and no fake provider/transaction ids are written.
 *   - Demo hero slides carry `isDemo: true` and are matched by their
 *     deterministic title, so re-running never duplicates them and never
 *     overwrites an administrator's edits.
 *
 * All demo prices are in PKR and derived from the real seeded catalog.
 */
import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const DEMO_ENABLED = process.env.DEMO_SEED_ENABLED === "true";
const ALLOW_REMOTE = process.env.DEMO_SEED_ALLOW_REMOTE === "true";

// Values mirrored from src/lib/constants.ts. Kept inline so this plain-node
// script does not need a TypeScript build step.
const ORDER_STATUS_LABELS = {
  pending: "Order received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const PAYMENT_METHOD = "cash_on_delivery";
// Mirrors APP.primaryBranch in src/lib/constants.ts (verified H-13 branch).
const BRANCH = {
  name: "Bachelor Street — H-13",
  address: "H-13, Islamabad",
};
const DEMO_EMAIL_DOMAIN = "bachelor-street.test";
const DEMO_PHONE_PREFIX = "0300-00000"; // obvious placeholder range

// --- Deterministic pseudo-randomness ----------------------------------------
// mulberry32 keeps the generated dataset identical across runs (idempotency
// depends on stable values, not just stable keys).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0xba5eba11);

function pick(list) {
  return list[Math.floor(rand() * list.length)];
}
function intBetween(min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}
function stableId(input) {
  return createHash("sha256").update(`bachelor-street:${input}`).digest("hex");
}
function trackingIdFor(key) {
  return `demo${stableId(key).slice(0, 20)}`;
}
function eventIdFor(key) {
  return `demo-${stableId(`event:${key}`).slice(0, 24)}`;
}

// --- Static demo fixtures ---------------------------------------------------
const DEMO_CUSTOMERS = [
  "Ahmed Raza",
  "Bilal Hussain",
  "Sana Khalid",
  "Usman Tariq",
  "Hira Naveed",
  "Zainab Iqbal",
  "Danish Mehmood",
  "Ayesha Siddiqui",
  "Hamza Sheikh",
  "Fatima Noor",
  "Kamran Aslam",
  "Maryam Javed",
  "Saad Rehman",
  "Nimra Farooq",
  "Owais Malik",
  "Rabia Shah",
].map((name, index) => {
  const n = String(index + 1).padStart(2, "0");
  return {
    name,
    email: `demo.customer${n}@${DEMO_EMAIL_DOMAIN}`,
    phone: `${DEMO_PHONE_PREFIX}${n}`,
  };
});

const DEMO_RIDERS = [
  "Imran Yousaf",
  "Naveed Akhtar",
  "Shahid Abbasi",
  "Farhan Qureshi",
].map((name, index) => {
  const n = String(index + 1).padStart(2, "0");
  return {
    name,
    email: `demo.rider${n}@${DEMO_EMAIL_DOMAIN}`,
    phone: `0301-00000${n}`,
  };
});

// Areas are the real demo zones defined in src/server/services/geo.service.ts.
// No coordinates are invented or stored.
const AREAS = [
  { name: "H-13 Markaz", area: "H-13" },
  { name: "G-11 Markaz", area: "G-11" },
  { name: "F-7 Markaz", area: "F-7" },
  { name: "F-8 Markaz", area: "F-8" },
  { name: "G-9 Markaz", area: "G-9" },
  { name: "G-10 Markaz", area: "G-10" },
  { name: "Blue Area", area: "Blue Area" },
  { name: "DHA Phase 2", area: "DHA Phase 2" },
];

const CUSTOMER_NOTES = [
  undefined,
  undefined,
  undefined,
  "Please add extra ketchup.",
  "Ring the bell on arrival.",
  "No onions, please.",
  "Make it extra spicy.",
];

/**
 * Explicit, reviewable order plan. `assigned` only applies to delivery orders.
 * Statuses and fulfillment types are constrained to what the schema allows:
 * `ready_for_pickup` => pickup, `out_for_delivery` => delivery.
 */
const ORDER_PLAN = [
  { status: "delivered", type: "delivery", daysAgo: 0, assigned: true },
  { status: "delivered", type: "delivery", daysAgo: 1, assigned: true },
  { status: "delivered", type: "delivery", daysAgo: 2, assigned: true },
  { status: "delivered", type: "pickup", daysAgo: 3, assigned: false },
  { status: "delivered", type: "delivery", daysAgo: 4, assigned: true },
  { status: "delivered", type: "delivery", daysAgo: 6, assigned: true },
  { status: "delivered", type: "delivery", daysAgo: 9, assigned: true },
  { status: "delivered", type: "delivery", daysAgo: 14, assigned: true },
  { status: "out_for_delivery", type: "delivery", daysAgo: 0, assigned: true },
  { status: "out_for_delivery", type: "delivery", daysAgo: 1, assigned: true },
  { status: "out_for_delivery", type: "delivery", daysAgo: 0, assigned: true },
  { status: "out_for_delivery", type: "delivery", daysAgo: 2, assigned: true },
  { status: "preparing", type: "delivery", daysAgo: 0, assigned: true },
  { status: "preparing", type: "pickup", daysAgo: 0, assigned: false },
  { status: "preparing", type: "delivery", daysAgo: 1, assigned: false },
  { status: "preparing", type: "pickup", daysAgo: 1, assigned: false },
  { status: "confirmed", type: "delivery", daysAgo: 0, assigned: false },
  { status: "confirmed", type: "delivery", daysAgo: 1, assigned: true },
  { status: "confirmed", type: "pickup", daysAgo: 0, assigned: false },
  { status: "pending", type: "delivery", daysAgo: 0, assigned: false },
  { status: "pending", type: "pickup", daysAgo: 0, assigned: false },
  { status: "pending", type: "delivery", daysAgo: 1, assigned: false },
  { status: "ready_for_pickup", type: "pickup", daysAgo: 0, assigned: false },
  { status: "ready_for_pickup", type: "pickup", daysAgo: 1, assigned: false },
  { status: "cancelled", type: "delivery", daysAgo: 5, assigned: false },
  { status: "cancelled", type: "pickup", daysAgo: 12, assigned: false },
];

/**
 * Demo homepage hero slides. `file` is resolved under `public/images/hero`.
 * Titles are stable because they are the idempotency key for upserts.
 * The last entry is intentionally inactive so the storefront can prove that
 * inactive slides are never shown.
 */
const DEMO_HERO_SLIDES = [
  {
    title: "Signature Burgers",
    subtitle: "Flame-grilled patties, melted cheese and golden fries — made fresh in H-13, Islamabad.",
    file: "signature-burgers.jpg",
    ctaLabel: "Order now",
    ctaUrl: "/menu",
    sortOrder: 10,
    isActive: true,
  },
  {
    title: "Pizza & Sharing",
    subtitle: "Freshly baked, generously topped and made for sharing with the people around you.",
    file: "pizza-sharing.jpg",
    ctaLabel: "Explore pizzas",
    ctaUrl: "/menu",
    sortOrder: 20,
    isActive: true,
  },
  {
    title: "Fresh & Delicious",
    subtitle: "Crisp, colourful bowls and fresh ingredients for a lighter Bachelor's Street meal.",
    file: "fresh-delicious.jpg",
    ctaLabel: "See the menu",
    ctaUrl: "/menu",
    sortOrder: 30,
    isActive: true,
  },
  {
    title: "Special Offers",
    subtitle: "Bundle your favourites and make every order go further.",
    file: "special-offers.jpg",
    ctaLabel: "View the menu",
    ctaUrl: "/menu",
    sortOrder: 40,
    isActive: true,
  },
  {
    title: "Customer Favorites",
    subtitle: "The dishes our regulars keep coming back for.",
    file: "customer-favorites.jpg",
    ctaLabel: "Order favourites",
    ctaUrl: "/menu",
    sortOrder: 50,
    isActive: true,
  },
  {
    title: "Coming Soon (demo, inactive)",
    subtitle: "This demo slide stays inactive on purpose and must never appear on the storefront.",
    file: "special-offers.jpg",
    ctaLabel: "Preview",
    ctaUrl: "/menu",
    sortOrder: 999,
    isActive: false,
  },
];

const HERO_ASSET_DIR = join(ROOT, "public", "images", "hero");

const MINUTE = 60 * 1000;

/** Build a valid, monotonic status history ending at `status`. */
function buildStatusHistory(plan, placedAt) {
  const at = (minutes) => new Date(placedAt.getTime() + minutes * MINUTE);
  const steps = [{ status: "pending", changedAt: placedAt, note: "Order placed by customer." }];

  const push = (status, minutes, note) =>
    steps.push({ status, changedAt: at(minutes), note });

  if (plan.status === "pending") return steps;

  if (plan.status === "cancelled") {
    if (rand() < 0.5) {
      push("cancelled", 8, "Cancelled before confirmation.");
      return steps;
    }
    push("confirmed", 6, "Order confirmed by branch.");
    push("cancelled", 18, "Cancelled by customer.");
    return steps;
  }

  push("confirmed", 6, "Order confirmed by branch.");
  if (plan.status === "confirmed") return steps;

  push("preparing", 20, "Kitchen started preparing the order.");
  if (plan.status === "preparing") return steps;

  if (plan.status === "ready_for_pickup") {
    push("ready_for_pickup", 40, "Ready for customer pickup.");
    return steps;
  }

  push("out_for_delivery", 45, "Handed to the delivery rider.");
  if (plan.status === "out_for_delivery") return steps;

  push("delivered", plan.type === "delivery" ? 75 : 55, "Order delivered. Enjoy!");
  return steps;
}

/** Time (relative to placedAt) at which a rider was assigned, if any. */
function assignedAtFor(plan, placedAt) {
  const minutes = plan.status === "confirmed" ? 10 : plan.status === "preparing" ? 20 : 30;
  return new Date(placedAt.getTime() + minutes * MINUTE);
}

// --- Mongoose models (inline, timestamps managed manually) -------------------
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    normalizedEmail: { type: String, required: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["customer", "admin", "delivery_boy"], default: "customer" },
    addresses: { type: Array, default: [] },
    isActive: { type: Boolean, default: true },
    emailNotificationConsent: { type: Boolean, default: false },
    phoneNotificationConsent: { type: Boolean, default: false },
    phoneNotificationConsentAt: { type: Date },
    isDemo: { type: Boolean, default: false },
    emailVerified: { type: Date, default: null },
    oauthProviders: { type: [String], default: [] },
    tokenVersion: { type: Number, default: 0 },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { timestamps: false, autoIndex: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, trim: true },
    trackingId: { type: String, required: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    contact: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
    },
    items: { type: Array, default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR" },
    delivery: { type: Object, required: true },
    payment: { type: Object, required: true },
    status: { type: String, enum: Object.keys(ORDER_STATUS_LABELS), required: true },
    statusHistory: { type: Array, default: [] },
    fulfillmentHistory: { type: Array, default: [] },
    version: { type: Number, default: 1, min: 1 },
    idempotencyKey: { type: String },
    requestHash: { type: String },
    customerNote: { type: String },
    placedAt: { type: Date, default: Date.now },
    isDemo: { type: Boolean, default: false },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { timestamps: false, autoIndex: false, strict: true },
);

const User = mongoose.models.DemoSeedUser || mongoose.model("DemoSeedUser", userSchema, "users");
const Order = mongoose.models.DemoSeedOrder || mongoose.model("DemoSeedOrder", orderSchema, "orders");
const Product =
  mongoose.models.DemoSeedProduct ||
  mongoose.model(
    "DemoSeedProduct",
    new mongoose.Schema({}, { strict: false, autoIndex: false }),
    "products",
  );

const heroSlideSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: String,
    desktopImage: { type: String, required: true },
    mobileImage: String,
    imageSource: { type: String, enum: ["upload", "url"] },
    mobileImageSource: { type: String, enum: ["upload", "url"] },
    ctaLabel: String,
    ctaUrl: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: Date,
    endsAt: Date,
    isDemo: { type: Boolean, default: false },
    createdAt: Date,
    updatedAt: Date,
  },
  { timestamps: false, autoIndex: false },
);
const HeroSlide =
  mongoose.models.DemoSeedHeroSlide ||
  mongoose.model("DemoSeedHeroSlide", heroSlideSchema, "heroslides");

// --- Environment loading ----------------------------------------------------
function loadEnvFile() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseHosts(uri) {
  const afterScheme = uri.split("://", 2)[1] ?? "";
  const authority = afterScheme.split("/", 1)[0];
  const hostPart = authority.includes("@") ? authority.split("@").pop() : authority;
  return hostPart
    .split(",")
    .map((entry) => entry.trim().split(":").slice(0, -1).join(":") || entry.trim())
    .filter(Boolean);
}

function refuse(message) {
  console.error(`\n✖ Demo seed refused: ${message}\n`);
  process.exit(1);
}

async function main() {
  loadEnvFile();
  const uri = process.env.MONGODB_URI;
  if (!uri) refuse("MONGODB_URI is not configured (.env.local or environment).");

  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    refuse("NODE_ENV/VERCEL_ENV is 'production'. Demo data is never written to production.");
  }
  if (!DEMO_ENABLED) {
    refuse(
      "DEMO_SEED_ENABLED is not 'true'.\n" +
        "  Run with:  $env:DEMO_SEED_ENABLED=\"true\"; npm run seed:demo",
    );
  }

  const hosts = parseHosts(uri);
  if (hosts.some((host) => /prod/i.test(host))) {
    refuse(`the database host looks like production (${hosts.join(", ")}).`);
  }
  const isLocal = hosts.every(
    (host) =>
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".localhost"),
  );
  if (!isLocal && !ALLOW_REMOTE) {
    refuse(
      `the database host is remote (${hosts.join(", ")}).\n` +
        "  Acknowledge the remote target explicitly with DEMO_SEED_ALLOW_REMOTE=true.",
    );
  }

  await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 15000 });
  const dbName = mongoose.connection.db?.databaseName ?? "(unknown)";
  console.log(`\nBachelor's Street — demo data seeder`);
  console.log(`  target : ${hosts.join(", ")} / ${dbName}`);
  console.log(`  mode   : ${DRY_RUN ? "DRY RUN (no writes)" : "apply"}\n`);

  // --- Upsert demo hero slides ----------------------------------------------
  // Seeded before the catalog check so the storefront carousel can be
  // demonstrated even when no products exist yet. Matched by `isDemo` + title,
  // so re-runs never duplicate a slide and never overwrite admin edits. A slide
  // whose banner asset is missing on disk is skipped rather than stored broken.
  const heroNow = new Date();
  let heroInserted = 0;
  let heroExisting = 0;
  const heroSkipped = [];

  for (const slide of DEMO_HERO_SLIDES) {
    if (!existsSync(join(HERO_ASSET_DIR, slide.file))) {
      heroSkipped.push(`${slide.title} (${slide.file})`);
      continue;
    }
    if (DRY_RUN) {
      heroInserted += 1;
      continue;
    }
    const result = await HeroSlide.updateOne(
      { isDemo: true, title: slide.title },
      {
        $setOnInsert: {
          title: slide.title,
          subtitle: slide.subtitle,
          desktopImage: `/images/hero/${slide.file}`,
          imageSource: "url",
          ctaLabel: slide.ctaLabel,
          ctaUrl: slide.ctaUrl,
          sortOrder: slide.sortOrder,
          isActive: slide.isActive,
          isDemo: true,
          createdAt: heroNow,
          updatedAt: heroNow,
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount === 1) heroInserted += 1;
    else heroExisting += 1;
  }

  if (heroSkipped.length > 0) {
    console.warn(
      `  note: skipped ${heroSkipped.length} demo slide(s) with a missing banner asset:\n` +
        heroSkipped.map((entry) => `        - ${entry}`).join("\n") +
        "\n",
    );
  }

  // --- Discover real (non-demo) prerequisites -------------------------------
  const products = await Product.find({ isActive: true, isAvailable: true })
    .select("name slug price images")
    .sort({ popularity: -1 })
    .limit(60)
    .lean();

  if (products.length < 4) {
    await mongoose.disconnect();
    refuse(
      `only ${products.length} active/available products found. ` +
        "Run `npm run seed` first so demo orders can reference real menu items.",
    );
  }

  const admin = await User.findOne({ role: "admin" }).select("_id name").lean();
  if (!admin) {
    console.warn(
      "  note: no admin account found — delivery assignment history will omit the actor.\n",
    );
  }

  const now = new Date();
  const mkCreatedAt = (daysAgo) => {
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * MINUTE);
    date.setUTCHours(intBetween(11, 21), intBetween(0, 59), intBetween(0, 59), 0);
    return date;
  };

  // --- Upsert demo customers ------------------------------------------------
  const customers = [];
  for (const customer of DEMO_CUSTOMERS) {
    const normalizedEmail = customer.email.toLowerCase();
    const createdAt = mkCreatedAt(intBetween(20, 120));
    const doc = {
      email: customer.email,
      normalizedEmail,
      name: customer.name,
      phone: customer.phone,
      role: "customer",
      addresses: [],
      isActive: true,
      isDemo: true,
      emailVerified: createdAt,
      oauthProviders: [],
      tokenVersion: 0,
      emailNotificationConsent: false,
      phoneNotificationConsent: false,
      createdAt,
      updatedAt: createdAt,
    };
    if (DRY_RUN) {
      customers.push({ _id: new mongoose.Types.ObjectId(), ...doc });
      continue;
    }
    const record = await User.findOneAndUpdate(
      { normalizedEmail, isDemo: true },
      { $setOnInsert: doc },
      { upsert: true, returnDocument: "after", projection: { email: 1, name: 1, phone: 1 } },
    ).lean();
    customers.push(record);
  }

  // --- Upsert demo delivery riders -----------------------------------------
  const riders = [];
  for (const rider of DEMO_RIDERS) {
    const normalizedEmail = rider.email.toLowerCase();
    const createdAt = mkCreatedAt(intBetween(20, 120));
    const doc = {
      email: rider.email,
      normalizedEmail,
      name: rider.name,
      phone: rider.phone,
      role: "delivery_boy",
      addresses: [],
      isActive: true,
      isDemo: true,
      emailVerified: createdAt,
      oauthProviders: [],
      tokenVersion: 0,
      emailNotificationConsent: false,
      phoneNotificationConsent: true,
      phoneNotificationConsentAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    };
    if (DRY_RUN) {
      riders.push({ _id: new mongoose.Types.ObjectId(), ...doc });
      continue;
    }
    const record = await User.findOneAndUpdate(
      { normalizedEmail, isDemo: true },
      { $setOnInsert: doc },
      { upsert: true, returnDocument: "after", projection: { email: 1, name: 1, phone: 1 } },
    ).lean();
    riders.push(record);
  }

  // --- Build demo orders ----------------------------------------------------
  const orders = [];
  ORDER_PLAN.forEach((plan, index) => {
    const seq = String(index + 1).padStart(3, "0");
    const idempotencyKey = `demo:order:${seq}`;
    const customer = customers[index % customers.length];
    const placedAt = mkCreatedAt(plan.daysAgo);
    const statusHistory = buildStatusHistory(plan, placedAt).map((entry) => ({
      eventId: eventIdFor(`${idempotencyKey}:${entry.status}`),
      status: entry.status,
      changedAt: entry.changedAt,
      note: entry.note,
    }));
    const lastChange = statusHistory[statusHistory.length - 1].changedAt;

    // 1–4 distinct menu items, quantity 1–3, frozen unit prices.
    const itemCount = intBetween(1, 4);
    const chosen = new Set();
    while (chosen.size < itemCount) chosen.add(intBetween(0, products.length - 1));
    const items = [...chosen].map((productIndex) => {
      const product = products[productIndex];
      const quantity = intBetween(1, 3);
      const unitPrice = Math.round(product.price);
      return {
        product: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0],
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
        options: [],
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const deliveryFee = plan.type === "delivery" ? pick([0, 50, 100, 150]) : 0;
    const discount = 0;
    const total = subtotal + deliveryFee - discount;

    const isDelivered = plan.status === "delivered";
    const payment = {
      method: PAYMENT_METHOD,
      status: isDelivered ? "paid" : "pending",
      ...(isDelivered ? { paidAt: lastChange } : {}),
    };

    const address =
      plan.type === "delivery"
        ? (() => {
            const zone = pick(AREAS);
            return {
              label: pick(["Home", "Work"]),
              zone,
              address: {
                label: pick(["Home", "Work"]),
                street: `House ${intBetween(1, 60)}, Street ${intBetween(1, 30)}`,
                area: zone.area,
                city: "Islamabad",
                phone: customer.phone,
              },
            };
          })()
        : null;

    const assigned = plan.assigned && plan.type === "delivery";
    const rider = assigned ? riders[index % riders.length] : null;
    const assignedAt = assigned ? assignedAtFor(plan, placedAt) : null;

    const delivery = {
      type: plan.type,
      ...(address ? { address: address.address, zoneName: address.zone.name } : {}),
      branchName: BRANCH.name,
      branchAddress: BRANCH.address,
      etaMinutes: plan.type === "delivery" ? intBetween(25, 55) : intBetween(15, 30),
      ...(assigned ? { deliveryBoy: rider._id, deliveryBoyName: rider.name, assignedAt } : {}),
    };

    const fulfillmentHistory =
      assigned && admin
        ? [
            {
              eventId: eventIdFor(`${idempotencyKey}:assigned`),
              type: "assigned",
              actor: admin._id,
              at: assignedAt,
              deliveryBoy: rider._id,
              deliveryBoyName: rider.name,
            },
          ]
        : [];

    orders.push({
      orderNumber: `DEMO-${1001 + index}`,
      trackingId: trackingIdFor(idempotencyKey),
      user: customer._id,
      contact: { name: customer.name, email: customer.email, phone: customer.phone },
      items,
      subtotal,
      deliveryFee,
      discount,
      total,
      currency: "PKR",
      delivery,
      payment,
      status: plan.status,
      statusHistory,
      fulfillmentHistory,
      version: statusHistory.length,
      idempotencyKey,
      customerNote: pick(CUSTOMER_NOTES),
      placedAt,
      isDemo: true,
      createdAt: placedAt,
      updatedAt: lastChange,
    });
  });

  // Referential integrity check: every item must point at a real product.
  const productIds = new Set(products.map((product) => String(product._id)));
  const brokenRefs = orders
    .flatMap((order) => order.items)
    .filter((item) => !productIds.has(String(item.product)));
  if (brokenRefs.length > 0) {
    await mongoose.disconnect();
    refuse(`${brokenRefs.length} order items reference unknown products.`);
  }

  if (DRY_RUN) {
    const byStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});
    console.log("Would upsert:");
    console.log(`  hero slides      : ${heroInserted}`);
    console.log(`  customers        : ${customers.length}`);
    console.log(`  delivery riders  : ${riders.length}`);
    console.log(`  orders           : ${orders.length}`);
    console.log(`  assigned riders  : ${orders.filter((o) => o.delivery.deliveryBoy).length}`);
    console.log(`  order status mix : ${JSON.stringify(byStatus)}`);
    console.log("\nDry run complete. No data was written.");
    await mongoose.disconnect();
    return;
  }

  // --- Upsert orders (idempotent, never overwriting) ------------------------
  let inserted = 0;
  let existing = 0;
  for (const order of orders) {
    const result = await Order.updateOne(
      { idempotencyKey: order.idempotencyKey, isDemo: true },
      { $setOnInsert: order },
      { upsert: true },
    );
    if (result.upsertedCount === 1) inserted += 1;
    else existing += 1;
  }

  const totalDemoOrders = await Order.countDocuments({ isDemo: true });
  const totalDemoUsers = await User.countDocuments({ isDemo: true });

  console.log("Demo data summary");
  console.log(`  hero slides inserted : ${heroInserted}`);
  console.log(`  hero slides existing : ${heroExisting}`);
  console.log(`  customers upserted : ${customers.length}`);
  console.log(`  riders upserted    : ${riders.length}`);
  console.log(`  orders inserted    : ${inserted}`);
  console.log(`  orders already set : ${existing}`);
  console.log(`  demo orders total  : ${totalDemoOrders}`);
  console.log(`  demo users total   : ${totalDemoUsers}`);
  console.log("\n✔ Demo seed complete. No existing records were modified or deleted.\n");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("\n✖ Demo seed failed:", error);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
