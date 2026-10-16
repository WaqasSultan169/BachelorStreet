/**
 * Local food photography.
 *
 * All assets live in `public/images/food` so they are served from the app
 * origin (fast, no third-party dependency at runtime). Product rows in MongoDB
 * store their own `images`; this module only supplies the curated defaults used
 * by the storefront sections and as a graceful fallback when a product has no
 * photo yet.
 */

export const FOOD_IMAGE = {
  heroBurger: "/images/food/hero-burger.jpg",
  burgerClassic: "/images/food/burger-classic.jpg",
  burgerDouble: "/images/food/burger-double.jpg",
  burgerChicken: "/images/food/burger-chicken.jpg",
  burgerBacon: "/images/food/burger-bacon.jpg",
  burgerVeggie: "/images/food/burger-veggie.jpg",
  pizza: "/images/food/pizza.jpg",
  pizzaSlice: "/images/food/pizza-slice.jpg",
  pizzaPepperoni: "/images/food/pizza-pepperoni.jpg",
  pizzaSupreme: "/images/food/pizza-supreme.jpg",
  wings: "/images/food/wings.jpg",
  friedChicken: "/images/food/fried-chicken.jpg",
  fries: "/images/food/fries.jpg",
  loadedFries: "/images/food/loaded-fries.jpg",
  onionRings: "/images/food/onion-rings.jpg",
  wrap: "/images/food/wrap.jpg",
  rolls: "/images/food/rolls.jpg",
  riceBowl: "/images/food/rice-bowl.jpg",
  coffee: "/images/food/coffee.jpg",
  chai: "/images/food/chai.jpg",
  drink: "/images/food/drink.jpg",
  milkshake: "/images/food/milkshake.jpg",
  milkshakeChoc: "/images/food/milkshake-choc.jpg",
  mangoShake: "/images/food/mango-shake.jpg",
  soda: "/images/food/soda.jpg",
  dessert: "/images/food/dessert.jpg",
  mealCombo: "/images/food/meal-combo.jpg",
  comboFeast: "/images/food/combo-feast.jpg",
  comboFamily: "/images/food/combo-family.jpg",
  nachos: "/images/food/nachos.jpg",
  popcornChicken: "/images/food/popcorn-chicken.jpg",
  saladBowl: "/images/food/salad-bowl.jpg",
  shawarma: "/images/food/shawarma.jpg",
} as const;

export type FoodImageKey = keyof typeof FOOD_IMAGE;

/** Category slug → curated hero tile. */
const CATEGORY_IMAGE_BY_SLUG: Record<string, string> = {
  burgers: FOOD_IMAGE.burgerClassic,
  "wings-sides": FOOD_IMAGE.wings,
  "rice-bowls": FOOD_IMAGE.riceBowl,
  "coffee-chai": FOOD_IMAGE.coffee,
  desserts: FOOD_IMAGE.dessert,
  pizza: FOOD_IMAGE.pizzaPepperoni,
  chicken: FOOD_IMAGE.friedChicken,
  fries: FOOD_IMAGE.loadedFries,
  wraps: FOOD_IMAGE.wrap,
  "wraps-rolls": FOOD_IMAGE.shawarma,
  drinks: FOOD_IMAGE.soda,
  deals: FOOD_IMAGE.mealCombo,
  "combos-deals": FOOD_IMAGE.comboFeast,
};

function normalize(value: string): string {
  return value.toLowerCase();
}

/** Resolve a category tile image by slug first, then by fuzzy name match. */
export function categoryImage(name: string, slug: string): string {
  const direct = CATEGORY_IMAGE_BY_SLUG[normalize(slug)];
  if (direct) return direct;

  const key = normalize(`${slug} ${name}`);
  if (/(burger|smash|patty)/.test(key)) return FOOD_IMAGE.burgerClassic;
  if (key.includes("pizza")) return FOOD_IMAGE.pizza;
  if (/(wing|chicken|tender|nugget)/.test(key)) return FOOD_IMAGE.wings;
  if (key.includes("fries")) return FOOD_IMAGE.loadedFries;
  if (key.includes("wrap") || key.includes("roll") || key.includes("shawarma"))
    return FOOD_IMAGE.wrap;
  if (key.includes("rice") || key.includes("bowl")) return FOOD_IMAGE.riceBowl;
  if (/(coffee|latte|espresso|brew)/.test(key)) return FOOD_IMAGE.coffee;
  if (/(chai|tea)/.test(key)) return FOOD_IMAGE.chai;
  if (key.includes("shake")) return FOOD_IMAGE.milkshake;
  if (/(drink|juice|soda|lassi|smoothie)/.test(key)) return FOOD_IMAGE.drink;
  if (normalize(key).includes("dessert") || /cake|sweet|cheesecake|brownie|cinnamon/.test(key)) {
    return FOOD_IMAGE.dessert;
  }
  if (key.includes("deal") || key.includes("combo") || key.includes("meal")) {
    return FOOD_IMAGE.mealCombo;
  }
  return FOOD_IMAGE.burgerClassic;
}

