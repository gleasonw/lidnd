"use client";
import { api } from "@/trpc/react";
import type { ParticipantWithData, StatusEffect } from "@/server/api/router";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { CommandItem } from "@/components/ui/command";
import React from "react";
import { effectColorMap, effectIconMap } from "./effectIconMap";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { Combobox } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/resistance-selector";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { Plus } from "lucide-react";

export function StatusInput({
  participant,
}: {
  participant: ParticipantWithData;
  className?: string;
}) {
  const { encounterById } = api.useUtils();
  const effects = api.statusEffects.useQuery().data;
  const { mutate: updateStatus } = api.assignStatusEffect.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(participant.encounter_id);
    },
    onMutate: async (newStatusEffect) => {
      await encounterById.cancel(participant.encounter_id);
      const previousEncounter = encounterById.getData(participant.encounter_id);
      encounterById.setData(participant.encounter_id, (old) => {
        if (!old) return old;
        const effectToAdd = effects?.find(
          (effect) => effect.id === newStatusEffect.status_effect_id,
        );

        if (!previousEncounter) {
          throw new Error("No previous encounter found");
        }

        if (!effectToAdd) {
          throw new Error("No effect found");
        }
        return EncounterUtils.updateParticipant(
          ParticipantUtils.addStatusEffect(participant, {
            ...newStatusEffect,
            created_at: new Date(),
            id: Math.random().toString(),
            duration: newStatusEffect.duration ?? null,
            save_ends_dc: newStatusEffect.save_ends_dc ?? 0,
            effect: effectToAdd,
          }),
          previousEncounter,
        );
      });
    },
  });

  const [save_ends_dc, setSaveEndsDC] = React.useState<string>("");
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(
    null,
  );

  return (
    <div className="flex w-72 whitespace-nowrap">
      <Combobox
        emptyResultText="No status effects"
        className="max-h-80 overflow-auto whitespace-nowrap border-none outline-none"
        triggerPlaceholder={
          effects?.find((e) => e.id === selectedStatus)?.name ?? "Status"
        }
      >
        {effects?.map((effect) => (
          <CommandItem
            key={effect.id}
            className="w-32 flex justify-between"
            onSelect={() => setSelectedStatus(effect.id)}
          >
            <ButtonWithTooltip text={"Add effect"} variant="ghost">
              <EffectIcon effect={effect} />
              <span>{effect.name}</span>
            </ButtonWithTooltip>
          </CommandItem>
        ))}
      </Combobox>
      <LidndTextInput
        type="number"
        variant="ghost"
        value={save_ends_dc}
        onChange={(e) => {
          setSaveEndsDC(e.target.value ?? "");
        }}
        placeholder="DC"
        className="w-16 ml-2"
      />
      <ButtonWithTooltip
        variant="ghost"
        text={"Apply status effect"}
        onClick={() =>
          selectedStatus
            ? updateStatus({
                encounter_participant_id: participant.id,
                status_effect_id: selectedStatus,
                save_ends_dc: isNaN(parseInt(save_ends_dc ?? ""))
                  ? 0
                  : parseInt(save_ends_dc ?? ""),
              })
            : null
        }
      >
        <Plus />
      </ButtonWithTooltip>
    </div>
  );
}

export function EffectIcon({ effect }: { effect: StatusEffect }) {
  return (
    <div
      className={`h-10 w-10 flex justify-center items-center text-${effectColorMap[effect.name as keyof typeof effectIconMap]}-500`}
    >
      {effectIconMap[effect.name as keyof typeof effectIconMap]}
    </div>
  );
}
