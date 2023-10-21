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
import { optimisticTurnUpdate } from "@/app/dashboard/encounters/utils";

export function BattleUI() {
  const { data: encounterParticipants } = useEncounterCreatures();
  const { data: encounter } = useEncounter();
  const { mutate: changeActiveTo, isPending, variables } = useTurn();

  const [addingCreature, setAddingCreature] = React.useState(false);

  const displayedParticipants = isPending
    ? optimisticTurnUpdate(variables, encounterParticipants)
    : encounterParticipants;

  const activeParticipant = displayedParticipants?.find(
    (creature) => creature.is_active
  );

  const statBlock = activeParticipant?.id ? (
    <StatBlock
      id={activeParticipant.creature_id}
      name={activeParticipant.name}
      key={activeParticipant.id}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-5 justify-center items-center relative">
      <div className={"flex absolute top-0 left-0 gap-3 items-center"}>
        <EncounterTime time={encounter?.started_at ?? undefined} />
      </div>
      {!addingCreature ? (
        <Button
          variant="outline"
          className={
            "justify-self-center self-center absolute top-0 right-0 z-10"
          }
          onClick={() => setAddingCreature(true)}
        >
          Creature +
        </Button>
      ) : null}
      <AnimatePresence>
        <div className="flex gap-5">
          <div
            className={"flex gap-10 overflow-auto justify-center w-full p-5"}
          >
            {displayedParticipants
              ?.sort((a, b) => a.initiative - b.initiative)
              .map((participant) => (
                <AnimationListItem key={participant.id}>
                  <BattleCard creature={participant}>
                    <CreatureHealthForm creature={participant} />
                  </BattleCard>
                </AnimationListItem>
              ))}
          </div>

          {addingCreature ? (
            <AnimationListItem key={"add-form"}>
              <Card className={`max-w-sm p-5 w-full h-full`}>
                <EncounterCreatureAddForm>
                  <Button
                    variant={"ghost"}
                    onClick={() => setAddingCreature(false)}
                  >
                    Cancel
                  </Button>
                </EncounterCreatureAddForm>
              </Card>
            </AnimationListItem>
          ) : null}
        </div>
      </AnimatePresence>

      <TurnButtons
        onLeftClick={() => changeActiveTo("previous")}
        onRightClick={() => changeActiveTo("next")}
        isPending={isPending}
      >
        <div className={"hidden md:flex"}>{statBlock}</div>
      </TurnButtons>
      <div className="md:hidden">{statBlock}</div>
    </div>
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
    <div className="flex justify-between w-full p-4">
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
}: {
  creature: EncounterCreature;
  children?: React.ReactNode;
}) {
  function getCreaturePercentDamage(creature: EncounterCreature) {
    let missingHp = creature.max_hp - creature.hp;
    missingHp = Math.min(missingHp, creature.max_hp);
    return (missingHp / creature.max_hp) * 100;
  }

  const { mutate: removeCreatureFromEncounter } =
    useRemoveCreatureFromEncounter();

  return (
    <div
      key={creature.id}
      className={`flex relative flex-col gap-6 items-center w-40 justify-between }`}
    >
      <Card
        key={creature.id}
        className={`relative h-60 flex flex-col ${
          creature.is_active
            ? `outline-4 outline transform scale-110 transition-all select-none`
            : ""
        }`}
      >
        <div
          style={{ height: `${getCreaturePercentDamage(creature)}%` }}
          className={`absolute rounded bottom-0 left-0 w-full ${
            getCreaturePercentDamage(creature) === 100
              ? "bg-gray-500"
              : "bg-red-500"
          } bg-opacity-50 transition-all`}
        />
        <Popover>
          <PopoverTrigger className="ml-auto">
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-10">
            {creature.hp > 0 ? (
              <InitiativeInput creature={creature} className="flex gap-5" />
            ) : null}
            <Button
              variant="destructive"
              onClick={() => removeCreatureFromEncounter(creature.creature_id)}
            >
              Remove from encounter
            </Button>
          </PopoverContent>
        </Popover>

        <CardHeader>
          <CardTitle>{creature.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CharacterIcon id={creature.creature_id} name={creature.name} />
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
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 },
  } as const;
  return (
    <motion.div {...animations} layout>
      {children}
    </motion.div>
  );
};
