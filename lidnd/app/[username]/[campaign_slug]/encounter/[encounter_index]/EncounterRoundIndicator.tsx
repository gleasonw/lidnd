"use client";

import { EditModeOpponentForm } from "@/app/[username]/[campaign_slug]/EditModeOpponentForm";
import { Button } from "@/components/ui/button";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { EqualizeColumnsButton } from "@/encounters/[encounter_index]/battle-ui";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import {
  useEncounter,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { LidndPopover } from "@/encounters/base-popover";
import {
  Edit,
  ListOrdered,
  AngryIcon,
  MoreHorizontalIcon,
  StopCircle,
} from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

export const EncounterDetails = observer(function EncounterDetails() {
  const [encounter] = useEncounter();
  const [now, setNow] = useState(Date.now());
  const uiStore = useEncounterUIStore();

  const { mutate: updateEncounter } = useUpdateEncounter();

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
        <div className="flex gap-2">
          <span className="whitespace-nowrap font-bold text-xl">
            Round {encounter.current_round}
          </span>
          <LidndPopover
            className="w-full"
            trigger={
              <Button
                variant="ghost"
                className="opacity-25"
                onClick={() => uiStore.toggleShowMoreEncounterButtons()}
              >
                <MoreHorizontalIcon />
              </Button>
            }
          >
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 text-sm text-gray-500">
                Duration: {minutes === 0 ? "<1" : minutes} min
              </div>
              <ButtonWithTooltip
                text="End encounter"
                variant="ghost"
                className="flex text-gray-400 p-2"
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
                className="flex text-gray-400 p-2"
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
                className="flex text-gray-400 p-2"
                text="Edit initiative and columns"
                onClick={() => uiStore.toggleParticipantEdit()}
              >
                <ListOrdered />
              </ButtonWithTooltip>
              <EqualizeColumnsButton />
              <LidndDialog
                trigger={
                  <ButtonWithTooltip
                    className="p-2 text-gray-400"
                    text="Add Opponent"
                    variant="ghost"
                  >
                    <AngryIcon />
                  </ButtonWithTooltip>
                }
                content={<EditModeOpponentForm />}
                title="Add Opponent"
              />
            </div>
          </LidndPopover>
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
