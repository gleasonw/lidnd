"use client";

import { makeAutoObservable } from "mobx";
import { createContext, useContext, useEffect, useMemo } from "react";

/**
 * Manages simple ui state
 */
class EncounterUIStore {
  selectedParticipantId: string | null = null;
  isEditingInitiative: boolean = false;
  /**
   * participantId -> ref
   *  */
  battleCardRefs: Map<string, HTMLDivElement> = new Map();

  constructor() {
    makeAutoObservable(this);
  }

  toggleEditingInitiative = () => {
    this.isEditingInitiative = !this.isEditingInitiative;
  };

  registerBattleCardRef = (participantId: string, ref: HTMLDivElement) => {
    this.battleCardRefs.set(participantId, ref);
    return () => {
      this.battleCardRefs.delete(participantId);
    };
  };

  scrollToParticipant = (id: string) => {
    const refForId = this.battleCardRefs.get(id);
    if (refForId) {
      refForId.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  setSelectedParticipantId = (id: string) => {
    this.selectedParticipantId = id;
    this.scrollToParticipant(id);
  };

  dispose() {
    this.battleCardRefs.clear();
  }
}

const EncounterUIContext = createContext<EncounterUIStore | null>(null);

export function useEncounterUIStore() {
  const store = useContext(EncounterUIContext);
  if (!store) {
    throw new Error(
      "useEncounterUIStore must be used within a EncounterUIProvider",
    );
  }
  return store;
}

export function EncounterUI({ children }: { children: React.ReactNode }) {
  const encounterUiStore = useMemo(() => new EncounterUIStore(), []);

  useEffect(() => {
    return () => {
      encounterUiStore.dispose();
    };
  }, [encounterUiStore]);

  return (
    <EncounterUIContext.Provider value={encounterUiStore}>
      {children}
    </EncounterUIContext.Provider>
  );
}
