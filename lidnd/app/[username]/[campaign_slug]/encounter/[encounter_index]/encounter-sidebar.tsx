"use client";

import { useEncounter } from "@/encounters/[encounter_index]/hooks";

export function EncounterSidebar() {
  const [encounter] = useEncounter();

  if (encounter.status === "run") {
    return null;
  }

  return null;
}
