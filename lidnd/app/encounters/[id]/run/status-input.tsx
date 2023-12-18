"use client";
import { Swords } from "lucide-react";
import { api } from "@/trpc/react";
import { EncounterCreature } from "@/server/api/router";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/app/encounters/[id]/resistance-selector";
import { CommandItem } from "@/components/ui/command";
import React from "react";
import { effectIconMap } from "@/app/encounters/[id]/run/effectIconMap";
import { Input } from "@/components/ui/input";

export function StatusInput({
  participant,
  className,
}: {
  participant: EncounterCreature;
  className?: string;
}) {
  const { encounterById } = api.useUtils();
  const { mutate: updateStatus } = api.assignStatusEffect.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(participant.encounter_id);
    },
    onMutate: async (newStatusEffect) => {
      await encounterById.cancel(participant.encounter_id);
      const previousEncounter = encounterById.getData(participant.encounter_id);
      encounterById.setData(participant.encounter_id, (old) => {
        if (!old) return old;
        return {
          ...old,
          participants: old.participants.map((participant) => {
            if (participant.id === newStatusEffect.encounter_participant_id) {
              return {
                ...participant,
                status_effects: [
                  ...participant.status_effects,
                  {
                    ...newStatusEffect,
                    created_at: new Date(),
                    id: Math.random().toString(),
                    duration: newStatusEffect.duration ?? null,
                    save_ends_dc: newStatusEffect.save_ends_dc ?? 0,
                    description: newStatusEffect.description ?? "",
                    name: newStatusEffect.name ?? "",
                  },
                ],
              };
            }
            return participant;
          }),
        };
      });
      return previousEncounter;
    },
  });
  const effects = api.statusEffects.useQuery().data;

  const [save_ends_dc, setSaveEndsDC] = React.useState("0");

  return (
    <div className={className}>
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
                  save_ends_dc: parseInt(save_ends_dc) || 0,
                  name: effect.name,
                  description: effect.description,
                })
              }
            >
              {effectIconMap[effect.name as keyof typeof effectIconMap]}
              <span>{effect.name}</span>
            </ButtonWithTooltip>
          </CommandItem>
        ))}
      </Combobox>
      <label className="text-sm flex gap-2 items-center">
        Save ends DC
        <Input
          type="number"
          value={save_ends_dc}
          onChange={(e) => {
            setSaveEndsDC(e.target.value);
          }}
          placeholder="Initiative"
        />
      </label>
    </div>
  );
}
