"use client";

import { useEncounter } from "@/encounters/[encounter_index]/hooks";
import { useEffect, useState } from "react";

export function EncounterDetails() {
  const [encounter] = useEncounter();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const intervalTimer = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(intervalTimer);
  });
  switch (encounter.status) {
    case "prep":
      return (
        <>
          <span className="font-bold">{encounter.name}</span>
        </>
      );
    case "run": {
      const startTime = encounter.started_at
        ? new Date(encounter.started_at)
        : new Date();
      const elapsedMs = now - startTime.getTime();
      const minutes = Math.floor(elapsedMs / 1000 / 60);
      return (
        <div className="flex items-baseline gap-3">
          <span className="whitespace-nowrap font-bold text-lg">
            Round {encounter.current_round}
          </span>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {minutes === 0 ? "now" : `${minutes} minutes`}
          </span>
        </div>
      );
    }
    default: {
      // @ts-expect-error - exhaustive check
      const _: never = encounter.status;
      throw new Error(`Unhandled case: ${encounter.status}`);
    }
  }
}
