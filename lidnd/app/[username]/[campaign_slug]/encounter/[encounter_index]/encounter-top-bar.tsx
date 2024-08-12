"use client";
import { appRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { LidndPlusDialog } from "@/components/ui/lidnd_dialog";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { ButtonWithTooltip, Tip } from "@/components/ui/tip";
import { HealthMeterOverlay } from "@/encounters/[encounter_index]/battle-ui";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { EncounterTime } from "@/encounters/[encounter_index]/encounter-time";
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
import { ChevronLeftIcon, ChevronRightIcon, Share } from "lucide-react";
import { observer } from "mobx-react-lite";
import { usePathname } from "next/navigation";
import React from "react";

export const EncounterTopBar = observer(function EncounterTopBar() {
  const url = usePathname();
  const status = url.split("/").at(-1);

  if (status !== "run") {
    return null;
  }

  return <BattleTopBar />;
});

function BattleTopBar() {
  const [encounter] = useEncounter();
  const [isEditingInitiative, setIsEditingInitiative] = React.useState(false);

  const { setSelectedParticipantId } = useEncounterUIStore();

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

  const roundText =
    encounter?.current_round === 0
      ? "Surprise round"
      : `Round ${encounter?.current_round}`;

  const isTurnLoading = isLoadingNextTurn || isLoadingPreviousTurn;
  return (
    <div className="flex w-full flex-col gap-5 items-center">
      <div className="flex gap-10 justify-center w-full items-center">
        <Button
          className="mr-auto w-48 shadow-lg"
          variant="outline"
          onClick={cyclePrevious}
          disabled={isTurnLoading}
        >
          <ChevronLeftIcon />
          Previous turn
        </Button>
        <h1 className="text-xl">{roundText}</h1>
        <EncounterTime time={encounter.started_at ?? undefined} />
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
        <Button
          variant="outline"
          onClick={() => setIsEditingInitiative(!isEditingInitiative)}
        >
          Edit initiative
        </Button>
        <Button
          className="ml-auto w-48 shadow-lg"
          onClick={cycleNext}
          disabled={isTurnLoading}
        >
          Next turn
          <ChevronRightIcon />
        </Button>
      </div>
      <ParticipantIcons isEditingInitiative={isEditingInitiative} />
    </div>
  );
}

function ParticipantIcons({
  isEditingInitiative,
}: {
  isEditingInitiative: boolean;
}) {
  const [encounter] = useEncounter();
  const activeIndex = EncounterUtils.activeParticipantIndex(encounter);

  return (
    <div className={`flex gap-1 flex-grow  h-auto min-h-[132px]`}>
      {EncounterUtils.participants(encounter).map((p, index) => (
        <div className="flex gap-2 flex-col relative" key={p.id}>
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
      <LidndPlusDialog text="Add monster">
        <ParticipantUpload />
      </LidndPlusDialog>
    </div>
  );
}

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
    <div className="relative cursor-pointer">
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
              <Button className="flex gap-4 px-0" variant="ghost">
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
