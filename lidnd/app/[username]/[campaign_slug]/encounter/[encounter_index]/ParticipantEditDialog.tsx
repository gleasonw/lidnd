"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LidndPopover } from "@/encounters/base-popover";
import { ButtonWithTooltip } from "@/components/ui/tip";
import type { ParticipantWithData } from "@/server/api/router";
import { useUpdateEncounterParticipant } from "@/encounters/[encounter_index]/hooks";

export function ParticipantEditDialog({
  participant,
}: {
  participant: ParticipantWithData;
}) {
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  const [open, setOpen] = useState(false);
  const [maxHpOverride, setMaxHpOverride] = useState("");

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
          <Pencil className="h-4 w-4" />
        </ButtonWithTooltip>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Max HP override</label>
          <Input
            type="number"
            value={maxHpOverride}
            placeholder={participant.creature.max_hp.toString()}
            onChange={(event) => setMaxHpOverride(event.target.value)}
          />
          {maxHpError ? (
            <span className="text-xs text-red-400">
              Enter a positive number.
            </span>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => {
              const trimmedMaxHp = maxHpOverride.trim();
              const maxHpValue = Number(trimmedMaxHp);
              const nextParticipant = { ...participant };

              if (trimmedMaxHp === "") {
                nextParticipant.max_hp_override = null;
                nextParticipant.hp = participant.creature.max_hp;
              } else if (!isNaN(maxHpValue) && maxHpValue > 0) {
                nextParticipant.max_hp_override = maxHpValue;
                nextParticipant.hp = maxHpValue;
              }

              updateParticipant(nextParticipant);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </LidndPopover>
  );
}
