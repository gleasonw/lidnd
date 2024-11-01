"use client";

import type { Reminder } from "@/app/[username]/types";
import type { EncounterWithData } from "@/server/encounters";
import { EncounterUtils } from "@/utils/encounters";
import { makeAutoObservable } from "mobx";
import { createContext, useContext } from "react";

/**
 * Manages ui state like dialogs, etc. I'm curious to see how this scales. A bit spooky to
 * persist reminders outside react query.
 */
class EncounterUIStore {
  selectedParticipantId: string | null = null;
  remindersToDisplay: Reminder[] = [];
  isEditingInitiative: boolean = false;

  onSelectParticipant: ((id: string) => void)[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  toggleEditingInitiative = () => {
    this.isEditingInitiative = !this.isEditingInitiative;
  };

  subscribeToSelectedParticipant = (cb: (id: string) => void) => {
    if (this.onSelectParticipant.includes(cb)) {
      return;
    }
    this.onSelectParticipant.push(cb);
  };

  unsubscribeToSelectedParticipant = (cb: (id: string) => void) => {
    this.onSelectParticipant = this.onSelectParticipant.filter((c) => c !== cb);
  };

  setSelectedParticipantId = (id: string) => {
    this.selectedParticipantId = id;
    this.onSelectParticipant.forEach((cb) => cb(id));
  };

  displayReminders = (encounter: EncounterWithData) => {
    const remindersToTrigger = EncounterUtils.postRoundReminders(encounter);

    if (remindersToTrigger && remindersToTrigger.length > 0) {
      this.remindersToDisplay = remindersToTrigger;
    } else {
      this.remindersToDisplay = [];
    }
  };

  hideReminders = () => {
    this.remindersToDisplay = [];
  };

  get shouldShowReminders() {
    return this.remindersToDisplay.length > 0;
  }
}

const encounterUIStore = new EncounterUIStore();
const EncounterUIContext = createContext<EncounterUIStore | null>(null);

export function useEncounterUIStore() {
  const store = useContext(EncounterUIContext);
  if (!store) {
    throw new Error("useBattleUIStore must be used within a BattleUIProvider");
  }
  return store;
}

export function EncounterUI({ children }: { children: React.ReactNode }) {
  return (
    <EncounterUIContext.Provider value={encounterUIStore}>
      {children}
    </EncounterUIContext.Provider>
  );
}
