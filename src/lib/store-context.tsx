"use client";

import { createContext, useContext } from "react";
import type { PublicStore } from "@/lib/stores/resolve-store";

/**
 * The current store, available to every client component under
 * `s/[store]/`. Set once, server-side, by that segment's layout — nothing
 * client-side re-resolves it, so there's no risk of a client component
 * showing a different store than the page it's rendered inside.
 */
const StoreContext = createContext<PublicStore | null>(null);

export function StoreProvider({ store, children }: { store: PublicStore; children: React.ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): PublicStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used within StoreProvider");
  return store;
}
