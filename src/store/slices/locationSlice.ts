import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { OrderType } from "@/lib/constants";
import type {
  BranchDto,
  Coordinates,
  CoverageResult,
  DeliveryAddress,
} from "@/lib/types/location";

/** Status of the browser geolocation lookup (never persisted). */
export type LocationLookupStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "unsupported"
  | "error";

export interface LocationState {
  /** The chosen fulfilment mode; null until the customer picks one. */
  fulfillmentType: OrderType | null;
  selectedBranch: BranchDto | null;
  deliveryAddress: DeliveryAddress | null;
  coordinates: Coordinates | null;
  /** Last server coverage result (transient; revalidated at checkout). */
  coverage: CoverageResult | null;
  lookupStatus: LocationLookupStatus;
  /** True once persisted preferences have been loaded on the client. */
  hydrated: boolean;
}

const initialState: LocationState = {
  fulfillmentType: null,
  selectedBranch: null,
  deliveryAddress: null,
  coordinates: null,
  coverage: null,
  lookupStatus: "idle",
  hydrated: false,
};

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    hydrateLocation(
      state,
      action: PayloadAction<Partial<LocationState> & { hydrated: true }>,
    ) {
      Object.assign(state, action.payload);
    },
    setFulfillmentType(state, action: PayloadAction<OrderType>) {
      state.fulfillmentType = action.payload;
    },
    selectBranch(state, action: PayloadAction<BranchDto | null>) {
      state.selectedBranch = action.payload;
    },
    setDeliveryAddress(state, action: PayloadAction<DeliveryAddress | null>) {
      state.deliveryAddress = action.payload;
      state.coordinates = action.payload?.coordinates ?? null;
    },
    setCoordinates(state, action: PayloadAction<Coordinates | null>) {
      state.coordinates = action.payload;
    },
    setCoverage(state, action: PayloadAction<CoverageResult | null>) {
      state.coverage = action.payload;
    },
    setLookupStatus(state, action: PayloadAction<LocationLookupStatus>) {
      state.lookupStatus = action.payload;
    },
    resetLocation(state) {
      Object.assign(state, initialState, { hydrated: true });
    },
  },
});

export const {
  hydrateLocation,
  setFulfillmentType,
  selectBranch,
  setDeliveryAddress,
  setCoordinates,
  setCoverage,
  setLookupStatus,
  resetLocation,
} = locationSlice.actions;
export default locationSlice.reducer;

// --- Selectors --------------------------------------------------------------
// Structural param type avoids a circular import with the store's RootState.
type LocationSlice = { location: LocationState };

export const selectLocation = (state: LocationSlice): LocationState =>
  state.location;
export const selectFulfillmentType = (state: LocationSlice): OrderType | null =>
  state.location.fulfillmentType;
export const selectSelectedBranch = (state: LocationSlice): BranchDto | null =>
  state.location.selectedBranch;
export const selectDeliveryAddress = (
  state: LocationSlice,
): DeliveryAddress | null => state.location.deliveryAddress;
export const selectCoordinates = (state: LocationSlice): Coordinates | null =>
  state.location.coordinates;
export const selectCoverage = (state: LocationSlice): CoverageResult | null =>
  state.location.coverage;
export const selectLookupStatus = (
  state: LocationSlice,
): LocationLookupStatus => state.location.lookupStatus;

/**
 * A customer may only order once a valid fulfilment choice exists:
 *  - pickup  → an explicit branch
 *  - delivery → a saved address that the server has confirmed is in the zone
 */
export function selectFulfillmentComplete(state: LocationSlice): boolean {
  const { fulfillmentType, selectedBranch, deliveryAddress, coverage } =
    state.location;
  if (fulfillmentType === "pickup") return Boolean(selectedBranch);
  if (fulfillmentType === "delivery") {
    return Boolean(
      deliveryAddress &&
        (deliveryAddress.coordinates ||
          (deliveryAddress.area?.trim() && deliveryAddress.city?.trim())) &&
        coverage?.deliverable === true,
    );
  }
  return false;
}
