/**
 * Bachelor Street Café — demo seed script
 * ---------------------------------------------------------------------------
 * Seeds a clearly labelled SAMPLE catalog (categories, products with option
 * groups, branches and delivery zones) for local demos and development.
 *
 * Usage:
 *   npm run seed                 # uses MONGODB_URI from .env.local
 *   node --env-file=.env.local scripts/seed.mjs
 *
 * Safety:
 *   - Refuses to run against NODE_ENV=production unless run with --force.
 *   - Wipes ONLY the collections listed below, then re-inserts demo data.
 *   - All prices are demo values in PKR and are not real menu prices.
 */
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Product images come from a generated map (Cloudinary URLs, written by
 * scripts/cloudinary-upload.mjs) when present, otherwise from the license-clean
 * source manifest so the storefront still shows photography without Cloudinary.
 */
function loadImageMap() {
  const generatedPath = join(__dirname, "seed-images.generated.json");
  if (existsSync(generatedPath)) {
    const data = JSON.parse(readFileSync(generatedPath, "utf8"));
    const map = data.images ?? data;
    console.log(`Images: ${Object.keys(map).length} Cloudinary URLs (seed-images.generated.json)`);
    return map;
  }
  const manifestPath = join(__dirname, "seed-images.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const map = {};
    for (const [slug, entry] of Object.entries(manifest.images ?? {})) {
      if (entry && entry.source) map[slug] = toWebImagePath(entry.source);
    }
    console.log(
      `Images: ${Object.keys(map).length} source paths (seed-images.json). Run "npm run images:upload" to host them on Cloudinary.`,
    );
    return map;
  }
  return {};
}

/** `public/images/food/x.jpg` -> `/images/food/x.jpg`; leaves URLs untouched. */
function toWebImagePath(source) {
  if (/^https?:\/\//i.test(source) || source.startsWith("data:")) return source;
  const normalized = source.replace(/\\/g, "/").replace(/^\.?\//, "");
  return normalized.startsWith("public/")
    ? `/${normalized.slice("public/".length)}`
    : `/${normalized}`;
}

const force = process.argv.includes("--force");
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env.local and retry.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && !force) {
  console.error("Refusing to seed with NODE_ENV=production (pass --force to override).");
  process.exit(1);
}

const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    priceDelta: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const optionGroupSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["single", "multi"], default: "single" },
    required: { type: Boolean, default: false },
    max: Number,
    options: { type: [optionSchema], default: [] },
  },
  { _id: false },
);

