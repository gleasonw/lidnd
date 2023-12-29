"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUp,
  Plus,
  X,
} from "lucide-react";
import { ParticipantHealthForm } from "@/app/encounters/[id]/run/creature-health-form";
import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import {
  CustomCreature,
  ExistingCreature,
} from "@/app/encounters/[id]/creature-add-form";
import InitiativeInput from "@/app/encounters/[id]/InitiativeInput";
import React, { Suspense, experimental_useEffectEvent } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { EncounterTime } from "@/app/encounters/[id]/run/encounter-time";
import { updateTurnOrder, getAWSimageURL } from "@/app/encounters/utils";
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
import { BasePopover } from "@/app/encounters/base-popover";
import { StatusInput } from "./status-input";
import { effectIconMap } from "./effectIconMap";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function BattleUILoader() {
  return (
    <AnimatePresence>
      <Suspense fallback={<div>Loading...</div>}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.1 } }}
        >
          <BattleUI />
        </motion.div>
      </Suspense>
    </AnimatePresence>
  );
}

export function BattleUI() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const encounterParticipants = encounter.participants;
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

  let displayedParticipants: EncounterCreature[];
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

  const activeIndex = displayedParticipants.findIndex(
    (creature) => creature.is_active
  );
  const activeParticipant = displayedParticipants[activeIndex];

  const [dmSelectedCreature, setDmSelectedCreature] = React.useState(
    activeParticipant?.id ?? null
  );

  const selectedId = dmSelectedCreature ?? activeParticipant?.id ?? null;

  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();

  function handleChangeTurn(direction: "next" | "previous") {
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

  const creature = displayedParticipants?.find(
    (participant) => participant.id === selectedId
  );

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

  return (
    <div className="flex flex-col gap-5 justify-center items-center">
      <div className={"flex gap-3 items-center w-full justify-between"}>
        <EncounterTime time={encounter?.started_at ?? undefined} />
        <h1 className="text-xl">{roundText}</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus /> Add creature
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl overflow-auto max-h-screen">
            <BattleAddCreatureForm />
          </DialogContent>
        </Dialog>
      </div>
      <div
        className={clsx(
          "flex flex-row sm:gap-4 px-8 pt-2 pb-8 max-w-full items-center overflow-auto"
        )}
        ref={scrollContainer}
      >
        <Button
          className="absolute left-0 sm:left-10 z-10 h-10 rounded-full shadow-md"
          onClick={() => handleChangeTurn("previous")}
          variant="outline"
          disabled={isTurnLoading}
        >
          <ChevronLeftIcon />
        </Button>
        <AnimatePresence>
          {displayedParticipants?.slice().map((participant, index) => (
            <AnimationListItem key={participant.id}>
              <BattleCard
                onClick={() => setDmSelectedCreature(participant.id)}
                creature={participant}
                isSelected={participant.id === selectedId}
                className={clsx(
                  {
                    "opacity-40":
                      !(participant.id === selectedId) &&
                      activeIndex &&
                      index < activeIndex,
                  },
                  "cursor-pointer"
                )}
              />
            </AnimationListItem>
          ))}
        </AnimatePresence>
        <Button
          className="absolute right-0 sm:right-10 z-10 h-10 rounded-full shadow-md"
          onClick={() => handleChangeTurn("next")}
          disabled={isTurnLoading}
          variant="outline"
        >
          <ChevronRightIcon />
        </Button>
      </div>

      {creature && (
        <>
          {!creature.is_player ? (
            <OriginalSizeImage
              src={getAWSimageURL(creature.creature_id, "stat_block")}
              alt={"stat block for " + creature.name}
              key={creature.creature_id}
            />
          ) : (
            <span className="text-2xl p-5">Player</span>
          )}
          <Button
            variant="destructive"
            onClick={() =>
              removeCreatureFromEncounter({
                encounter_id: id,
                participant_id: creature.id,
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
} & React.HTMLAttributes<HTMLDivElement>;

export function BattleCard({
  creature,
  children,
  className,
  isSelected,
  header,
  ...props
}: BattleCardProps) {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const { encounterById } = api.useUtils();

  const { mutate: removeStatusEffect } = api.removeStatusEffect.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(encounter.id);
    },
    onMutate: async (newStatusEffect) => {
      await encounterById.cancel(encounter.id);
      const previousEncounter = encounterById.getData(encounter.id);
      encounterById.setData(encounter.id, (old) => {
        if (!old) return old;
        return {
          ...old,
          participants: old.participants.map((participant) => {
            if (participant.id === newStatusEffect.encounter_participant_id) {
              return {
                ...participant,
                status_effects: participant.status_effects.filter(
                  (effect) => effect.id !== newStatusEffect.status_effect_id
                ),
              };
            }
            return participant;
          }),
        };
      });
      return previousEncounter;
    },
  });

  return (
    <div
      className={`relative flex-col gap-6 items-center justify-between flex`}
      {...props}
    >
      {creature?.minion_count && creature.minion_count > 1 ? (
        <MinionCardStack minionCount={creature.minion_count} />
      ) : null}
      <Card
        key={creature.id}
        data-active={creature.is_active}
        className={clsx(
          " bg-white w-[300px] shadow-lg flex flex-col justify-between transition-all hover:rounded-xl group",
          className,
          {
            "outline-zinc-900 outline": isSelected,
            "opacity-40":
              encounter?.current_round === 0 && !creature.has_surprise,
          }
        )}
      >
        <span className={"h-12 flex gap-1 flex-wrap items-center"}>
          {creature.status_effects?.map((effect) => (
            <BasePopover
              key={effect.id}
              trigger={
                <Button variant="outline">
                  {effectIconMap[effect.name as keyof typeof effectIconMap]}
                </Button>
              }
              className="flex flex-col gap-2 text-sm"
            >
              {effect.description}
              {!!effect.save_ends_dc && (
                <span>Save ends ({effect.save_ends_dc})</span>
              )}
              <Button onClick={() => removeStatusEffect(effect)}>Remove</Button>
            </BasePopover>
          ))}
        </span>
        <CardHeader className="flex pt-0 flex-col gap-2 justify-between items-center">
          <CardTitle className="text-xl truncate max-w-full group-hover:opacity-50">
            {creature.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <span className="flex justify-between">
            {creature.creature_id === "pending" ? (
              <span>Loading</span>
            ) : (
              <div className="relative">
                <CharacterIcon
                  id={creature.creature_id}
                  name={creature.name}
                  width={200}
                  height={200}
                  className="object-cover w-32 h-32"
                />
                <HealthMeterOverlay creature={creature} />
              </div>
            )}
            <InitiativeInput participant={creature} key={creature.id} />
          </span>

          <div className="flex flex-col gap-5">
            {!creature.is_player && (
              <ParticipantHealthForm participant={creature} />
            )}
            <StatusInput participant={creature} />
          </div>
        </CardContent>
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

function MinionCardStack({ minionCount }: { minionCount: number }) {
  return (
    <Badge className="absolute top-2 right-2 w-11 whitespace-nowrap">
      x {minionCount}
    </Badge>
  );
}

export function HealthMeterOverlay({
  creature,
}: {
  creature: EncounterCreature;
}) {
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
    <div className={"flex gap-10 flex-wrap w-full justify-center"}>
      <CardContent className={"flex flex-col gap-6 pt-5"}>
        <CardTitle>New creature</CardTitle>
        <CustomCreature
          mutation={{
            onAddCreature: (data) => addCreature(data),
            isPending: isPendingCreatureAdd,
          }}
        />
      </CardContent>
      <CardContent className={"flex flex-col gap-3 pt-5 max-h-full"}>
        <CardTitle>Existing creature</CardTitle>
        <ExistingCreature />
      </CardContent>
    </div>
  );
}

export function SpellSearcher() {
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");

  React.useEffect(() => {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.keyCode === 75) {
        e.preventDefault();
        setShowSearch(true);
      }
    });
    return () => {
      document.removeEventListener("keydown", () => {});
    };
  }, []);

  const { data: spells } = api.spells.useQuery(searchInput);

  return (
    <Dialog open={showSearch} onOpenChange={(isOpen) => setShowSearch(isOpen)}>
      <DialogContent className="max-w-3xl h-[500px] overflow-auto">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {
          <div className="flex flex-col gap-8">
            {spells?.map((spell) => (
              <div key={spell.id} className="flex flex-col gap-3">
                <DialogTitle>
                  {spell.name} ({spell.source})
                </DialogTitle>
                <DialogDescription className="text-lg whitespace-break-spaces">
                  {spell.entries}
                </DialogDescription>
              </div>
            ))}
          </div>
        }
      </DialogContent>
    </Dialog>
  );
}
