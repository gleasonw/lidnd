"use client";

import {
  EncounterCreature,
  useEncounterCreatures,
  useEncounter,
  useRemoveCreatureFromEncounter,
  useTurn,
} from "@/app/dashboard/encounters/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontal,
  Swords,
  X,
} from "lucide-react";
import { StatBlock } from "@/app/dashboard/encounters/[id]/run/stat-block";
import { CreatureHealthForm } from "@/app/dashboard/encounters/[id]/run/creature-health-form";
import { CharacterIcon } from "@/app/dashboard/encounters/[id]/character-icon";
import EncounterCreatureAddForm from "@/app/dashboard/encounters/[id]/creature-add-form";
import InitiativeInput from "@/app/dashboard/encounters/[id]/InitiativeInput";
import React from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { EncounterTime } from "@/app/dashboard/encounters/[id]/run/encounter-time";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  optimisticTurnUpdate,
  sortEncounterCreatures,
} from "@/app/dashboard/encounters/utils";
import { Spinner } from "@/components/ui/spinner";

export function BattleUI() {
  const { data: encounter } = useEncounter();
  const { data: encounterParticipants } = useEncounterCreatures();
  const { mutate: changeActiveTo, isPending, variables } = useTurn();

  const displayedParticipants = isPending
    ? optimisticTurnUpdate(variables, encounterParticipants)
    : encounterParticipants;

  const activeParticipant = displayedParticipants?.find(
    (creature) => creature.is_active
  );

  return (
    <div className="flex flex-col gap-5 justify-center items-center relative">
      <div
        className={
          "flex absolute top-0 left-0 gap-3 items-center w-full justify-between"
        }
      >
        <EncounterTime time={encounter?.started_at ?? undefined} />
        <Popover>
          <PopoverTrigger>
            <Button variant="outline">Creature +</Button>
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-10 w-[600px]">
            <EncounterCreatureAddForm />
          </PopoverContent>
        </Popover>
      </div>
      {displayedParticipants && (
        <ParticipantsUI
          key={activeParticipant?.id}
          participants={displayedParticipants}
          onChangeTurn={(direction) => changeActiveTo(direction)}
          isTurnPending={isPending}
        />
      )}
    </div>
  );
}

function ParticipantsUI({
  participants,
  onChangeTurn,
  isTurnPending,
}: {
  participants: EncounterCreature[];
  onChangeTurn: (direction: "next" | "previous") => void;
  isTurnPending?: boolean;
}) {
  const activeParticipant = participants?.find(
    (creature) => creature.is_active
  );
  const [dmSelectedCreature, setDmSelectedCreature] = React.useState<number>(
    activeParticipant?.id ?? 0
  );

  const selectedParticipant =
    participants?.find(
      (participant) => participant.id === dmSelectedCreature
    ) ?? activeParticipant;

  const { mutate: removeCreatureFromEncounter } =
    useRemoveCreatureFromEncounter();
  return (
    <>
      <AnimatePresence>
        <div className={"flex gap-10 overflow-auto p-5 max-w-full pt-14"}>
          {participants
            ?.slice()
            .sort(sortEncounterCreatures)
            .map((participant) => (
              <AnimationListItem key={participant.id}>
                <BattleCard
                  onClick={() => setDmSelectedCreature(participant.id)}
                  creature={participant}
                  className="cursor-pointer hover:bg-gray-100 transition-all"
                  isSelected={participant.id === dmSelectedCreature}
                />
              </AnimationListItem>
            ))}
        </div>
      </AnimatePresence>
      <TurnButtons
        onLeftClick={() => onChangeTurn("previous")}
        onRightClick={() => onChangeTurn("next")}
        isPending={isTurnPending}
      >
        {selectedParticipant && (
          <div className="flex flex-col gap-2">
            <span className={'text-center text-xl'}>
              {selectedParticipant.name}{" "}
            </span>
            <CreatureHealthForm creature={selectedParticipant} />
            {selectedParticipant.hp > 0 ? (
              <InitiativeInput
                creature={selectedParticipant}
                className="flex gap-5"
              />
            ) : null}
          </div>
        )}
      </TurnButtons>
      {selectedParticipant && (
        <>
          <StatBlock
            id={selectedParticipant.creature_id}
            name={selectedParticipant.name}
            key={selectedParticipant.creature_id}
          />
          <Button
            variant="destructive"
            onClick={() =>
              removeCreatureFromEncounter(selectedParticipant.creature_id)
            }
          >
            Remove from encounter
          </Button>
        </>
      )}
    </>
  );
}

function TurnButtons({
  children,
  onLeftClick,
  onRightClick,
  isPending,
}: {
  children?: React.ReactNode;
  onLeftClick: () => void;
  onRightClick: () => void;
  isPending?: boolean;
}) {
  return (
    <div className="flex w-full justify-between">
      <Button
        className="w-20"
        disabled={isPending}
        onClick={(e) => {
          e.stopPropagation();
          onLeftClick();
        }}
      >
        <ChevronLeftIcon />
      </Button>
      {children}
      <Button
        disabled={isPending}
        className="w-20"
        onClick={(e) => {
          e.stopPropagation();
          onRightClick();
        }}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

export function BattleCard({
  creature,
  children,
  onClick,
  className,
  isSelected,
}: {
  creature: EncounterCreature;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  isSelected?: boolean;
}) {
  function getCreaturePercentDamage(creature: EncounterCreature) {
    let missingHp = creature.max_hp - creature.hp;
    missingHp = Math.min(missingHp, creature.max_hp);
    return (missingHp / creature.max_hp) * 100;
  }

  return (
    <div
      key={creature.id}
      className={`flex relative flex-col gap-6 items-center w-40 justify-between`}
    >
      <Card
        onClick={onClick}
        key={creature.id}
        data-selected={isSelected}
        className={`relative select-none ${className} h-56 justify-evenly w-40 gap-0 items-center flex flex-col transition-all ${
          creature.is_active ? "transform scale-110" : ""
        } ${isSelected ? `outline-4 outline` : ""}`}
      >
        {creature.is_active ? (
          <Swords className="absolute -top-9 z-10" />
        ) : null}
        <div
          style={{ height: `${getCreaturePercentDamage(creature)}%` }}
          className={`absolute rounded bottom-0 left-0 w-full ${
            getCreaturePercentDamage(creature) === 100
              ? "bg-gray-500"
              : "bg-red-500"
          } bg-opacity-50 transition-all`}
        />
        <CardHeader className="text-ellipsis max-w-full p-3">
          <CardTitle>{creature.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {creature.creature_id === 1 ? (
            <Spinner />
          ) : (
            <CharacterIcon
              className="w-20"
              id={creature.creature_id}
              name={creature.name}
            />
          )}
        </CardContent>
      </Card>
      {children}
    </div>
  );
}

export const AnimationListItem = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isPresent = useIsPresent();
  const animations = {
    style: {
      position: isPresent ? "static" : "absolute",
    },
  } as const;
  return (
    <motion.div {...animations} layout>
      {children}
    </motion.div>
  );
};
