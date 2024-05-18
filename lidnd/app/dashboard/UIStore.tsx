"use client";

import { makeAutoObservable } from "mobx";
import { createContext, useContext } from "react";

export class UIStore {
  isSideNavOpen = false;

  constructor() {
    makeAutoObservable(this);
  }

  toggleSideNav = () => {
    this.isSideNavOpen = !this.isSideNavOpen;
  };
}

const UIStoreContext = createContext<UIStore | null>(null);

export function useUIStore() {
  const store = useContext(UIStoreContext);
  if (!store) {
    throw new Error("useUIStore must be used within a UIStoreProvider");
  }
  return store;
}

const store = new UIStore();

export function UIStoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <UIStoreContext.Provider value={store}>{children}</UIStoreContext.Provider>
  );
}
