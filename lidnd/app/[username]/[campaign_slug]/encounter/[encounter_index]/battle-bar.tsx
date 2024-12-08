"use client";
import { Button } from "@/components/ui/button";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { ButtonWithTooltip, Tip } from "@/components/ui/tip";
import { Toggle } from "@/components/ui/toggle";
import { HealthMeterOverlay } from "@/encounters/[encounter_index]/battle-ui";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import {
  useCycleNextTurn,
  useCyclePreviousTurn,
  useEncounter,
  useRemoveStatusEffect,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import InitiativeInput from "@/encounters/[encounter_index]/InitiativeInput";
import { MonsterUpload } from "@/encounters/[encounter_index]/participant-add-form";
import {
  EffectIcon,
  StatusInput,
} from "@/encounters/[encounter_index]/status-input";
import type { ParticipantWithData } from "@/server/api/router";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { PopoverTrigger } from "@radix-ui/react-popover";
import clsx from "clsx";
import {
  BookOpen,
  ChevronLeftIcon,
  ChevronRightIcon,
  ColumnsIcon,
  ListOrdered,
  UserPlus,
} from "lucide-react";
import { observer } from "mobx-react-lite";
import React from "react";

export function ToggleEditingMode() {
  const [encounter] = useEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();
  return (
    <Toggle
      onClick={(e) =>
        updateEncounter({
          ...encounter,
          is_editing_columns: !encounter?.is_editing_columns,
        })
      }
    >
      {encounter?.is_editing_columns ? (
        <Tip text={"Current view: editing columns"}>
          <ColumnsIcon />
        </Tip>
      ) : (
        <Tip text={"Current view: run encounter (no column edit)"}>
          <BookOpen />
        </Tip>
      )}
    </Toggle>
  );
}

export const InitiativeTracker = observer(function ParticipantIcons() {
  const {
    setSelectedParticipantId,
    isEditingInitiative,
    toggleEditingInitiative,
  } = useEncounterUIStore();
  const { mutate: cycleNextMutation, isPending: isLoadingNextTurn } =
    useCycleNextTurn();
  const { mutate: cyclePreviousMutation, isPending: isLoadingPreviousTurn } =
    useCyclePreviousTurn();

  function cycleNext() {
    cycleNextMutation({ encounter_id: encounter.id });
    const { newlyActiveParticipant } = EncounterUtils.cycleNextTurn(encounter);
    setSelectedParticipantId(newlyActiveParticipant.id);
  }

  function cyclePrevious() {
    cyclePreviousMutation({ encounter_id: encounter.id });
    const { newlyActiveParticipant } =
      EncounterUtils.cyclePreviousTurn(encounter);
    setSelectedParticipantId(newlyActiveParticipant.id);
  }

  const isTurnLoading = isLoadingNextTurn || isLoadingPreviousTurn;

  const [encounter] = useEncounter();
  const activeIndex = EncounterUtils.activeParticipantIndex(encounter);

  if (encounter.status !== "run") {
    return null;
  }

  return (
    <div
      className={`flex flex-grow-0 h-20 z-20 gap-2 justify-center w-full mx-auto bottom-0`}
    >
      <ButtonWithTooltip
        className="h-full shadow-lg"
        variant="outline"
        onClick={cyclePrevious}
        disabled={isTurnLoading}
        text="Previous turn"
      >
        <ChevronLeftIcon />
      </ButtonWithTooltip>
      {EncounterUtils.participants(encounter).map((p, index) => (
        <div
          className="flex gap-2 flex-col relative flex-grow-0 max-h-fit"
          key={p.id}
        >
          {ParticipantUtils.isPlayer(p) ? (
            <PlayerCard
              participant={p}
              index={index}
              activeIndex={activeIndex}
            />
          ) : (
            <GMCreatureCard
              participant={p}
              index={index}
              activeIndex={activeIndex}
            />
          )}
          {isEditingInitiative ? <InitiativeInput participant={p} /> : null}
        </div>
      ))}
      <LidndDialog
        title={"Add Monster"}
        trigger={
          <ButtonWithTooltip
            variant="ghost"
            text="Add creature"
            className="flex bg-white flex-col items-center gap-2 self-stretch h-full"
          >
            <UserPlus />
          </ButtonWithTooltip>
        }
        content={<MonsterUpload encounter={encounter} />}
      />
      <ButtonWithTooltip
        variant="ghost"
        className="self-stretch h-full flex"
        text="Edit initiative"
        onClick={() => toggleEditingInitiative()}
      >
        <ListOrdered />
      </ButtonWithTooltip>
      <ButtonWithTooltip
        className="h-full shadow-lg flex items-center"
        onClick={cycleNext}
        disabled={isTurnLoading}
        text="Next turn"
      >
        <ChevronRightIcon />
      </ButtonWithTooltip>
    </div>
  );
});

type CardProps = {
  children?: React.ReactNode;
  index: number;
  activeIndex: number;
  participant: ParticipantWithData;
  overrideIcon?: React.ReactNode;
};

function GMCreatureCard(props: CardProps) {
  const { setSelectedParticipantId } = useEncounterUIStore();
  return (
    <div onClick={() => setSelectedParticipantId(props.participant.id)}>
      <TopBarParticipantCard {...props}>
        <HealthMeterOverlay participant={props.participant} />
      </TopBarParticipantCard>
    </div>
  );
}

function PlayerCard(props: CardProps) {
  const { mutate: removeStatusEffect } = useRemoveStatusEffect();
  return (
    <TopBarParticipantCard
      {...props}
      overrideIcon={
        <Popover>
          <PopoverTrigger className="max-h-full overflow-hidden h-20">
            <CreatureIcon
              creature={props.participant.creature}
              size="small2"
              objectFit="contain"
            />
          </PopoverTrigger>
          <PopoverContent>
            <StatusInput participant={props.participant} />
            <div className="flex flex-wrap gap-2">
              {props.participant.status_effects.map((s) => {
                return (
                  <Button
                    onClick={() => removeStatusEffect(s)}
                    variant="ghost"
                    key={s.id}
                    className="text-red-500"
                  >
                    <EffectIcon effect={s.effect} />
                    {s.effect.name}
                  </Button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      }
    />
  );
}

function TopBarParticipantCard({
  participant,
  index,
  activeIndex,
  children,
  overrideIcon,
}: CardProps) {
  return (
    <div className="relative cursor-pointer shadow-md bg-white">
      <Tip text={ParticipantUtils.name(participant)}>
        <div
          className={clsx(
            "w-auto border-4 flex justify-center items-center transition-all h-20 max-w-xs",
            participant.is_active && "h-32",
            index < activeIndex
              ? "opacity-60 hover:opacity-100"
              : "hover:opacity-60",
          )}
          style={{ borderColor: ParticipantUtils.iconHexColor(participant) }}
        >
          {children}
          {overrideIcon ?? (
            <CreatureIcon
              creature={participant.creature}
              size="small2"
              objectFit="contain"
            />
          )}
        </div>
      </Tip>
    </div>
  );
}
