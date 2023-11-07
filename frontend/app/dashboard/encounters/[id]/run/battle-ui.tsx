"use client";

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
import { ParticipantHealthForm } from "@/app/dashboard/encounters/[id]/run/creature-health-form";
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
  updateTurnOrder,
  sortEncounterCreatures,
} from "@/app/dashboard/encounters/utils";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import { EncounterCreature } from "@/server/api/router";

export function BattleUI() {
  const id = useEncounterId();
  const { data: encounter } = api.encounterById.useQuery(id);
  const encounterParticipants = encounter?.participants;
  const {
    mutate: changeActiveTo,
    isLoading: isTurnLoading,
    variables,
  } = api.updateTurn.useMutation();

  const displayedParticipants =
    isTurnLoading && variables
      ? updateTurnOrder(variables.to, encounterParticipants)
      : encounterParticipants;
  const activeParticipant = displayedParticipants?.find(
    (creature) => creature.is_active
  );
  const [dmSelectedCreature, setDmSelectedCreature] = React.useState(
    activeParticipant?.id ?? null
  );

  const selectedId = dmSelectedCreature ?? activeParticipant?.id ?? null;

  const { mutate: removeCreatureFromEncounter } =
    api.removeParticipantFromEncounter.useMutation();

  function handleChangeTurn(direction: "next" | "previous") {
    const newParticipants = updateTurnOrder(direction, encounterParticipants);
    setDmSelectedCreature(
      newParticipants?.find((creature) => creature.is_active)?.id ?? null
    );
    changeActiveTo({
      encounter_id: id,
      to: direction,
    });
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
        <div
          className={clsx(
            "flex flex-row gap-10 px-10 max-w-full items-center overflow-auto h-80"
          )}
          ref={scrollContainer}
        >
          <Button
            className="absolute left-0 sm:left-10 z-10 h-20"
            onClick={() => handleChangeTurn("previous")}
            disabled={isTurnLoading}
          >
            <ChevronLeftIcon />
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
                  <BattleCard
                    creature={participant}
                    isSelected={participant.id === selectedId}
                  />
                </button>
              </AnimationListItem>
            ))}
          <Button
            className="absolute right-0 sm:right-10 z-10 h-20"
            onClick={() => handleChangeTurn("next")}
            disabled={isTurnLoading}
          >
            <ChevronRightIcon />
          </Button>
        </div>

        {selectedParticipant && (
          <>
            <div className="flex flex-col gap-5">
              <span className={"text-center text-xl"}>
                {selectedParticipant.name}{" "}
              </span>
              <ParticipantHealthForm participant={selectedParticipant} />
              {selectedParticipant.hp > 0 ? (
                <InitiativeInput
                  participant={selectedParticipant}
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
                removeCreatureFromEncounter({
                  encounter_id: id,
                  participant_id: selectedParticipant.id,
                })
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
      className={`relative flex-col gap-6 items-center w-40 justify-between flex`}
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
        {creature.creature_id === "" ? (
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
  const { mutate: addCreature, isLoading: isPendingCreatureAdd } =
    api.createCreatureAndAddToEncounter.useMutation();
  return (
    <div className={"flex flex-col w-full items-center gap-3"}>
      {children}
      <div className={"flex flex-wrap gap-3 w-full justify-center"}>
        <Card className={"w-full max-w-[600px]"}>
          <CardContent className={"flex flex-col gap-3 pt-5"}>
            <CardTitle>New creature</CardTitle>
            <CustomCreature
              mutation={{
                onAddCreature: (data) =>
                  addCreature({
                    encounter_id: useEncounterId(),
                    creature: data,
                  }),
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
