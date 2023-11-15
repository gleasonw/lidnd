"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUp,
  Plus,
  Swords,
  X,
} from "lucide-react";
import { ParticipantHealthForm } from "@/app/encounters/[id]/run/creature-health-form";
import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import {
  CustomCreature,
  ExistingCreature,
} from "@/app/encounters/[id]/creature-add-form";
import InitiativeInput from "@/app/encounters/[id]/InitiativeInput";
import React from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { EncounterTime } from "@/app/encounters/[id]/run/encounter-time";
import {
  updateTurnOrder,
  sortEncounterCreatures,
  getAWSimageURL,
} from "@/app/encounters/utils";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { useEncounterId } from "@/app/encounters/hooks";
import { EncounterCreature } from "@/server/api/router";
import {
  useCreateCreatureInEncounter,
  useRemoveParticipantFromEncounter,
} from "@/app/encounters/[id]/hooks";
import { FadePresenceItem } from "@/components/ui/animate/FadePresenceItem";
import { OriginalSizeImage } from "@/app/encounters/original-size-image";

export function BattleUI() {
  const id = useEncounterId();
  const { data: encounter } = api.encounterById.useQuery(id);
  const encounterParticipants = encounter?.participants;
  const { encounterById } = api.useUtils();
  const {
    mutate: changeActiveTo,
    isLoading: isTurnLoading,
    variables,
  } = api.updateTurn.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(id);
    },
  });

  let displayedParticipants: EncounterCreature[] | undefined;
  if (isTurnLoading && variables && encounterParticipants) {
    const { updatedParticipants } = updateTurnOrder(
      variables.to,
      encounterParticipants,
      encounter
    );
    displayedParticipants = updatedParticipants;
  } else {
    displayedParticipants = encounterParticipants;
  }

  const activeIndex = displayedParticipants?.findIndex(
    (creature) => creature.is_active
  );
  const activeParticipant = activeIndex
    ? displayedParticipants?.[activeIndex]
    : undefined;

  const [dmSelectedCreature, setDmSelectedCreature] = React.useState(
    activeParticipant?.id ?? null
  );

  const selectedId = dmSelectedCreature ?? activeParticipant?.id ?? null;

  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();

  function handleChangeTurn(direction: "next" | "previous") {
    // TODO: make encounter query suspense so always defined
    if (encounterParticipants) {
      const { newlyActiveParticipant } = updateTurnOrder(
        direction,
        encounterParticipants,
        encounter
      );
      setDmSelectedCreature(newlyActiveParticipant.id);
      changeActiveTo({
        encounter_id: id,
        to: direction,
      });
    }
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

  const roundText =
    encounter?.current_round === 0
      ? "Surprise round"
      : `Round ${encounter?.current_round}`;

  console.log(displayedParticipants);

  return (
    <div className="flex flex-col gap-5 justify-center items-center">
      <div className={"flex gap-3 items-center w-full justify-between"}>
        <EncounterTime time={encounter?.started_at ?? undefined} />
        <h1 className="text-xl">{roundText}</h1>
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

      <div
        className={clsx(
          "flex flex-row sm:gap-4 p-8 max-w-full items-center overflow-auto"
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
        <AnimatePresence>
          {displayedParticipants
            ?.slice()
            .map((participant, index) => (
              <AnimationListItem key={participant.id}>
                <button
                  onClick={() => setDmSelectedCreature(participant.id)}
                  className="w-full"
                >
                  <BattleCard
                    creature={participant}
                    isSelected={participant.id === selectedId}
                    className={
                      activeIndex && index < activeIndex ? "opacity-40" : ""
                    }
                  />
                </button>
              </AnimationListItem>
            ))}
        </AnimatePresence>
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
            <span className={"text-center text-xl flex flex-col gap-3"}>
              {selectedParticipant.name}{" "}
              {!selectedParticipant.is_player && (
                <>
                  <span>
                    {selectedParticipant.hp} / {selectedParticipant.max_hp} HP
                  </span>
                  <ParticipantHealthForm participant={selectedParticipant} />
                </>
              )}
            </span>

            <InitiativeInput
              participant={selectedParticipant}
              className="flex gap-5"
              key={selectedParticipant.id}
            />
          </div>
          {!selectedParticipant.is_player ? (
            <OriginalSizeImage
              src={getAWSimageURL(
                selectedParticipant.creature_id,
                "stat_block"
              )}
              alt={"stat block for " + selectedParticipant.name}
              key={selectedParticipant.creature_id}
            />
          ) : (
            <span className="text-2xl p-5">Player</span>
          )}
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
    </div>
  );
}

export type BattleCardProps = {
  creature: EncounterCreature;
  children?: React.ReactNode;
  className?: string;
  isSelected?: boolean;
  header?: React.ReactNode;
};

export function BattleCard({
  creature,
  children,
  className,
  isSelected,
  header,
}: BattleCardProps) {
  const id = useEncounterId();
  const { data: encounter } = api.encounterById.useQuery(id);
  return (
    <div
      className={`relative flex-col gap-6 items-center justify-between flex`}
    >
      <Card
        key={creature.id}
        data-active={creature.is_active}
        className={clsx(
          "lg:w-52 w-28 shadow-lg border-2 relative select-none h-56 mb-8 rounded-sm justify-between overflow-hidden pt-3 gap-0 items-center flex flex-col transition-all",
          className,
          {
            "h-64 mb-0": creature.is_active,
            "border-zinc-900": isSelected || creature.is_active,
            "opacity-40":
              encounter?.current_round === 0 && !creature.has_surprise,
          }
        )}
      >
        <HealthMeterOverlay creature={creature} />
        <CardHeader className="p-3">
          <CardTitle>{creature.name}</CardTitle>
        </CardHeader>
        {creature.creature_id === "pending" ? (
          <span>Loading</span>
        ) : (
          <CharacterIcon
            id={creature.creature_id}
            name={creature.name}
            width={200}
            height={200}
            className="h-32 object-cover"
          />
        )}
      </Card>
      <AnimatePresence>
        <div className={"flex absolute -bottom-8 flex-row gap-2"}>
          {creature.is_active && (
            <FadePresenceItem>
              <ChevronUp />
            </FadePresenceItem>
          )}
        </div>
      </AnimatePresence>
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
        "absolute rounded bottom-0 left-0 w-full bg-opacity-70 transition-all",
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
    useCreateCreatureInEncounter();
  return (
    <div className={"flex flex-col w-full items-center gap-3"}>
      {children}
      <div className={"flex flex-wrap gap-3 w-full justify-center"}>
        <Card className={"w-full max-w-[600px]"}>
          <CardContent className={"flex flex-col gap-3 pt-5"}>
            <CardTitle>New creature</CardTitle>
            <CustomCreature
              mutation={{
                onAddCreature: (data) => addCreature(data),
                isPending: isPendingCreatureAdd,
              }}
            />
          </CardContent>
        </Card>
        <Card className={"w-full max-w-[600px] h-96"}>
          <CardContent className={"flex flex-col gap-3 pt-5 max-h-full"}>
            <CardTitle>Existing creature</CardTitle>
            <ExistingCreature />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
