"use client";

import { EditModeOpponentForm } from "@/app/[username]/[campaign_slug]/EditModeOpponentForm";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { ImageAssetAddButton } from "@/encounters/[encounter_index]/battle-ui";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import {
  useEncounter,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { AngryIcon, ListOrdered, Square } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

export const EncounterTools = observer(function EncounterTools() {
  const uiStore = useEncounterUIStore();

  return (
    <div className="flex min-w-0 items-center gap-1 rounded-md bg-white">
      <ButtonWithTooltip
        variant="ghost"
        size="icon"
        className=" text-gray-500"
        text="Edit initiative and columns"
        onClick={() => uiStore.toggleParticipantEdit()}
      >
        <ListOrdered />
      </ButtonWithTooltip>
      <div className="text-gray-500">
        <ImageAssetAddButton />
      </div>
      <LidndDialog
        trigger={
          <ButtonWithTooltip
            text="Add adversary"
            variant="ghost"
            className="text-gray-500"
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

          <EncounterTools />
        </div>
      );
    }
  }
});