/** Product slug → curated photo (exact matches for the seeded catalog). */
const PRODUCT_IMAGE_BY_SLUG: Record<string, string> = {
  "classic-smash": FOOD_IMAGE.burgerClassic,
  "bachelor-double": FOOD_IMAGE.burgerDouble,
  "crispy-chicken-burger": FOOD_IMAGE.burgerChicken,
  "mushroom-swiss-burger": FOOD_IMAGE.burgerBacon,
  "veggie-smash-burger": FOOD_IMAGE.burgerVeggie,
  "buffalo-wings": FOOD_IMAGE.wings,
  "peri-peri-wings": FOOD_IMAGE.friedChicken,
  "loaded-fries": FOOD_IMAGE.loadedFries,
  "chicken-tenders": FOOD_IMAGE.friedChicken,
  "chicken-popcorn": FOOD_IMAGE.popcornChicken,
  "cheese-nachos": FOOD_IMAGE.nachos,
  "garden-side-salad": FOOD_IMAGE.saladBowl,
  "garlic-bread": FOOD_IMAGE.pizzaSlice,
  "chicken-tikka-bowl": FOOD_IMAGE.riceBowl,
  "beef-chilli-bowl": FOOD_IMAGE.riceBowl,
  "butter-chicken-bowl": FOOD_IMAGE.riceBowl,
  "veggie-power-bowl": FOOD_IMAGE.riceBowl,
  "pepperoni-pizza": FOOD_IMAGE.pizzaPepperoni,
  "chicken-tikka-pizza": FOOD_IMAGE.pizzaSupreme,
  "margherita-pizza": FOOD_IMAGE.pizza,
  "chicken-shawarma-wrap": FOOD_IMAGE.shawarma,
  "beef-paratha-roll": FOOD_IMAGE.rolls,
  "grilled-chicken-wrap": FOOD_IMAGE.wrap,
  "double-smash-combo": FOOD_IMAGE.comboFeast,
  "wings-fries-combo": FOOD_IMAGE.comboFamily,
  "family-feast-box": FOOD_IMAGE.mealCombo,
  "signature-latte": FOOD_IMAGE.coffee,
  "karak-chai": FOOD_IMAGE.chai,
  "cold-brew": FOOD_IMAGE.coffee,
  "mango-lassi": FOOD_IMAGE.milkshake,
  "oreo-milkshake": FOOD_IMAGE.milkshakeChoc,
  "mango-shake": FOOD_IMAGE.mangoShake,
  "fresh-lime-soda": FOOD_IMAGE.soda,
  "molten-choco-cake": FOOD_IMAGE.dessert,
  "cheesecake-slice": FOOD_IMAGE.dessert,
  "cinnamon-rolls": FOOD_IMAGE.dessert,
  "brownie-sundae": FOOD_IMAGE.dessert,
};

type FoodImageInput = {
  slug?: string;
  name?: string;
  categoryName?: string;
  categorySlug?: string;
  images?: string[];
};

/**
 * Pick the best image for a product: its own photo when present, else a
 * curated match by slug, else a fuzzy match on the name/category.
 */
export function resolveFoodImage(input: FoodImageInput): string {
  const own = input.images?.find((image) => Boolean(image));
  if (own) return own;

  const slug = input.slug ? normalize(input.slug) : "";
  if (slug && PRODUCT_IMAGE_BY_SLUG[slug]) return PRODUCT_IMAGE_BY_SLUG[slug];

  if (input.categorySlug) {
    return categoryImage(input.categoryName ?? "", input.categorySlug);
  }
  return categoryImage(input.categoryName ?? input.name ?? "", slug);
}