const Category = mongoose.model(
  "Category",
  new mongoose.Schema(
    {
      name: String,
      slug: { type: String, unique: true },
      description: String,
      image: String,
      sortOrder: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

const Product = mongoose.model(
  "Product",
  new mongoose.Schema(
    {
      name: String,
      slug: { type: String, unique: true },
      description: String,
      price: Number,
      compareAtPrice: Number,
      category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
      images: { type: [String], default: [] },
      tags: { type: [String], default: [] },
      optionGroups: { type: [optionGroupSchema], default: [] },
      calories: Number,
      preparationMinutes: Number,
      isAvailable: { type: Boolean, default: true },
      isActive: { type: Boolean, default: true },
      isFeatured: { type: Boolean, default: false },
      popularity: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);

const Branch = mongoose.model(
  "Branch",
  new mongoose.Schema(
    {
      name: String,
      slug: { type: String, unique: true },
      address: String,
      phone: String,
      city: { type: String, default: "Islamabad" },
      hours: { type: [{ day: String, open: String, close: String, closed: Boolean }], default: [] },
      coordinates: { lat: Number, lng: Number },
      deliveryAvailable: { type: Boolean, default: true },
      pickupAvailable: { type: Boolean, default: true },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

const DeliveryZone = mongoose.model(
  "DeliveryZone",
  new mongoose.Schema(
    {
      branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
      name: String,
      areas: { type: [String], default: [] },
      deliveryFee: Number,
      freeAbove: Number,
      minOrder: Number,
      etaMinutes: Number,
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      email: String,
      normalizedEmail: { type: String, unique: true },
      name: String,
      role: { type: String, default: "customer" },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const CATEGORIES = [
  { name: "Burgers", slug: "burgers", description: "Chargrilled patties on toasted brioche.", sortOrder: 1 },
  { name: "Wings & Sides", slug: "wings-sides", description: "Crisp, sauced and shareable.", sortOrder: 2 },
  { name: "Rice Bowls", slug: "rice-bowls", description: "Comfort bowls, generous portions.", sortOrder: 3 },
  { name: "Coffee & Chai", slug: "coffee-chai", description: "Pulled fresh all day long.", sortOrder: 4 },
  { name: "Desserts", slug: "desserts", description: "Sweet endings done right.", sortOrder: 5 },
  { name: "Pizza", slug: "pizza", description: "Stone-baked, loaded and sliced to share.", sortOrder: 6 },
  { name: "Wraps & Rolls", slug: "wraps-rolls", description: "Hand-held, packed and ready to go.", sortOrder: 7 },
  { name: "Combos & Deals", slug: "combos-deals", description: "Full meals at a bundle price.", sortOrder: 8 },
  { name: "Drinks", slug: "drinks", description: "Chilled shakes, sodas and more.", sortOrder: 9 },
];

const sizeGroup = (deltas) => ({
  key: "size",
  name: "Size",
  type: "single",
  required: true,
  options: deltas.map(([key, name, priceDelta]) => ({ key, name, priceDelta })),
});

const PRODUCTS = [
  // --- Burgers ---
  {
    name: "Classic Smash",
    slug: "classic-smash",
    category: "burgers",
    price: 650,
    description: "Two smashed beef patties, American cheese, house sauce and pickles.",
    tags: ["bestseller"],
    popularity: 95,
    isFeatured: true,
    calories: 720,
    preparationMinutes: 15,
    optionGroups: [
      {
        key: "spice",
        name: "Spice level",
        type: "single",
        required: true,
        options: [
          { key: "spice-mild", name: "Mild", priceDelta: 0, isDefault: true },
          { key: "spice-medium", name: "Medium", priceDelta: 0 },
          { key: "spice-hot", name: "Hot", priceDelta: 0 },
        ],
      },
      {
        key: "addons",
        name: "Add-ons",
        type: "multi",
        required: false,
        max: 4,
        options: [
          { key: "addon-cheese", name: "Extra cheese", priceDelta: 120 },
          { key: "addon-patty", name: "Extra patty", priceDelta: 250 },
          { key: "addon-jalapeno", name: "Jalapeños", priceDelta: 80 },
        ],
      },
    ],
  },
  {
    name: "Bachelor Double",
    slug: "bachelor-double",
    category: "burgers",
    price: 890,
    compareAtPrice: 990,
    description: "A double-stack with caramelised onions and smoky BBQ sauce.",
    tags: ["bestseller", "deal"],
    popularity: 88,
    isFeatured: true,
    calories: 910,
    preparationMinutes: 18,
    optionGroups: [
      {
        key: "spice",
        name: "Spice level",
        type: "single",
        required: true,
        options: [
          { key: "spice-mild", name: "Mild", priceDelta: 0 },
          { key: "spice-medium", name: "Medium", priceDelta: 0, isDefault: true },
          { key: "spice-hot", name: "Hot", priceDelta: 0 },
        ],
      },
      {
        key: "addons",
        name: "Add-ons",
        type: "multi",
        required: false,
        max: 4,
        options: [
          { key: "addon-cheese", name: "Extra cheese", priceDelta: 120 },
          { key: "addon-fries", name: "Side of fries", priceDelta: 250 },
          { key: "addon-bacon", name: "Beef bacon", priceDelta: 220 },
        ],
      },
    ],
  },
  {
    name: "Crispy Chicken Burger",
    slug: "crispy-chicken-burger",
    category: "burgers",
    price: 720,
    description: "Buttermilk-brined chicken, slaw and garlic aioli.",
    tags: ["new"],
    popularity: 70,
    calories: 680,
    preparationMinutes: 16,
    optionGroups: [
      {
        key: "spice",
        name: "Spice level",
        type: "single",
        required: true,
        options: [
          { key: "spice-crispy-mild", name: "Mild", priceDelta: 0, isDefault: true },
          { key: "spice-crispy-hot", name: "Hot", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    name: "Mushroom Swiss Burger",
    slug: "mushroom-swiss-burger",
    category: "burgers",
    price: 780,
    description: "Sautéed mushrooms, melted Swiss and truffle mayo.",
    tags: [],
    popularity: 60,
    calories: 760,
    preparationMinutes: 17,
    optionGroups: [],
  },

  // --- Wings & Sides ---
  {
    name: "Buffalo Wings",
    slug: "buffalo-wings",
    category: "wings-sides",
    price: 720,
    description: "Crisp wings tossed in classic buffalo sauce.",
    tags: ["bestseller"],
    popularity: 90,
    isFeatured: true,
    calories: 640,
    preparationMinutes: 20,
    optionGroups: [
      sizeGroup([
        ["wing-6", "6 pieces", 0],
        ["wing-12", "12 pieces", 600],
      ]),
      {
        key: "dip",
        name: "Dip",
        type: "single",
        required: false,
        options: [
          { key: "dip-none", name: "No dip", priceDelta: 0, isDefault: true },
          { key: "dip-blue", name: "Blue cheese", priceDelta: 80 },
          { key: "dip-ranch", name: "Ranch", priceDelta: 80 },
        ],
      },
    ],
  },
  {
    name: "Peri Peri Wings",
    slug: "peri-peri-wings",
    category: "wings-sides",
    price: 760,
    description: "Flame-grilled wings with a tangy peri peri glaze.",
    tags: ["spicy"],
    popularity: 72,
    calories: 610,
    preparationMinutes: 20,
    optionGroups: [
      sizeGroup([
        ["peri-6", "6 pieces", 0],
        ["peri-12", "12 pieces", 620],
      ]),
    ],
  },
  {
    name: "Loaded Fries",
    slug: "loaded-fries",
    category: "wings-sides",
    price: 480,
    description: "Fries piled with cheese sauce, jalapeños and spring onion.",
    tags: ["combo"],
    popularity: 65,
    calories: 520,
    preparationMinutes: 12,
    optionGroups: [
      {
        key: "loaded-addons",
        name: "Add-ons",
        type: "multi",
        required: false,
        max: 2,
        options: [
          { key: "loaded-chicken", name: "Shredded chicken", priceDelta: 150 },
          { key: "loaded-extra-cheese", name: "Extra cheese sauce", priceDelta: 90 },
        ],
      },
    ],
  },
  {
    name: "Chicken Tenders",
    slug: "chicken-tenders",
    category: "wings-sides",
    price: 560,
    description: "Five tenders with a dipping sauce of your choice.",
    tags: [],
    popularity: 55,
    calories: 480,
    preparationMinutes: 14,
    optionGroups: [],
  },
  {
    name: "Garlic Bread",
    slug: "garlic-bread",
    category: "wings-sides",
    price: 320,
    description: "Warm, buttery and heavy on the garlic.",
    tags: ["vegetarian"],
    popularity: 40,
    calories: 300,
    preparationMinutes: 8,
    optionGroups: [],
  },

  // --- Rice Bowls ---
  {
    name: "Chicken Tikka Bowl",
    slug: "chicken-tikka-bowl",
    category: "rice-bowls",
    price: 850,
    description: "Tandoori chicken over rice with mint raita and salad.",
    tags: ["bestseller"],
    popularity: 82,
    isFeatured: true,
    calories: 700,
    preparationMinutes: 18,
    optionGroups: [
      {
        key: "rice",
        name: "Rice",
        type: "single",
        required: true,
        options: [
          { key: "rice-white", name: "White rice", priceDelta: 0, isDefault: true },
          { key: "rice-brown", name: "Brown rice", priceDelta: 60 },
        ],
      },
      {
        key: "bowl-addons",
        name: "Add-ons",
        type: "multi",
        required: false,
        max: 3,
        options: [
          { key: "bowl-egg", name: "Fried egg", priceDelta: 60 },
          { key: "bowl-sauce", name: "Extra sauce", priceDelta: 50 },
        ],
      },
    ],
  },
  {
    name: "Beef Chilli Bowl",
    slug: "beef-chilli-bowl",
    category: "rice-bowls",
    price: 920,
    description: "Slow-cooked chilli beef with rice and fresh coriander.",
    tags: ["spicy"],
    popularity: 68,
    calories: 780,
    preparationMinutes: 20,
    optionGroups: [],
  },
  {
    name: "Butter Chicken Bowl",
    slug: "butter-chicken-bowl",
    category: "rice-bowls",
    price: 880,
    compareAtPrice: 980,
    description: "Creamy butter chicken with basmati rice.",
    tags: ["deal"],
    popularity: 74,
    calories: 820,
    preparationMinutes: 18,
    optionGroups: [],
  },
  {
    name: "Veggie Power Bowl",
    slug: "veggie-power-bowl",
    category: "rice-bowls",
    price: 700,
    description: "Roasted vegetables, chickpeas, grains and tahini dressing.",
    tags: ["vegetarian", "new"],
    popularity: 45,
    isAvailable: false,
    calories: 540,
    preparationMinutes: 15,
    optionGroups: [],
  },

  // --- Coffee & Chai ---
  {
    name: "Signature Latte",
    slug: "signature-latte",
    category: "coffee-chai",
    price: 480,
    description: "Double shot with silky steamed milk.",
    tags: ["bestseller"],
    popularity: 78,
    calories: 180,
    preparationMinutes: 6,
    optionGroups: [
      sizeGroup([
        ["latte-12", "12 oz", 0],
        ["latte-16", "16 oz", 80],
      ]),
      {
        key: "milk",
        name: "Milk",
        type: "single",
        required: false,
        options: [
          { key: "milk-whole", name: "Whole", priceDelta: 0, isDefault: true },
          { key: "milk-skim", name: "Skim", priceDelta: 0 },
          { key: "milk-oat", name: "Oat", priceDelta: 80 },
        ],
      },
      {
        key: "coffee-addons",
        name: "Add-ons",
        type: "multi",
        required: false,
        max: 3,
        options: [{ key: "coffee-shot", name: "Extra shot", priceDelta: 100 }],
      },
    ],
  },
  {
    name: "Karak Chai",
    slug: "karak-chai",
    category: "coffee-chai",
    price: 250,
    description: "Strong milk tea with cardamom.",
    tags: ["bestseller"],
    popularity: 85,
    calories: 160,
    preparationMinutes: 5,
    optionGroups: [
      sizeGroup([
        ["chai-cup", "Cup", 0],
        ["chai-large", "Large", 80],
      ]),
    ],
  },
  {
    name: "Cold Brew",
    slug: "cold-brew",
    category: "coffee-chai",
    price: 520,
    description: "Slow-steeped for 18 hours, served over ice.",
    tags: ["new"],
    popularity: 58,
    calories: 20,
    preparationMinutes: 4,
    optionGroups: [
      sizeGroup([
        ["brew-12", "12 oz", 0],
        ["brew-16", "16 oz", 90],
      ]),
    ],
  },
  {
    name: "Mango Lassi",
    slug: "mango-lassi",
    category: "coffee-chai",
    price: 420,
    description: "Chilled yoghurt blended with ripe mango.",
    tags: ["vegetarian"],
    popularity: 50,
    calories: 260,
    preparationMinutes: 5,
    optionGroups: [
      sizeGroup([
        ["lassi-reg", "Regular", 0],
        ["lassi-large", "Large", 90],
      ]),
    ],
  },

  // --- Desserts ---
  {
    name: "Molten Choco Cake",
    slug: "molten-choco-cake",
    category: "desserts",
    price: 520,
    description: "Warm chocolate cake with a gooey centre.",
    tags: ["bestseller"],
    popularity: 76,
    isFeatured: true,
    calories: 480,
    preparationMinutes: 12,
    optionGroups: [
      {
        key: "dessert-addons",
        name: "Add-ons",
        type: "single",
        required: false,
        options: [
          { key: "dessert-plain", name: "Plain", priceDelta: 0, isDefault: true },
          { key: "dessert-icecream", name: "Add vanilla ice cream", priceDelta: 150 },
        ],
      },
    ],
  },
  {
    name: "Cheesecake Slice",
    slug: "cheesecake-slice",
    category: "desserts",
    price: 480,
    description: "Baked New York style with a biscuit base.",
    tags: [],
    popularity: 62,
    calories: 420,
    preparationMinutes: 5,
    optionGroups: [],
  },
  {
    name: "Cinnamon Rolls",
    slug: "cinnamon-rolls",
    category: "desserts",
    price: 380,
    compareAtPrice: 450,
    description: "Two warm rolls with cream cheese frosting.",
    tags: ["deal"],
    popularity: 48,
    calories: 460,
    preparationMinutes: 8,
    optionGroups: [],
  },
  {
    name: "Brownie Sundae",
    slug: "brownie-sundae",
    category: "desserts",
    price: 560,
    description: "Fudge brownie, vanilla ice cream and toasted nuts.",
    tags: ["new"],
    popularity: 54,
    calories: 590,
    preparationMinutes: 8,
    optionGroups: [],
  },

  // --- Pizza ---
  {
    name: "Pepperoni Pizza",
    slug: "pepperoni-pizza",
    category: "pizza",
    price: 1350,
    description: "Pepperoni, mozzarella and oregano on a stone-baked base.",
    tags: ["bestseller"],
    popularity: 80,
    isFeatured: true,
    calories: 860,
    preparationMinutes: 18,
    optionGroups: [
      {
        key: "pizza-size",
        name: "Size",
        type: "single",
        required: true,
        options: [
          { key: "pizza-9", name: '9"', priceDelta: 0, isDefault: true },
          { key: "pizza-12", name: '12"', priceDelta: 350 },
        ],
      },
    ],
  },
  {
    name: "Chicken Tikka Pizza",
    slug: "chicken-tikka-pizza",
    category: "pizza",
    price: 1250,
    description: "Tandoori chicken, onion and a swirl of mint mayo.",
    tags: [],
    popularity: 64,
    calories: 820,
    preparationMinutes: 18,
    optionGroups: [],
  },
  {
    name: "Margherita Pizza",
    slug: "margherita-pizza",
    category: "pizza",
    price: 1100,
    description: "Simple and classic: tomato, mozzarella and basil.",
    tags: ["vegetarian"],
    popularity: 52,
    calories: 700,
    preparationMinutes: 16,
    optionGroups: [],
  },

  // --- Wraps & Rolls ---
  {
    name: "Chicken Shawarma Wrap",
    slug: "chicken-shawarma-wrap",
    category: "wraps-rolls",
    price: 480,
    description: "Garlicky chicken, pickles and tahini in a warm wrap.",
    tags: ["bestseller"],
    popularity: 79,
    calories: 520,
    preparationMinutes: 10,
    optionGroups: [],
  },
  {
    name: "Beef Paratha Roll",
    slug: "beef-paratha-roll",
    category: "wraps-rolls",
    price: 520,
    description: "Spiced beef rolled in a flaky paratha with chutney.",
    tags: ["spicy"],
    popularity: 66,
    calories: 600,
    preparationMinutes: 12,
    optionGroups: [],
  },
  {
    name: "Grilled Chicken Wrap",
    slug: "grilled-chicken-wrap",
    category: "wraps-rolls",
    price: 550,
    description: "Grilled chicken, crunchy slaw and yoghurt dressing.",
    tags: [],
    popularity: 58,
    calories: 480,
    preparationMinutes: 11,
    optionGroups: [],
  },

  // --- Combos & Deals ---
  {
    name: "Double Smash Combo",
    slug: "double-smash-combo",
    category: "combos-deals",
    price: 1290,
    compareAtPrice: 1490,
    description: "Bachelor Double with fries and a soft drink.",
    tags: ["bestseller", "deal"],
    popularity: 86,
    calories: 1200,
    preparationMinutes: 18,
    optionGroups: [],
  },
  {
    name: "Wings & Fries Combo",
    slug: "wings-fries-combo",
    category: "combos-deals",
    price: 990,
    compareAtPrice: 1150,
    description: "Six wings, loaded fries and a dip.",
    tags: ["bestseller", "deal"],
    popularity: 75,
    calories: 980,
    preparationMinutes: 20,
    optionGroups: [],
  },
  {
    name: "Family Feast Box",
    slug: "family-feast-box",
    category: "combos-deals",
    price: 2990,
    compareAtPrice: 3490,
    description: "Two burgers, wings, fries and four drinks to share.",
    tags: ["deal"],
    popularity: 58,
    calories: 2600,
    preparationMinutes: 25,
    optionGroups: [],
  },

  // --- More Wings & Sides ---
  {
    name: "Chicken Popcorn",
    slug: "chicken-popcorn",
    category: "wings-sides",
    price: 420,
    description: "Bite-size crispy chicken with a smoky dip.",
    tags: ["bestseller"],
    popularity: 69,
    calories: 430,
    preparationMinutes: 12,
    optionGroups: [],
  },
  {
    name: "Cheese Nachos",
    slug: "cheese-nachos",
    category: "wings-sides",
    price: 520,
    description: "Tortilla chips, melted cheese, salsa and jalapeños.",
    tags: ["new"],
    popularity: 57,
    calories: 540,
    preparationMinutes: 10,
    optionGroups: [],
  },
  {
    name: "Garden Side Salad",
    slug: "garden-side-salad",
    category: "wings-sides",
    price: 350,
    description: "Crisp leaves, cucumber, tomato and a light dressing.",
    tags: ["vegetarian"],
    popularity: 38,
    calories: 180,
    preparationMinutes: 6,
    optionGroups: [],
  },

  // --- More Burgers ---
  {
    name: "Veggie Smash Burger",
    slug: "veggie-smash-burger",
    category: "burgers",
    price: 620,
    description: "Smashed plant patty, cheddar and chipotle mayo.",
    tags: ["vegetarian", "new"],
    popularity: 49,
    calories: 560,
    preparationMinutes: 15,
    optionGroups: [],
  },

  // --- Drinks ---
  {
    name: "Oreo Milkshake",
    slug: "oreo-milkshake",
    category: "drinks",
    price: 450,
    description: "Thick vanilla shake blended with crushed Oreo.",
    tags: ["bestseller"],
    popularity: 71,
    calories: 520,
    preparationMinutes: 6,
    optionGroups: [],
  },
  {
    name: "Mango Shake",
    slug: "mango-shake",
    category: "drinks",
    price: 420,
    description: "Fresh mango blended with chilled milk.",
    tags: [],
    popularity: 55,
    calories: 380,
    preparationMinutes: 6,
    optionGroups: [],
  },
  {
    name: "Fresh Lime Soda",
    slug: "fresh-lime-soda",
    category: "drinks",
    price: 250,
    description: "Sparkling lime with a pinch of salt, served cold.",
    tags: [],
    popularity: 47,
    calories: 90,
    preparationMinutes: 4,
    optionGroups: [],
  },
];

const BRANCHES = [
  {
    name: "Bachelor Street — H-13",
    slug: "h-13",
    address: "H-13, Islamabad",
    // phone omitted: no verified business number is available
    coordinates: { lat: 33.6290711, lng: 72.9763099 },
  },
];

async function run() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  const dbName = mongoose.connection.name;
  console.log(`Connected to database "${dbName}".`);

  console.log("Clearing demo collections…");
  await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Branch.deleteMany({}),
    DeliveryZone.deleteMany({}),
  ]);

  const weekHours = WEEK.map((day) => ({ day, open: "11:00", close: "23:00", closed: false }));

  const imageMap = loadImageMap();

  const categories = await Category.insertMany(
    CATEGORIES.map((category) => ({ ...category, isActive: true })),
  );
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category._id]));

  const products = PRODUCTS.map((product) => ({
    ...product,
    category: categoryBySlug.get(product.category),
    images: imageMap[product.slug] ? [imageMap[product.slug]] : [],
    isActive: true,
    isAvailable: product.isAvailable ?? true,
    isFeatured: product.isFeatured ?? false,
  }));
  await Product.insertMany(products);

  const branches = await Branch.insertMany(
    BRANCHES.map((branch) => ({ ...branch, city: "Islamabad", hours: weekHours, isActive: true })),
  );
  const [h13] = branches;

  const zones = [
    {
      branch: h13._id,
      name: "H-13 delivery area",
      areas: ["H-13"],
      deliveryFee: 149,
      freeAbove: 2000,
      minOrder: 500,
      etaMinutes: 30,
    },
  ];
  await DeliveryZone.insertMany(zones.map((zone) => ({ ...zone, isActive: true })));

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (adminEmail) {
    const normalized = adminEmail.trim().toLowerCase();
    await User.updateOne(
      { normalizedEmail: normalized },
      {
        $set: {
          email: normalized,
          normalizedEmail: normalized,
          name: process.env.SEED_ADMIN_NAME || "Demo Admin",
          role: "admin",
          isActive: true,
        },
      },
      { upsert: true },
    );
    console.log(`Upserted demo admin: ${normalized} (set a password via your auth flow).`);
  } else {
    console.log("Skipped admin seed (set SEED_ADMIN_EMAIL to create one).");
  }

  console.log("\nDemo seed complete:");
  console.log(`  categories : ${categories.length}`);
  console.log(`  products   : ${products.length} (sample prices in PKR — for demo only)`);
  console.log(`  branches   : ${branches.length}`);
  console.log(`  zones      : ${zones.length}`);
  console.log(`  build tag  : ${randomBytes(4).toString("hex")}`);
  console.log("\nNote: all catalog content is clearly-labelled SAMPLE data.");
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
