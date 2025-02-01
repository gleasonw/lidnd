"use client";

import type { Creature } from "@/server/api/router";
import { makeAutoObservable } from "mobx";
import { createContext, useContext, useEffect, useMemo } from "react";

type ImageUploadStatus = "idle" | "pending" | "success" | "error";

/**
 * Manages simple ui state
 */
class EncounterUIStore {
  selectedParticipantId: string | null = null;
  isEditingInitiative = false;
  userDismissedReminder = false;
  isDraggingBattleCard = false;
  filterExistingCreaturesByCrBudget = false;
  /**
   * participantId -> ref
   *  */
  battleCardRefs: Map<string, HTMLDivElement> = new Map();

  private imageUploadStatusForCreatureId: Map<
    string,
    { statBlock?: ImageUploadStatus; icon?: ImageUploadStatus }
  > = new Map();

  setUploadStatusForCreature = (
    c: Creature,
    info: { status: ImageUploadStatus; type: "statBlock" | "icon" }
  ) => {
    switch (info.type) {
      case "statBlock":
        this.imageUploadStatusForCreatureId.set(c.id, {
          statBlock: info.status,
        });
        break;
      case "icon":
        this.imageUploadStatusForCreatureId.set(c.id, { icon: info.status });
        break;
    }
  };

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
      this.selectedParticipantId = id;
    }
  };

  startDraggingBattleCard = () => {
    this.isDraggingBattleCard = true;
  };

  stopDraggingBattleCard = () => {
    this.isDraggingBattleCard = false;
  };

  setReminderViewed = () => {
    this.userDismissedReminder = true;
  };

  resetViewedState = () => {
    this.userDismissedReminder = false;
  };

  setSelectedParticipantId = (id: string) => {
    this.selectedParticipantId = id;
    this.scrollToParticipant(id);
  };

  toggleFilterCreaturesByCrBudget = () => {
    this.filterExistingCreaturesByCrBudget =
      !this.filterExistingCreaturesByCrBudget;
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
      "useEncounterUIStore must be used within a EncounterUIProvider"
    );
  }
  return store;
}

export function EncounterUI({ children }: { children: React.ReactNode }) {
  const encounterUiStore = useMemo(() => new EncounterUIStore(), []);

  useEffect(() => {
    window["uiStore"] = encounterUiStore;
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

declare global {
  interface Window {
    uiStore: EncounterUIStore;
  }
}
