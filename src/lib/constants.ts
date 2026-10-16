export const APP = {
  name: "Bachelor's Street",
  shortName: "Bachelor's Street",
  tagline: "Fast, honest, made-to-order food in Islamabad.",
  city: "Islamabad",
  area: "H-13, Islamabad",
  country: "Pakistan",
  currency: "PKR",
  primaryBranch: {
    slug: "h-13",
    name: "Bachelor Street — H-13",
    address: "H-13, Islamabad",
    coordinates: { lat: 33.6290711, lng: 72.9763099 },
  },
  instagram: "https://www.instagram.com/bachelorstreetcafe/",
  facebook: "https://www.facebook.com/bachelorsstreet/",
  /** Safe, always-valid Maps link by place name (branch maps links come from coordinates). */
  mapsUrl:
    "https://www.google.com/maps/place/Bachelor's+street/@33.6290755,72.973735,17z/data=!3m1!4b1!4m6!3m5!1s0x38df9700215052b5:0x608d88c749a1f8ca!8m2!3d33.6290711!4d72.9763099!16s%2Fg%2F11vs6jdgnd",
} as const;

export const ROLES = ["customer", "admin", "delivery_boy"] as const;
export type Role = (typeof ROLES)[number];

/** Roles a public (self-service) signup may ever receive. */
export const PUBLIC_SIGNUP_ROLE: Role = "customer";

export const ORDER_TYPES = ["delivery", "pickup"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Staff transition policy. Pickup and delivery deliberately diverge at the
 * handoff; delivery staff may only complete an assigned delivery.
 */
export const ORDER_STATUS_TRANSITIONS: Record<
  OrderType,
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  pickup: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready_for_pickup", "cancelled"],
    ready_for_pickup: ["delivered", "cancelled"],
    out_for_delivery: [],
    delivered: [],
    cancelled: [],
  },
  delivery: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["out_for_delivery", "cancelled"],
    ready_for_pickup: [],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Order received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  pending: "Your order has reached us and is waiting for confirmation.",
  confirmed: "The branch has confirmed your order.",
  preparing: "The kitchen is preparing your order fresh.",
  ready_for_pickup: "Your order is ready to collect at the selected branch.",
  out_for_delivery: "Your order is on its way to the delivery address.",
  delivered: "Your order has been handed over. Enjoy!",
  cancelled: "This order was cancelled. Contact the branch if you need help.",
};

export const PAYMENT_METHODS = [
  "cash_on_delivery",
  "card_on_delivery",
  "online",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Which payment methods are actually usable. Only Cash on Delivery is active
 * for the demo; Online payment is advertised as Coming Soon and must never be
 * treated as a completed payment until a verified provider event confirms it.
 */
export const PAYMENT_METHOD_INFO: Record<
  PaymentMethod,
  { label: string; description: string; available: boolean; comingSoon: boolean }
> = {
  cash_on_delivery: {
    label: "Cash on Delivery",
    description: "Pay the rider in cash when your order arrives (or at pickup).",
    available: true,
    comingSoon: false,
  },
  card_on_delivery: {
    label: "Card on Delivery",
    description: "Card terminals are not available on our fleet yet.",
    available: false,
    comingSoon: true,
  },
  online: {
    label: "Online Payment",
    description: "Pay by card or wallet before delivery.",
    available: false,
    comingSoon: true,
  },
};

/** Payment methods a customer may actually select at checkout. */
export const AVAILABLE_PAYMENT_METHODS: readonly PaymentMethod[] =
  PAYMENT_METHODS.filter((method) => PAYMENT_METHOD_INFO[method].available);

export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

/** Delivery coverage defaults. The live radius comes from DELIVERY_RADIUS_KM. */
export const DELIVERY = {
  defaultRadiusKm: 5,
} as const;

/** Order-shape limits and identifiers (validated on both client and server). */
export const ORDER = {
  maxItems: 50,
  maxLineQuantity: 99,
  noteMaxLength: 300,
  instructionsMaxLength: 300,
  /** Bytes of CSPRNG entropy behind the public tracking identifier. */
  trackingIdBytes: 16,
  orderNumberPrefix: "BSC",
} as const;

/**
 * Payment status transitions. A payment only becomes `paid` through a verified
 * provider event (online) or an explicit staff action (cash collected). The
 * client can never set a payment status.
 */
export const PAYMENT_STATUS_TRANSITIONS: Record<
  PaymentStatus,
  readonly PaymentStatus[]
> = {
  pending: ["paid", "failed"],
  paid: ["refunded"],
  failed: ["pending"],
  refunded: [],
};

export const SESSION_COOKIE_NAME = "authjs.session-token";

/** Authentication policy constants shared by client and server. */
export const AUTH = {
  /** Password policy: length only — no forced character classes. */
  passwordMinLength: 12,
  passwordMaxLength: 128,
  /** JWT session lifetime. Password reset / disable bumps tokenVersion. */
  sessionMaxAgeSeconds: 60 * 60 * 24 * 30,
  /** Email verification link lifetime. */
  verificationTokenTtlSeconds: 60 * 60 * 24,
  /** Password reset link lifetime (short-lived). */
  resetTokenTtlSeconds: 60 * 60,
} as const;
