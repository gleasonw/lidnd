"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LidndPopover } from "@/encounters/base-popover";
import { ButtonWithTooltip } from "@/components/ui/tip";
import type { ParticipantWithData } from "@/server/api/router";
import { useUpdateEncounterParticipant } from "@/encounters/[encounter_index]/hooks";
import { RemoveCreatureFromEncounterButton } from "@/encounters/[encounter_index]/battle-ui";
import { ParticipantUtils } from "@/utils/participants";

export function ParticipantEditDialog({
  participant,
}: {
  participant: ParticipantWithData;
}) {
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  const [open, setOpen] = useState(false);
  const [maxHpOverride, setMaxHpOverride] = useState("");

  const isMinion = ParticipantUtils.isMinion(participant);

  const trimmedMaxHp = maxHpOverride.trim();
  const maxHpValue = Number(trimmedMaxHp);

  const isMaxHpValid =
    trimmedMaxHp === "" || (!isNaN(maxHpValue) && maxHpValue > 0);

  const canSave = isMaxHpValid;
  const maxHpError = !isMaxHpValid;

  return (
    <LidndPopover
      open={open}
      onOpenChange={setOpen}
      className="w-64"
      trigger={
        <ButtonWithTooltip
          text="Edit participant"
          variant="ghost"
          className="p-2 text-gray-300"
        >
          <MoreHorizontal className="h-4 w-4" />
        </ButtonWithTooltip>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">
            {isMinion ? "Number of minions" : "Max HP override"}
          </label>
          <Input
            type="number"
            value={maxHpOverride}
            placeholder={
              isMinion
                ? ParticipantUtils.numberOfMinions(participant).toString()
                : participant.creature.max_hp.toString()
            }
            onChange={(event) => setMaxHpOverride(event.target.value)}
          />
          {maxHpError ? (
            <span className="text-xs text-red-400">
              Enter a positive number.
            </span>
          ) : null}
        </div>

        <div className="flex w-full">
          <Button
            disabled={!canSave}
            onClick={() => {
              const trimmedMaxHp = maxHpOverride.trim();
              const inputValue = Number(trimmedMaxHp);
              const nextParticipant = { ...participant };

              if (trimmedMaxHp === "") {
                nextParticipant.max_hp_override = null;
                nextParticipant.hp = participant.creature.max_hp;
              } else if (!isNaN(inputValue) && inputValue > 0) {
                if (isMinion) {
                  // For minions, multiply the count by base HP
                  const totalHp = inputValue * participant.creature.max_hp;
                  nextParticipant.max_hp_override = totalHp;
                  nextParticipant.hp = totalHp;
                } else {
                  // For non-minions, use the value directly as HP override
                  nextParticipant.max_hp_override = inputValue;
                  nextParticipant.hp = inputValue;
                }
              }

              updateParticipant(nextParticipant);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </div>
        <RemoveCreatureFromEncounterButton
          moreText="Remove from encounter"
          participant={participant}
        />
      </div>
    </LidndPopover>
  );
}
