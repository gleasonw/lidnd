"use client";
import { Button } from "@/components/ui/button";
import React, { useEffect } from "react";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { BattleCard } from "./battle-ui";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils as PU } from "@/utils/participants";
import { CreatureStatBlockImage } from "@/encounters/original-size-image";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { useRemoveParticipantFromEncounter } from "@/encounters/[encounter_index]/hooks";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { observer } from "mobx-react-lite";

export const LinearBattleUI = observer(function LinearBattleUI() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  const { setSelectedParticipantId, selectedParticipantId } =
    useEncounterUIStore();

  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();

  const dmCreatures = EncounterUtils.participants(encounter)
    .filter((p) => !PU.isPlayer(p))
    .sort((a, b) => PU.statBlockAspectRatio(a) - PU.statBlockAspectRatio(b));

  useEffect(() => {
    if (selectedParticipantId) {
      const selectedParticipant = document.querySelector(
        `[data-is-selected="true"]`,
      );
      if (selectedParticipant) {
        selectedParticipant.scrollIntoView({
          behavior: "smooth",
        });
      }
    }
  }, [selectedParticipantId]);

  useEffect(() => {
    const active = EncounterUtils.activeParticipant(encounter);
    if (active) {
      const activeElement = document.querySelector(`[data-is-active="true"]`);
      if (!activeElement) {
        return;
      }
      activeElement.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [encounter]);

  return (
    <div className="grid grid-cols-1  md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {dmCreatures.map((participant) => (
        <BattleCard
          onClick={() => setSelectedParticipantId(participant.id)}
          participant={participant}
          className={clsx("relative", {
            "col-span-1": PU.statBlockAspectRatio(participant) < 0.6,
            "col-span-2": PU.statBlockAspectRatio(participant) >= 0.6,
          })}
          data-is-active={participant.is_active}
          data-is-selected={selectedParticipantId === participant.id}
          key={participant.id}
          battleCardExtraContent={
            <>
              <CreatureStatBlockImage creature={participant.creature} />
              <Button
                variant="destructive"
                onClick={() =>
                  removeCreatureFromEncounter({
                    encounter_id: id,
                    participant_id: participant.id,
                  })
                }
              >
                Remove from encounter
              </Button>
            </>
          }
        />
      ))}
    </div>
  );
});
