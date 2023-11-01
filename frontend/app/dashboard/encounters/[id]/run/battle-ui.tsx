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
  ChevronDown,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUp,
  Plus,
  Rows,
  StretchVertical,
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

  const selectedId = dmSelectedCreature ?? activeParticipant?.id ?? null;

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

  const selectedParticipant = displayedParticipants?.find(
    (participant) => participant.id === selectedId
  );

  const [addingCreature, setAddingCreature] = React.useState(false);

  const scrollContainer = React.useRef<HTMLDivElement>(null);

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
            <Plus /> Add creature
          </Button>
        )}
      </div>
      {addingCreature && (
        <BattleAddCreatureForm>
          <Button variant={"ghost"} onClick={() => setAddingCreature(false)}>
            <X /> Close
          </Button>
        </BattleAddCreatureForm>
      )}
      <AnimatePresence>
        <div className="relative w-full">
          <div
            className={clsx(
              "flex gap-5 flex-col",
              "sm:flex-row sm:gap-10 sm:px-10 sm:max-w-full sm:items-center sm:overflow-auto sm:h-80"
            )}
            ref={scrollContainer}
          >
            <Button
              className="absolute left-0 sm:flex hidden z-10 h-20"
              onClick={() => handleChangeTurn("previous")}
              disabled={isPending}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              className=" sm:hidden"
              onClick={() => handleChangeTurn("previous")}
              disabled={isPending}
            >
              <ChevronUp />
            </Button>
            {displayedParticipants
              ?.slice()
              .sort(sortEncounterCreatures)
              .map((participant) => (
                <AnimationListItem key={participant.id}>
                  <button
                    onClick={() => setDmSelectedCreature(participant.id)}
                    className="w-full"
                  >
                    <div className="flex gap-10 items-center w-full sm:hidden">
                      <Card
                        className={clsx(
                          "w-full flex items-center gap-5 overflow-hidden relative transition-all",
                          {
                            "transform scale-105": participant.is_active,
                            "outline-4 outline": participant.id === selectedId,
                          }
                        )}
                      >
                        <HealthMeterOverlay creature={participant} />
                        <CharacterIcon
                          id={participant.creature_id}
                          name={participant.name}
                          width={100}
                          height={100}
                        />
                        <h1 className="p-3">{participant.name}</h1>
                        <Swords
                          className={clsx({
                            "opacity-0": !participant.is_active,
                            "opacity-100": participant.is_active,
                          })}
                          size={50}
                        />
                      </Card>
                    </div>
                    <BattleCard
                      className="hidden sm:flex"
                      creature={participant}
                      isSelected={participant.id === selectedId}
                    />
                  </button>
                </AnimationListItem>
              ))}
            <Button
              className="absolute right-0 sm:flex hidden z-10 h-20"
              onClick={() => handleChangeTurn("next")}
              disabled={isPending}
            >
              <ChevronRightIcon />
            </Button>
            <Button
              className="sm:hidden"
              onClick={() => handleChangeTurn("next")}
              disabled={isPending}
            >
              <ChevronDown />
            </Button>
          </div>
        </div>

        {selectedParticipant && (
          <>
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
            <StatBlock
              id={selectedParticipant.creature_id}
              name={selectedParticipant.name}
              key={selectedParticipant.creature_id}
            />
            <Button
              variant="destructive"
              onClick={() =>
                removeCreatureFromEncounter(selectedParticipant.id)
              }
            >
              Remove from encounter
            </Button>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export type BattleCardProps = {
  creature: EncounterCreature;
  children?: React.ReactNode;
  className?: string;
  isSelected?: boolean;
};

export function BattleCard({
  creature,
  children,
  className,
  isSelected,
}: BattleCardProps) {
  return (
    <div
      key={creature.id}
      className={`relative flex-col gap-6 items-center w-40 justify-between hidden sm:flex`}
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
        <HealthMeterOverlay creature={creature} />
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

function HealthMeterOverlay({ creature }: { creature: EncounterCreature }) {
  let missingHp = creature.max_hp - creature.hp;
  missingHp = Math.min(missingHp, creature.max_hp);
  const creaturePercentDamage = (missingHp / creature.max_hp) * 100;
  return (
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

function BattleAddCreatureForm({ children }: { children?: React.ReactNode }) {
  const { mutate: addCreature, isPending: isPendingCreatureAdd } =
    useAddCreatureToEncounter();
  return (
    <div className={"flex flex-col w-full items-center gap-3"}>
      {children}
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
  );
}
