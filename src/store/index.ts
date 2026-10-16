import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "@/store/slices/cartSlice";
import locationReducer, {
  type LocationState,
} from "@/store/slices/locationSlice";
import uiReducer from "@/store/slices/uiSlice";
import toastReducer from "@/store/slices/toastSlice";
import { safeParseJson } from "@/lib/utils";
import { isValidCoordinates } from "@/lib/geo";
import { ORDER_TYPES, type OrderType } from "@/lib/constants";
import type { CartLine } from "@/lib/types/cart";
import type { BranchDto, DeliveryAddress } from "@/lib/types/location";

const CART_STORAGE_KEY = "bsc-cart";
const LOCATION_STORAGE_KEY = "bsc-location";

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    location: locationReducer,
    ui: uiReducer,
    toast: toastReducer,
  },
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// --- Cart persistence -------------------------------------------------------
const isCartLine = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { productId?: unknown }).productId === "string";

/** Read persisted cart lines from localStorage. Client-only. */
export function loadCartLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  const raw = safeParseJson<unknown>(window.localStorage.getItem(CART_STORAGE_KEY));
  return Array.isArray(raw) ? raw.filter(isCartLine) : [];
}

/** Persist cart lines. Client-only; safe to call during transitions. */
export function saveCartLines(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // storage unavailable (private mode / quota) — cart simply stays in memory
  }
}

// --- Location preferences ---------------------------------------------------
// Only non-sensitive fulfilment preferences are persisted. No tokens,
// passwords or session data ever touch localStorage or the Redux tree.
type PersistedLocation = {
  fulfillmentType: OrderType | null;
  selectedBranch: BranchDto | null;
  deliveryAddress: DeliveryAddress | null;
  coordinates: { lat: number; lng: number } | null;
};

function isOrderType(value: unknown): value is OrderType {
  return typeof value === "string" && (ORDER_TYPES as readonly string[]).includes(value);
}

function parseBranch(value: unknown): BranchDto | null {
  if (typeof value !== "object" || value === null) return null;
  const branch = value as Partial<BranchDto>;
  if (typeof branch.id !== "string" || typeof branch.name !== "string") return null;
  return {
    id: branch.id,
    name: branch.name,
    slug: typeof branch.slug === "string" ? branch.slug : "",
    address: typeof branch.address === "string" ? branch.address : "",
    phone: typeof branch.phone === "string" ? branch.phone : undefined,
    city: typeof branch.city === "string" ? branch.city : "",
    coordinates: isValidCoordinates(branch.coordinates) ? branch.coordinates : undefined,
    hours: [],
    isOpenNow: typeof branch.isOpenNow === "boolean" ? branch.isOpenNow : null,
    todayHours: typeof branch.todayHours === "string" ? branch.todayHours : undefined,
    mapsUrl: typeof branch.mapsUrl === "string" ? branch.mapsUrl : undefined,
    deliveryAvailable: true,
    pickupAvailable: true,
  };
}

function parseAddress(value: unknown): DeliveryAddress | null {
  if (typeof value !== "object" || value === null) return null;
  const address = value as Partial<DeliveryAddress>;
  if (typeof address.label !== "string") return null;
  if (
    address.coordinates !== undefined &&
    !isValidCoordinates(address.coordinates)
  ) {
    return null;
  }
  return {
    label: address.label,
    street: typeof address.street === "string" ? address.street : undefined,
    area: typeof address.area === "string" ? address.area : undefined,
    city: typeof address.city === "string" ? address.city : undefined,
    phone: typeof address.phone === "string" ? address.phone : undefined,
    instructions:
      typeof address.instructions === "string" ? address.instructions : undefined,
    coordinates: isValidCoordinates(address.coordinates)
      ? address.coordinates
      : undefined,
  };
}

/** Read the persisted fulfilment preferences. Client-only; shape-validated. */
export function loadLocationPreferences(): Partial<PersistedLocation> {
  if (typeof window === "undefined") return {};
  const raw = safeParseJson<Record<string, unknown>>(
    window.localStorage.getItem(LOCATION_STORAGE_KEY),
  );
  if (!raw) return {};
  return {
    fulfillmentType: isOrderType(raw.fulfillmentType) ? raw.fulfillmentType : null,
    selectedBranch: parseBranch(raw.selectedBranch),
    deliveryAddress: parseAddress(raw.deliveryAddress),
    coordinates: isValidCoordinates(raw.coordinates) ? raw.coordinates : null,
  };
}

/** Persist the safe subset of the location slice. Client-only. */
export function saveLocationPreferences(location: LocationState): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedLocation = {
      fulfillmentType: location.fulfillmentType,
      selectedBranch: location.selectedBranch,
      deliveryAddress: location.deliveryAddress,
      coordinates: location.coordinates,
    };
    window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // storage unavailable — preferences simply stay in memory
  }
}
