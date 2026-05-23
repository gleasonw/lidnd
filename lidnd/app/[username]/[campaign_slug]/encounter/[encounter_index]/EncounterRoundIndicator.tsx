"use client";

import { ButtonWithTooltip } from "@/components/ui/tip";
import {
  useEncounter,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { Square } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

export const EncounterDetails = observer(function EncounterDetails() {
  const [encounter] = useEncounter();
  const [now, setNow] = useState(Date.now());
  const { mutate: updateEncounter } = useUpdateEncounter();

  useEffect(() => {
    const intervalTimer = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(intervalTimer);
  });
  switch (encounter.status) {
    case "run": {
      const startTime = encounter.started_at
        ? new Date(encounter.started_at)
        : new Date();
      const elapsedMs = now - startTime.getTime();
      const minutes = Math.floor(elapsedMs / 1000 / 60);
      return (
        <div className="flex w-full gap-5 items-center">
          <span className="whitespace-nowrap font-bold text-2xl">
            Round {encounter.current_round}
          </span>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {minutes === 0 ? "<1" : minutes} min
          </span>
          <ButtonWithTooltip
            text="End encounter"
            variant="secondary"
            size="icon"
            className="h-8 w-8  ml-auto"
            onClick={() =>
              updateEncounter({
                id: encounter.id,
                campaign_id: encounter.campaign_id,
                ended_at: new Date(),
              })
            }
          >
            <Square className="h-4 w-4" />
          </ButtonWithTooltip>
        </div>
      );
    }
  }
});
