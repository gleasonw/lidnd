"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LidndPopover } from "@/encounters/base-popover";
import { ButtonWithTooltip } from "@/components/ui/tip";
import type { ParticipantWithData } from "@/server/api/router";
import { ParticipantUtils } from "@/utils/participants";
import { useUpdateEncounterParticipant } from "@/encounters/[encounter_index]/hooks";

export function ParticipantEditDialog({
  participant,
}: {
  participant: ParticipantWithData;
}) {
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  const [open, setOpen] = useState(false);
  const [maxHpOverride, setMaxHpOverride] = useState("");
  const [minionCount, setMinionCount] = useState("");
  const isMinion = ParticipantUtils.isMinion(participant);

  useEffect(() => {
    if (!open) {
      return;
    }
    setMaxHpOverride(participant.max_hp_override?.toString() ?? "");
    setMinionCount(participant.minion_count?.toString() ?? "");
  }, [open, participant]);

  const { canSave, maxHpError, minionError } = useMemo(() => {
    const trimmedMaxHp = maxHpOverride.trim();
    const trimmedMinionCount = minionCount.trim();
    const maxHpValue = Number(trimmedMaxHp);
    const minionValue = Number(trimmedMinionCount);

    const isMaxHpValid =
      trimmedMaxHp === "" || (!isNaN(maxHpValue) && maxHpValue > 0);
    const isMinionValid =
      !isMinion ||
      trimmedMinionCount === "" ||
      (!isNaN(minionValue) && minionValue > 0);

    return {
      canSave: isMaxHpValid && isMinionValid,
      maxHpError: !isMaxHpValid,
      minionError: !isMinionValid,
    };
  }, [isMinion, maxHpOverride, minionCount]);

  return (
    <LidndPopover
      open={open}
      onOpenChange={setOpen}
      className="w-64 bg-gray-900 text-gray-200 border border-gray-700"
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
            <span className="text-xs text-red-400">Enter a positive number.</span>
          ) : null}
        </div>
        {isMinion ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Minion count</label>
            <Input
              type="number"
              value={minionCount}
              placeholder="1"
              onChange={(event) => setMinionCount(event.target.value)}
            />
            {minionError ? (
              <span className="text-xs text-red-400">
                Enter a positive number.
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => {
              const trimmedMaxHp = maxHpOverride.trim();
              const trimmedMinionCount = minionCount.trim();
              const maxHpValue = Number(trimmedMaxHp);
              const minionValue = Number(trimmedMinionCount);
              const nextParticipant = { ...participant };

              if (trimmedMaxHp === "") {
                nextParticipant.max_hp_override = null;
                nextParticipant.hp = participant.creature.max_hp;
              } else if (!isNaN(maxHpValue) && maxHpValue > 0) {
                nextParticipant.max_hp_override = maxHpValue;
                nextParticipant.hp = maxHpValue;
              }

              if (
                isMinion &&
                trimmedMinionCount !== "" &&
                !isNaN(minionValue) &&
                minionValue > 0
              ) {
                nextParticipant.minion_count = minionValue;
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
