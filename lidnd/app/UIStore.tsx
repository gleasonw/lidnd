"use client";

import type { Creature } from "@/server/api/router";
import { makeAutoObservable, ObservableMap } from "mobx";
import { createContext, useContext, useEffect, useMemo } from "react";

type ImageUploadStatus = "idle" | "pending" | "success" | "error";

/**
 * Manages simple ui state
 */
export class UIStore {
  private imageUploadStatusForCreatureId: Map<
    string,
    { statBlock?: ImageUploadStatus; icon?: ImageUploadStatus }
  > = new ObservableMap();

  setUploadStatusForCreature = (
    c: Creature,
    info: { status: ImageUploadStatus; type: "statBlock" | "icon" }
  ) => {
    switch (info.type) {
      case "statBlock":
        this.imageUploadStatusForCreatureId.set(`${c.id}-statBlock`, {
          statBlock: info.status,
        });
        break;
      case "icon":
        this.imageUploadStatusForCreatureId.set(`${c.id}--icon`, {
          icon: info.status,
        });
        break;
    }
  };

  /**icon width included only for tagging purposes */
  getStatBlockUploadStatus = (c: { id: string; icon_width: number }) => {
    return this.imageUploadStatusForCreatureId.get(`${c.id}-statBlock`)
      ?.statBlock;
  };

  getIconUploadStatus = (c: { id: string; icon_width: number }) => {
    return this.imageUploadStatusForCreatureId.get(`${c.id}--icon`)?.icon;
  };

  constructor() {
    makeAutoObservable(this);
  }

  dispose() {}
}

const UIStoreContext = createContext<UIStore | null>(null);

/** global ui store. use judiciously */
export function useUIStore() {
  const store = useContext(UIStoreContext);
  if (!store) {
    throw new Error(
      "useEncounterUIStore must be used within a EncounterUIProvider"
    );
  }
  return store;
}

export function GlobalUI({ children }: { children: React.ReactNode }) {
  const encounterUiStore = useMemo(() => new UIStore(), []);

  useEffect(() => {
    window["globalUiStore"] = encounterUiStore;
    return () => {
      encounterUiStore.dispose();
    };
  }, [encounterUiStore]);

  return (
    <UIStoreContext.Provider value={encounterUiStore}>
      {children}
    </UIStoreContext.Provider>
  );
}

declare global {
  interface Window {
    globalUiStore: UIStore;
  }
}
