"use client";

import {
  EncounterCreature,
  useEncounterCreatures,
  useEncounter,
  useRemoveCreatureFromEncounter,
  useTurn,
  useAddCreatureToEncounter,
} from "@/app/dashboard/encounters/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontal,
  Plus,
  Swords,
  X,
} from "lucide-react";
import { StatBlock } from "@/app/dashboard/encounters/[id]/run/stat-block";
import { CreatureHealthForm } from "@/app/dashboard/encounters/[id]/run/creature-health-form";
import { CharacterIcon } from "@/app/dashboard/encounters/[id]/character-icon";
import EncounterCreatureAddForm, {
  CustomCreature,
  ExistingCreature,
} from "@/app/dashboard/encounters/[id]/creature-add-form";
import InitiativeInput from "@/app/dashboard/encounters/[id]/InitiativeInput";
import React from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { EncounterTime } from "@/app/dashboard/encounters/[id]/run/encounter-time";
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
  const [dmSelectedCreature, setDmSelectedCreature] = React.useState<number>(
    activeParticipant?.id ?? 0
  );

  const selectedParticipant =
    displayedParticipants?.find(
      (participant) => participant.id === dmSelectedCreature
    ) ?? activeParticipant;

  const { mutate: removeCreatureFromEncounter } =
    useRemoveCreatureFromEncounter();

  function handleChangeTurn(direction: "next" | "previous") {
    const newParticipants = optimisticTurnUpdate(
      direction,
      encounterParticipants
    );
    setDmSelectedCreature(
      newParticipants?.find((creature) => creature.is_active)?.id ?? 0
    );
    changeActiveTo(direction);
  }

  const [addingCreature, setAddingCreature] = React.useState(false);

  const scrollContainer = React.useRef<HTMLDivElement>(null);

  const { mutate: addCreature, isPending: isPendingCreatureAdd } =
    useAddCreatureToEncounter(() => setAddingCreature(false));

  React.useEffect(() => {
    if (scrollContainer.current) {
      const activeElement =
        scrollContainer.current.querySelector("[data-active=true]");
      if (activeElement) {
        scrollContainer.current.scrollTo({
          left:
            activeElement.getBoundingClientRect().left +
            scrollContainer.current.scrollLeft -
            scrollContainer.current.getBoundingClientRect().left,
          behavior: "smooth",
        });
      }
    }
  }, [activeParticipant?.id]);

  return (
    <div className="flex flex-col gap-5 justify-center items-center">
      <div className={"flex gap-3 items-center w-full justify-between"}>
        <EncounterTime time={encounter?.started_at ?? undefined} />
        {!addingCreature && (
          <Button onClick={() => setAddingCreature(true)}>
            <Plus /> Creature{" "}
          </Button>
        )}
      </div>
      <AnimatePresence>
        <div
          className={"flex gap-10 max-w-full items-center overflow-auto h-96"}
          ref={scrollContainer}
        >
          {displayedParticipants
            ?.slice()
            .sort(sortEncounterCreatures)
            .map((participant) => (
              <AnimationListItem key={participant.id}>
                <button onClick={() => setDmSelectedCreature(participant.id)}>
                  <BattleCard
                    creature={participant}
                    className="cursor-pointer hover:bg-gray-100 transition-all"
                    isSelected={participant.id === dmSelectedCreature}
                  />
                </button>
              </AnimationListItem>
            ))}
        </div>
      </AnimatePresence>
      {addingCreature ? (
        <div className={'flex flex-col gap-3'}>
          <Button variant={'ghost'} onClick={() => setAddingCreature(false)}>
            <X /> Close
          </Button>
          <div className={"flex flex-wrap gap-3"}>
            <Card className="w-[600px] p-3">
              <CardContent className={"flex flex-col gap-3"}>
                <CardTitle>New creature</CardTitle>
                <CustomCreature
                  mutation={{
                    onAddCreature: addCreature,
                    isPending: isPendingCreatureAdd,
                  }}
                />
              </CardContent>
            </Card>
            <Card className={"w-[600px] p-3"}>
              <CardContent className={'flex flex-col gap-3'}>
                <CardTitle>Existing creature</CardTitle>
                <ExistingCreature />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
      <TurnButtons
        onLeftClick={() => handleChangeTurn("previous")}
        onRightClick={() => handleChangeTurn("next")}
        isPending={isPending}
      >
        {selectedParticipant && (
          <div className="flex flex-col gap-5">
            <span className={"text-center text-xl"}>
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
  className,
  isSelected,
}: {
  creature: EncounterCreature;
  children?: React.ReactNode;
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
        key={creature.id}
        data-active={creature.is_active}
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
