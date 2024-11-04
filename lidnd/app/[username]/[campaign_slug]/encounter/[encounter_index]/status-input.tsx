"use client";
import { api } from "@/trpc/react";
import type { ParticipantWithData, StatusEffect } from "@/server/api/router";
import { ButtonWithTooltip } from "@/components/ui/tip";
import {
  Command,
  CommandItem,
  CommandEmpty,
  CommandGroup,
  CommandInput,
} from "@/components/ui/command";
import React from "react";
import { effectColorMap, effectIconMap } from "./effectIconMap";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { ChevronDown, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function StatusInput({
  participant,
}: {
  participant: ParticipantWithData;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {participant.status_effects?.length ? (
            <Plus />
          ) : (
            <>
              Status effect <Plus />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 flex justify-between gap-5">
        <StatusForm participant={participant} />
      </PopoverContent>
    </Popover>
  );
}

export function StatusForm({
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
  const [statusDropdownOpen, setStatusDropdownOpen] = React.useState(false);

  return (
    <>
      <Popover open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={statusDropdownOpen}
            className="w-40 flex items-start"
          >
            <span>
              {effects?.find((e) => e.id === selectedStatus)?.name ?? "Effect"}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="max-h-80 overflow-hidden">
          <Command className="w-full">
            <CommandInput placeholder={"Search..."} />
            <CommandEmpty>No status effects</CommandEmpty>
            <CommandGroup>
              {effects?.map((effect) => (
                <CommandItem
                  key={effect.id}
                  className="flex justify-between hover:cursor-pointer"
                  onSelect={() => setSelectedStatus(effect.id)}
                >
                  <span>{effect.name}</span>
                  <EffectIcon effect={effect} />
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <LidndTextInput
        type="number"
        variant="ghost"
        value={save_ends_dc}
        onChange={(e) => {
          setSaveEndsDC(e.target.value ?? "");
        }}
        placeholder="DC"
        className="w-16"
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
    </>
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
