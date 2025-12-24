"use client";

import { isLocalDebug } from "@/app/[username]/utils";
import type { Creature } from "@/server/api/router";
import { makeAutoObservable } from "mobx";
import { createContext, useContext, useEffect, useMemo } from "react";

type ImageUploadStatus = "idle" | "pending" | "success" | "error";
type CreatureId = string;
/**
 * Manages ui state that is not persisted in db
 */
class EncounterUIStore {
  selectedParticipantId: string | null = null;
  highlightCreatureStatBlocks: Set<CreatureId> = new Set();
  focusGroupId: string | null = null;
  showMoreEncounterButtons = false;

  /** TODO: this is sort of the "this ui is only sometimes important for inputs, so only show it when we toggle this flag" bit of state. should probably find a better way to tuck away secondary inputs/ui */
  isEditingInitiative = false;
  userDismissedReminder = false;
  isDraggingBattleCard = false;
  filterExistingCreaturesByCrBudget = false;
  /**
   * participantId -> ref
   *  */
  battleCardRefs: Map<string, HTMLDivElement> = new Map();
  statBlockRefs: Map<CreatureId, HTMLDivElement> = new Map();

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

  toggleShowMoreEncounterButtons = () => {
    this.showMoreEncounterButtons = !this.showMoreEncounterButtons;
  };

  constructor() {
    makeAutoObservable(this);
    if (isLocalDebug()) {
      (window as any).encounterUiStore = this;
    }
  }

  toggleFocusThisGroup = (groupId: string) => {
    if (this.focusGroupId === groupId) {
      this.focusGroupId = null;
    } else {
      this.focusGroupId = groupId;
    }
  };

  toggleParticipantEdit = () => {
    this.isEditingInitiative = !this.isEditingInitiative;
  };

  registerBattleCardRef = (participantId: string, ref: HTMLDivElement) => {
    this.battleCardRefs.set(participantId, ref);
    return () => {
      this.battleCardRefs.delete(participantId);
    };
  };

  registerStatBlockRef = (
    creatureId: CreatureId,
    ref: HTMLImageElement | null
  ) => {
    if (!ref) {
      this.statBlockRefs.delete(creatureId);
      return;
    }
    this.statBlockRefs.set(creatureId, ref);
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

export const EncounterUIContext = createContext<EncounterUIStore | null>(null);

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
