"use client";

import { ExistingCreature } from "@/app/dashboard/encounters/[id]/creature-add-form";
import {
  AnimationListItem,
  BattleCard,
} from "@/app/dashboard/encounters/[id]/run/battle-ui";
import {
  useEncounter,
  useEncounterCreatures,
  useRemoveCreatureFromEncounter,
  useSettings,
  useStartEncounter,
  useUpdateEncounter,
} from "@/app/dashboard/encounters/api";
import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { Check, Clock, Play, Skull, X } from "lucide-react";
import Link from "next/link";
import { FullCreatureAddForm } from "@/app/dashboard/full-creature-add-form";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React from "react";
import { sortEncounterCreatures } from "@/app/dashboard/encounters/utils";
import { useDebouncedCallback } from "use-debounce";
import clsx from "clsx";
import InitiativeInput from "@/app/dashboard/encounters/[id]/InitiativeInput";
import { access } from "fs/promises";

export default function SingleEncounter() {
  const { data: encounterParticipants, isLoading } = useEncounterCreatures();
  const { data: encounter } = useEncounter();
  const { mutate: startEncounter } = useStartEncounter();
  const { mutate: updateEncounter, isPending: isUpdatePending } =
    useUpdateEncounter();
  const id = useEncounterId();
  const [encounterName, setEncounterName] = React.useState(
    encounter?.name ?? ""
  );
  const { data: settings } = useSettings();

  const debouncedNameUpdate = useDebouncedCallback((name: string) => {
    updateEncounter({
      ...encounter,
      name,
      description: encounter?.description ?? "",
    });
  }, 500);

  const { mutate: removeCreatureFromEncounter } =
    useRemoveCreatureFromEncounter();

  return (
    <div className={"flex flex-col items-center gap-10 relative"}>
      <div className="flex gap-5 items-center justify-between w-full">
        {encounter?.name !== undefined ? (
          <div className="flex gap-5 items-center">
            <Input
              value={encounterName}
              placeholder={encounter.name ?? "Encounter name"}
              className={"text-xl max-w-lg"}
              onChange={(e) => {
                setEncounterName(e.target.value);
                debouncedNameUpdate(e.target.value);
              }}
            />
            <span
              className={clsx("transition-opacity", {
                "opacity-0": encounterName !== encounter?.name,
                "opacity-80": encounterName === encounter?.name,
              })}
            >
              Saved
            </span>
          </div>
        ) : (
          <div />
        )}

        {encounter?.started_at ? (
          <Link href={`${id}/run`}>
            <Button>
              <Play />
              Continue the battle!
            </Button>
          </Link>
        ) : (
          <Link href={`${id}/run`} onClick={startEncounter}>
            <Button>
              <Play />
              Commence the battle!
            </Button>
          </Link>
        )}
      </div>

      <AnimatePresence>
        <div className={"flex gap-10 overflow-auto p-5 max-w-full"}>
          {encounterParticipants
            ?.slice()
            .sort(sortEncounterCreatures)
            .map((participant) => (
              <AnimationListItem key={participant.id}>
                <BattleCard creature={participant}>
                  <InitiativeInput creature={participant} />
                  <Button
                    variant="ghost"
                    onClick={() => removeCreatureFromEncounter(participant.id)}
                  >
                    <X />
                  </Button>
                </BattleCard>
              </AnimationListItem>
            ))}
          {encounterParticipants?.length === 0 && (
            <div className="h-56 justify-evenly w-40 gap-0 items-center flex flex-col">
              <h1 className={"text-2xl text-center"}>
                No creatures in this encounter
              </h1>
            </div>
          )}
          {isLoading &&
            Array(5)
              .fill(null)
              .map((_, i) => (
                <Card
                  key={i}
                  className="h-56 justify-evenly w-40 gap-0 items-center flex flex-col animate-pulse bg-gray-200"
                />
              ))}
        </div>
      </AnimatePresence>
      {settings && (
        <EncounterStats
          turnTimeEstimate={settings.average_turn_duration}
          savedPlayerLevel={settings.player_level}
          numPlayers={
            encounterParticipants?.reduce((sum, participant) => {
              if (participant.is_player) {
                return sum + 1;
              }
              return sum;
            }, 0) ?? 0
          }
        />
      )}

      <div className={"flex flex-col w-full gap-3"}>
        <div className={"flex flex-wrap w-full justify-center gap-5"}>
          <Card className="max-w-[600px] w-full p-3">
            <CardContent className={"flex flex-col gap-3"}>
              <CardTitle className="py-3">Add new creature</CardTitle>
              <FullCreatureAddForm />
            </CardContent>
          </Card>

          <Card className={"max-w-[600px] w-full p-3"}>
            <CardContent className={"flex flex-col gap-3"}>
              <CardTitle className="py-3">Add existing creature</CardTitle>
              <ExistingCreature />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EncounterStats({
  turnTimeEstimate,
  savedPlayerLevel,
  numPlayers,
}: {
  turnTimeEstimate: number;
  savedPlayerLevel: number;
  numPlayers: number;
}) {
  const [localNumPlayers, setLocalNumPlayers] = React.useState<number | null>(null);
  const [estimatedTurnSeconds, setEstimatedTurnSeconds] =
    React.useState(turnTimeEstimate);
  const [estimatedRounds, setEstimatedRounds] = React.useState(3);
  const [playerLevel, setPlayerLevel] = React.useState(savedPlayerLevel);

  const { data: creatures } = useEncounterCreatures();

  const numParticipants = creatures?.length ?? 0;

  const displayedNumPlayers = localNumPlayers ?? numPlayers;

  const estimatedEncounterDuration =
    (numParticipants * estimatedRounds * estimatedTurnSeconds) / 60;

  const totalCr =
    creatures?.reduce((acc, creature) => {
      return acc + creature.challenge_rating;
    }, 0) ?? 0;

  const crBudget = encounterCRPerCharacter.find(
    (cr) => cr.level === playerLevel
  );

  const easyTier = (crBudget?.easy ?? 0) * numPlayers;
  const standardTier = (crBudget?.standard ?? 0) * numPlayers;
  const hardTier = (crBudget?.hard ?? 0) * numPlayers;

  let difficulty = "";
  if (totalCr <= easyTier) {
    difficulty = "Easy";
  } else if (totalCr <= standardTier) {
    difficulty = "Standard";
  } else if (totalCr <= hardTier) {
    difficulty = "Hard";
  } else {
    difficulty = "Deadly";
  }

  return (
    <div className={"flex flex-wrap gap-20 justify-center"}>
      <div className={"flex flex-col items-center gap-3 justify-between"}>
        <span className="flex gap-5 items-center text-2xl">
          <Clock />
          {estimatedEncounterDuration.toFixed(2)} minutes
        </span>

        <div className="flex flex-col gap-3">
          <label>
            Estimated turn seconds
            <Input
              type={"number"}
              value={estimatedTurnSeconds}
              onChange={(e) =>
                setEstimatedTurnSeconds(parseInt(e.target.value))
              }
            />
          </label>
          <label>
            Estimated rounds
            <Input
              type={"number"}
              value={estimatedRounds}
              onChange={(e) => setEstimatedRounds(parseInt(e.target.value))}
            />
          </label>
        </div>
      </div>
      <div className={"flex flex-col items-center gap-3"}>
        <span className="flex text-2xl items-center gap-5">
          <Skull />
          {difficulty}
        </span>
        <span>Total Cr: {totalCr}</span>
        <span>
          Budget: {easyTier} / {standardTier} / {hardTier}
        </span>
        <label>
          Number of players in encounter
          <Input
            type={"number"}
            value={displayedNumPlayers}
            onChange={(e) => setLocalNumPlayers(parseInt(e.target.value))}
          />
        </label>
        <label>
          Player level
          <Input
            type={"number"}
            value={playerLevel}
            onChange={(e) => setPlayerLevel(parseInt(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}

const encounterCRPerCharacter = [
  { level: 1, easy: 0.125, standard: 0.125, hard: 0.25, cap: 1 },
  { level: 2, easy: 0.125, standard: 0.25, hard: 0.5, cap: 3 },
  { level: 3, easy: 0.25, standard: 0.5, hard: 0.75, cap: 4 },
  { level: 4, easy: 0.5, standard: 0.75, hard: 1, cap: 6 },
  { level: 5, easy: 1, standard: 1.5, hard: 2.5, cap: 8 },
  { level: 6, easy: 1.5, standard: 2, hard: 3, cap: 9 },
  { level: 7, easy: 2, standard: 2.5, hard: 3.5, cap: 10 },
  { level: 8, easy: 2.5, standard: 3, hard: 4, cap: 13 },
  { level: 9, easy: 3, standard: 3.5, hard: 4.5, cap: 13 },
  { level: 10, easy: 3.5, standard: 4, hard: 5, cap: 15 },
  { level: 11, easy: 4, standard: 4.5, hard: 5.5, cap: 16 },
  { level: 12, easy: 4.5, standard: 5, hard: 6, cap: 17 },
  { level: 13, easy: 5, standard: 5.5, hard: 6.5, cap: 19 },
  { level: 14, easy: 5.5, standard: 6, hard: 7, cap: 20 },
  { level: 15, easy: 6, standard: 6.5, hard: 7.5, cap: 22 },
  { level: 16, easy: 6.5, standard: 7, hard: 8, cap: 24 },
  { level: 17, easy: 7, standard: 7.5, hard: 8.5, cap: 25 },
  { level: 18, easy: 7.5, standard: 8, hard: 9, cap: 26 },
  { level: 19, easy: 8, standard: 8.5, hard: 9.5, cap: 28 },
  { level: 20, easy: 8.5, standard: 9, hard: 10, cap: 30 },
];
