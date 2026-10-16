import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CartLine } from "@/lib/types/cart";
import { lineSignature } from "@/lib/cart";

export interface CartState {
  lines: CartLine[];
  /** Set when a cart operation fails (e.g. persistence issues). */
  error: string | null;
}

const initialState: CartState = {
  lines: [],
  error: null,
};

function mergeLine(lines: CartLine[], incoming: CartLine): CartLine[] {
  const existing = lines.find((line) => line.lineId === incoming.lineId);
  if (existing) {
    return lines.map((line) =>
      line.lineId === incoming.lineId
        ? { ...line, quantity: Math.min(99, line.quantity + incoming.quantity) }
        : line,
    );
  }
  return [...lines, incoming];
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    hydrateCart(state, action: PayloadAction<CartLine[]>) {
      state.lines = Array.isArray(action.payload) ? action.payload : [];
      state.error = null;
    },
    addItem(state, action: PayloadAction<CartLine>) {
      state.lines = mergeLine(state.lines, action.payload);
      state.error = null;
    },
    setQuantity(
      state,
      action: PayloadAction<{ lineId: string; quantity: number }>,
    ) {
      const { lineId, quantity } = action.payload;
      const next = Math.min(99, Math.max(0, Math.floor(quantity)));
      state.lines = state.lines
        .map((line) => (line.lineId === lineId ? { ...line, quantity: next } : line))
        .filter((line) => line.quantity > 0);
    },
    increment(state, action: PayloadAction<{ lineId: string }>) {
      const line = state.lines.find((item) => item.lineId === action.payload.lineId);
      if (line) line.quantity = Math.min(99, line.quantity + 1);
    },
    decrement(state, action: PayloadAction<{ lineId: string }>) {
      state.lines = state.lines
        .map((line) =>
          line.lineId === action.payload.lineId
            ? { ...line, quantity: Math.max(0, line.quantity - 1) }
            : line,
        )
        .filter((line) => line.quantity > 0);
    },
    removeItem(state, action: PayloadAction<{ lineId: string }>) {
      state.lines = state.lines.filter(
        (line) => line.lineId !== action.payload.lineId,
      );
    },
    setNote(state, action: PayloadAction<{ lineId: string; note: string }>) {
      const trimmed = action.payload.note.trim();
      state.lines = state.lines.map((line) =>
        line.lineId === action.payload.lineId
          ? { ...line, note: trimmed ? trimmed : undefined }
          : line,
      );
    },
    clearCart(state) {
      state.lines = [];
      state.error = null;
    },
    setCartError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
  },
});

export const {
  hydrateCart,
  addItem,
  setQuantity,
  increment,
  decrement,
  removeItem,
  setNote,
  clearCart,
  setCartError,
} = cartSlice.actions;
export default cartSlice.reducer;

export function selectItemCount(state: { cart: CartState }): number {
  return state.cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function selectSubtotal(state: { cart: CartState }): number {
  return state.cart.lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
}

/** Total quantity across all lines that reference a product (any options). */
export function selectQuantityForProduct(
  state: { cart: CartState },
  productId: string,
): number {
  return state.cart.lines
    .filter((line) => line.productId === productId)
    .reduce((sum, line) => sum + line.quantity, 0);
}

export function selectLineForSignature(
  state: { cart: CartState },
  options: { productId: string; optionKeys: string[]; note?: string },
): CartLine | undefined {
  const signature = lineSignature(
    options.productId,
    options.optionKeys.map((optionKey) => ({
      groupKey: "",
      groupName: "",
      optionKey,
      optionName: "",
      priceDelta: 0,
    })),
    options.note,
  );
  return state.cart.lines.find((line) => line.lineId === signature);
}
