"use client";
import { appRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { ButtonWithTooltip, Tip } from "@/components/ui/tip";
import { HealthMeterOverlay } from "@/encounters/[encounter_index]/battle-ui";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import {
  useCycleNextTurn,
  useCyclePreviousTurn,
  useEncounter,
  useRemoveStatusEffect,
} from "@/encounters/[encounter_index]/hooks";
import InitiativeInput from "@/encounters/[encounter_index]/InitiativeInput";
import { ParticipantUpload } from "@/encounters/[encounter_index]/participant-add-form";
import {
  EffectIcon,
  StatusInput,
} from "@/encounters/[encounter_index]/status-input";
import { LidndPopover } from "@/encounters/base-popover";
import type { ParticipantWithData } from "@/server/api/router";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantEffectUtils } from "@/utils/participantEffects";
import { ParticipantUtils } from "@/utils/participants";
import { PopoverTrigger } from "@radix-ui/react-popover";
import clsx from "clsx";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Plus,
  Share,
  UserIcon,
} from "lucide-react";
import { observer } from "mobx-react-lite";
import React from "react";

export const EncounterTopBar = observer(function EncounterTopBar() {
  return <BattleTopBar />;
});

function BattleTopBar() {
  const [encounter] = useEncounter();

  const { toggleEditingColSpan, toggleEditingInitiative } =
    useEncounterUIStore();
  const roundText =
    encounter?.current_round === 0
      ? "Surprise round"
      : `Round ${encounter?.current_round}`;

  if (encounter.status !== "run") {
    return <h1 className="text-3xl font-bold text-center">{encounter.name}</h1>;
  }

  return (
    <div className="flex flex-col items-center relative p-5 pt-0">
      <div className="flex gap-10 justify-center w-full items-center">
        <h1 className="text-2xl font-bold whitespace-nowrap">{roundText}</h1>
        <ButtonWithTooltip
          onClick={() => {
            navigator.clipboard.writeText(
              `${window.location.origin}${appRoutes.observe(encounter.id)}`,
            );
          }}
          className="flex gap-2 items-center"
          variant="ghost"
          text={"Get sharable link"}
        >
          <Share />
        </ButtonWithTooltip>
        <Button variant="outline" onClick={toggleEditingInitiative}>
          Edit initiative
        </Button>
        <Button variant="ghost" onClick={() => toggleEditingColSpan()}>
          Edit block col span
        </Button>
      </div>
    </div>
  );
}

export const InitiativeTracker = observer(function ParticipantIcons() {
  const { setSelectedParticipantId, isEditingInitiative } =
    useEncounterUIStore();
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
      className={`flex flex-grow-0 h-20 z-10 justify-center absolute w-full mx-auto bottom-0 translate-y-full`}
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
        title={"Add creature"}
        trigger={
          <ButtonWithTooltip
            variant="ghost"
            text="Add creature"
            className="flex flex-col items-center gap-2 w-20 h-20"
          >
            <UserIcon />
            <Plus />
          </ButtonWithTooltip>
        }
        content={<ParticipantUpload />}
      />
      <ButtonWithTooltip
        className="h-full shadow-lg"
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
  const { mutate: removeStatusEffect } = useRemoveStatusEffect();
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

      <div className="flex flex-col">
        {participant.status_effects?.map((se) => (
          <LidndPopover
            key={se.id}
            className="flex flex-col gap-5 items-center"
            trigger={
              <Button className="flex gap-4 px-0 bg-white" variant="ghost">
                <span className="mr-auto flex gap-2 items-center">
                  <EffectIcon effect={se.effect} />
                  {ParticipantEffectUtils.name(se)}
                </span>
                {!!se.save_ends_dc && <span>({se.save_ends_dc})</span>}
              </Button>
            }
          >
            {ParticipantEffectUtils.description(se)}
            <Button
              onClick={() => removeStatusEffect(se)}
              variant="ghost"
              className="text-red-500"
            >
              Remove
            </Button>
          </LidndPopover>
        ))}
      </div>
    </div>
  );
}
