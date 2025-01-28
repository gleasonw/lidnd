"use client";

import { useEncounter } from "@/encounters/[encounter_index]/hooks";

export function EncounterRoundIndicator() {
  const [encounter] = useEncounter();
  switch (encounter.status) {
    case "prep":
      return null;
    case "run":
      return (
        <div className="flex gap-2 text-xl font-semibold items-center">
          Round {encounter.current_round}
        </div>
      );
    default: {
      const _: never = encounter.status;
      throw new Error(`Unhandled case: ${encounter.status}`);
    }
  }
}
