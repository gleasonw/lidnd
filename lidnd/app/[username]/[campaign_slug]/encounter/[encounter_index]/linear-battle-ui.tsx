"use client";
import React, { useEffect } from "react";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { BattleCard } from "./battle-ui";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils as PU } from "@/utils/participants";
import { CreatureStatBlockImage } from "@/encounters/original-size-image";
import { useEncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { useUpdateCreature } from "@/encounters/[encounter_index]/hooks";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { observer } from "mobx-react-lite";
import { Input } from "@/components/ui/input";

function onSelectParticipant(id: string) {
  const selectedCardElement = document.querySelector(
    `[data-participant-id="${id}"]`,
  );
  if (selectedCardElement) {
    selectedCardElement.scrollIntoView({
      behavior: "instant",
    });
  }
}

export const LinearBattleUI = observer(function LinearBattleUI() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  const {
    subscribeToSelectedParticipant,
    unsubscribeToSelectedParticipant,
    editingColSpan,
  } = useEncounterUIStore();

  const { mutate: updateCreature } = useUpdateCreature();

  const dmCreatures = EncounterUtils.participants(encounter)
    .filter((p) => !PU.isPlayer(p))
    .sort((a, b) => PU.statBlockAspectRatio(a) - PU.statBlockAspectRatio(b));

  useEffect(() => {
    // not sure this is the best way to apply a callback from a click on a distant element.
    // is more explicit about what the user wants, though.
    subscribeToSelectedParticipant(onSelectParticipant);
    return () => {
      unsubscribeToSelectedParticipant(onSelectParticipant);
    };
  }, []);
  const active = EncounterUtils.activeParticipant(encounter);

  useEffect(() => {
    if (active) {
      const activeElement = document.querySelector(`[data-is-active="true"]`);
      if (!activeElement) {
        return;
      }
      activeElement.scrollIntoView({
        behavior: "instant",
      });
    }
  }, [active]);

  return (
    <div className="grid grid-cols-2">
      {dmCreatures.map((participant) => (
        <BattleCard
          participant={participant}
          data-is-active={participant.is_active}
          data-participant-id={participant.id}
          key={participant.id}
          battleCardExtraContent={
            <>
              {editingColSpan && (
                <Input
                  type="number"
                  min={1}
                  max={2}
                  value={PU.colSpan(participant)}
                  onChange={(e) => {
                    const parsedInt = parseInt(e.target.value);
                    if (isNaN(parsedInt)) {
                      return;
                    }
                    updateCreature({
                      ...participant.creature,
                      col_span: parsedInt,
                    });
                  }}
                />
              )}
              <CreatureStatBlockImage creature={participant.creature} />
            </>
          }
        />
      ))}
    </div>
  );
});
