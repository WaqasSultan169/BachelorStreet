"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { MotionConfig } from "motion/react";
import {
  store,
  loadCartLines,
  saveCartLines,
  loadLocationPreferences,
  saveLocationPreferences,
} from "@/store";
import { hydrateCart } from "@/store/slices/cartSlice";
import { hydrateLocation } from "@/store/slices/locationSlice";
import { Toaster } from "@/components/ui/toaster";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { FulfillmentModal } from "@/components/location/fulfillment-modal";

function PersistenceSync() {
  useEffect(() => {
    store.dispatch(hydrateCart(loadCartLines()));
    store.dispatch(
      hydrateLocation({ ...loadLocationPreferences(), hydrated: true }),
    );

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      saveCartLines(state.cart.lines);
      saveLocationPreferences(state.location);
    });

    return unsubscribe;
  }, []);

  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <MotionConfig reducedMotion="user">
        <PersistenceSync />
        {children}
        <CartDrawer />
        <FulfillmentModal />
        <Toaster />
      </MotionConfig>
    </Provider>
  );
}
