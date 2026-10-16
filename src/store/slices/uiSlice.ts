import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface UiState {
  cartOpen: boolean;
  /** Explicitly opened by the customer (e.g. the header location control). */
  locationModalOpen: boolean;
  /** Set when the customer dismisses the first-visit prompt this session. */
  locationModalDismissed: boolean;
}

const initialState: UiState = {
  cartOpen: false,
  locationModalOpen: false,
  locationModalDismissed: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openCart(state) {
      state.cartOpen = true;
    },
    closeCart(state) {
      state.cartOpen = false;
    },
    setCartOpen(state, action: PayloadAction<boolean>) {
      state.cartOpen = action.payload;
    },
    openLocationModal(state) {
      state.locationModalOpen = true;
      state.locationModalDismissed = false;
    },
    closeLocationModal(state) {
      state.locationModalOpen = false;
      state.locationModalDismissed = true;
    },
    setLocationModalOpen(state, action: PayloadAction<boolean>) {
      state.locationModalOpen = action.payload;
      if (action.payload) state.locationModalDismissed = false;
    },
    resetLocationModal(state) {
      state.locationModalOpen = false;
      state.locationModalDismissed = false;
    },
  },
});

export const {
  openCart,
  closeCart,
  setCartOpen,
  openLocationModal,
  closeLocationModal,
  setLocationModalOpen,
  resetLocationModal,
} = uiSlice.actions;
export default uiSlice.reducer;
