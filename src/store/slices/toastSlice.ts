import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

export interface ToastState {
  toasts: Toast[];
}

const initialState: ToastState = { toasts: [] };

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts = [...state.toasts.slice(-3), action.payload];
      },
      prepare(input: ToastInput) {
        return {
          payload: {
            id: makeId(),
            title: input.title,
            description: input.description,
            variant: input.variant ?? "info",
            duration: input.duration ?? 3500,
          } satisfies Toast,
        };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { pushToast, dismissToast } = toastSlice.actions;
export default toastSlice.reducer;

export function selectToasts(state: { toast: ToastState }): Toast[] {
  return state.toast.toasts;
}
