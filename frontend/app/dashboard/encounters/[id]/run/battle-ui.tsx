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
  Plus,
  Swords,
  X,
} from "lucide-react";
import { StatBlock } from "@/app/dashboard/encounters/[id]/run/stat-block";
import { CreatureHealthForm } from "@/app/dashboard/encounters/[id]/run/creature-health-form";
import { CharacterIcon } from "@/app/dashboard/encounters/[id]/character-icon";
import {
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
import clsx from "clsx";

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
  const [dmSelectedCreature, setDmSelectedCreature] = React.useState<
    number | null
  >(activeParticipant?.id ?? null);

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

  const selectedId = dmSelectedCreature ?? activeParticipant?.id;

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
          className={
            "flex gap-10 px-10 max-w-full items-center overflow-auto h-80"
          }
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
                    isSelected={participant.id === selectedId}
                  />
                </button>
              </AnimationListItem>
            ))}
        </div>
      </AnimatePresence>
      {addingCreature ? (
        <div className={"flex flex-col w-full items-center gap-3"}>
          <Button variant={"ghost"} onClick={() => setAddingCreature(false)}>
            <X /> Close
          </Button>
          <div className={"flex flex-wrap gap-3 w-full justify-center"}>
            <Card className={"w-full max-w-[600px]"}>
              <CardContent className={"flex flex-col gap-3 pt-5"}>
                <CardTitle>New creature</CardTitle>
                <CustomCreature
                  mutation={{
                    onAddCreature: addCreature,
                    isPending: isPendingCreatureAdd,
                  }}
                />
              </CardContent>
            </Card>
            <Card className={"w-full max-w-[600px]"}>
              <CardContent className={"flex flex-col gap-3 pt-5"}>
                <CardTitle>Existing creature</CardTitle>
                <ExistingCreature />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
      <div />
      <div className="flex w-full justify-between items-center gap-2">
        <Button
          size="lg"
          disabled={isPending}
          onClick={(e) => {
            e.stopPropagation();
            handleChangeTurn("previous");
          }}
        >
          <ChevronLeftIcon />
        </Button>
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
                key={selectedParticipant.id}
              />
            ) : null}
          </div>
        )}
        <Button
          disabled={isPending}
          size="lg"
          onClick={(e) => {
            e.stopPropagation();
            handleChangeTurn("next");
          }}
        >
          <ChevronRightIcon />
        </Button>
      </div>
      {selectedParticipant && (
        <>
          <StatBlock
            id={selectedParticipant.creature_id}
            name={selectedParticipant.name}
            key={selectedParticipant.creature_id}
          />
          <Button
            variant="destructive"
            onClick={() => removeCreatureFromEncounter(selectedParticipant.id)}
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
  let missingHp = creature.max_hp - creature.hp;
  missingHp = Math.min(missingHp, creature.max_hp);
  const creaturePercentDamage = (missingHp / creature.max_hp) * 100;
  console.log(isSelected);

  return (
    <div
      key={creature.id}
      className={`flex relative flex-col gap-6 items-center w-40 justify-between`}
    >
      <Swords
        className={clsx({
          "opacity-0": !creature.is_active,
          "opacity-100": creature.is_active,
        })}
      />
      <Card
        key={creature.id}
        data-active={creature.is_active}
        className={clsx(
          "relative select-none h-56 justify-between overflow-hidden pt-3 w-40 gap-0 items-center flex flex-col transition-all",
          className,
          {
            "transform scale-110": creature.is_active,
            "outline-4 outline": isSelected,
          }
        )}
      >
        <div
          style={{ height: `${creaturePercentDamage}%` }}
          className={clsx(
            "absolute rounded bottom-0 left-0 w-full bg-opacity-50 transition-all",
            {
              "bg-gray-500": creaturePercentDamage === 100,
              "bg-red-500": creaturePercentDamage !== 100,
            }
          )}
        />
        <CardHeader className="text-ellipsis max-w-full p-3">
          <CardTitle>{creature.name}</CardTitle>
        </CardHeader>
        {creature.creature_id === 1 ? (
          <span>Loading</span>
        ) : (
          <CharacterIcon
            id={creature.creature_id}
            name={creature.name}
            width={200}
            height={200}
          />
        )}
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
