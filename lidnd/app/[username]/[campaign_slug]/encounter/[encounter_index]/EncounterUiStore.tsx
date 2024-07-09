"use client";

import { Reminder } from "@/app/[username]/types";
import { EncounterWithData } from "@/server/encounters";
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

  constructor() {
    makeAutoObservable(this);
  }

  setSelectedParticipantId = (id: string) => {
    this.selectedParticipantId = id;
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
