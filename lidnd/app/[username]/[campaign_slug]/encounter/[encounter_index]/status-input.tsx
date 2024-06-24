"use client";
import { api } from "@/trpc/react";
import { ParticipantWithData } from "@/server/api/router";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { CommandItem } from "@/components/ui/command";
import React from "react";
import { effectIconMap } from "./effectIconMap";
import { Input } from "@/components/ui/input";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { Combobox } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/resistance-selector";

export function StatusInput({
  participant,
  className,
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

  const [save_ends_dc, setSaveEndsDC] = React.useState<string | undefined>();

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        value={save_ends_dc}
        className="w-24"
        onChange={(e) => {
          setSaveEndsDC(e.target.value ?? "");
        }}
        placeholder="DC"
      />
      <Combobox
        triggerPlaceholder="Status effect"
        emptyResultText="No status effects"
        className="max-h-80 overflow-auto"
      >
        {effects?.map((effect) => (
          <CommandItem key={effect.id}>
            <ButtonWithTooltip
              text={effect.description}
              variant="ghost"
              onClick={() =>
                updateStatus({
                  encounter_participant_id: participant.id,
                  status_effect_id: effect.id,
                  save_ends_dc: (save_ends_dc && parseInt(save_ends_dc)) || 0,
                })
              }
            >
              {effectIconMap[effect.name as keyof typeof effectIconMap]}
              <span>{effect.name}</span>
            </ButtonWithTooltip>
          </CommandItem>
        ))}
      </Combobox>
    </div>
  );
}
