"use client";

import { EditModeOpponentForm } from "@/app/[username]/[campaign_slug]/EditModeOpponentForm";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { EqualizeColumnsButton } from "@/encounters/[encounter_index]/battle-ui";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import {
  useEncounter,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { Edit, ListOrdered, AngryIcon, StopCircle } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

interface EncounterDetailsProps {
  showActions?: boolean;
}

export const EncounterRunTools = observer(function EncounterRunTools() {
  const [encounter] = useEncounter();
  const uiStore = useEncounterUIStore();
  const { mutate: updateEncounter } = useUpdateEncounter();

  if (encounter.status !== "run") {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1 rounded-md border bg-white p-1">
      <ButtonWithTooltip
        text="End encounter"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-gray-500"
        onClick={() =>
          updateEncounter({
            id: encounter.id,
            campaign_id: encounter.campaign_id,
            ended_at: new Date(),
          })
        }
      >
        <StopCircle />
      </ButtonWithTooltip>
      <ButtonWithTooltip
        text="Switch to prep mode"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-gray-500"
        onClick={() =>
          updateEncounter({
            status: "prep",
            id: encounter.id,
            campaign_id: encounter.campaign_id,
            started_at: null,
          })
        }
      >
        <Edit />
      </ButtonWithTooltip>
      <ButtonWithTooltip
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-gray-500"
        text="Edit initiative and columns"
        onClick={() => uiStore.toggleParticipantEdit()}
      >
        <ListOrdered />
      </ButtonWithTooltip>
      <EqualizeColumnsButton
        size="icon"
        className="h-8 w-8 text-gray-500 p-0"
      />
      <LidndDialog
        trigger={
          <ButtonWithTooltip
            className="h-8 w-8 text-gray-500"
            text="Add Opponent"
            variant="ghost"
            size="icon"
          >
            <AngryIcon />
          </ButtonWithTooltip>
        }
        content={<EditModeOpponentForm />}
        title="Add Opponent"
      />
    </div>
  );
});

export const EncounterDetails = observer(function EncounterDetails({
  showActions = true,
}: EncounterDetailsProps) {
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
        <div className="flex w-full min-w-0 flex-col gap-2">
          <div className="flex min-w-0 items-baseline gap-3">
            <span className="whitespace-nowrap font-bold text-2xl">
              Round {encounter.current_round}
            </span>
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {minutes === 0 ? "<1" : minutes} min
            </span>
          </div>
          {showActions ? <EncounterRunTools /> : null}
        </div>
      );
    }
    default: {
      // @ts-expect-error - exhaustive check
      const _: never = encounter.status;
      throw new Error(`Unhandled case: ${encounter.status}`);
    }
  }
});
