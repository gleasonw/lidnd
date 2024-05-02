"use client";

import { ExistingCreature } from "@/app/campaigns/[campaign]/encounters/[id]/creature-add-form";
import {
  AnimationListItem,
  BattleCard,
} from "@/app/campaigns/[campaign]/encounters/[id]/run/battle-ui";
import { useEncounterId } from "@/app/campaigns/[campaign]/encounters/hooks";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  Dices,
  Play,
  Skull,
  X,
  Swords,
  Sword,
  Angry,
} from "lucide-react";
import Link from "next/link";
import { FullCreatureAddForm } from "@/app/campaigns/[campaign]/encounters/full-creature-add-form";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React, { Suspense } from "react";
import { sortEncounterCreatures } from "@/app/campaigns/[campaign]/encounters/utils";
import { useDebouncedCallback } from "use-debounce";
import { BasePopover } from "@/app/campaigns/[campaign]/encounters/base-popover";
import { api } from "@/trpc/react";
import {
  useCreateCreatureInEncounter,
  useRemoveParticipantFromEncounter,
  useStartEncounter,
} from "@/app/campaigns/[campaign]/encounters/[id]/hooks";
import {
  GroupBattleCard,
  GroupBattleLayout,
} from "@/app/campaigns/[campaign]/encounters/[id]/run/group-battle-ui";
import { EncounterCreature } from "@/server/api/router";
import { useCampaign, useCampaignId } from "@/app/campaigns/[campaign]/hooks";

export default function EncounterPrep() {
  const { mutate: addCreatureToEncounter } = useCreateCreatureInEncounter();

  return (
    <AnimatePresence>
      <Suspense
        fallback={
          <div className="w-screen p-20 flex items-center justify-center">
            Loading encounter...
          </div>
        }
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.1 } }}
          className="w-full flex flex-col items-center gap-10"
        >
          <EncounterDetailsEditor>
            <EncounterStats />
          </EncounterDetailsEditor>
          <EncounterParticipantRow />

          <div className={"flex flex-col w-full gap-3"}>
            <div
              className={
                "flex flex-wrap xl:flex-nowrap w-full justify-center gap-3 md:gap-5 lg:gap-14"
              }
            >
              <Card className="max-w-[900px] w-full p-3">
                <CardContent className={"flex flex-col gap-3"}>
                  <CardTitle className="py-3">Add new creature</CardTitle>
                  <FullCreatureAddForm
                    uploadCreature={(data) => addCreatureToEncounter(data)}
                  />
                </CardContent>
              </Card>

              <Card className={"max-w-[900px] w-full p-3"}>
                <CardContent className={"flex flex-col gap-3"}>
                  <CardTitle className="py-3">Add existing creature</CardTitle>
                  <ExistingCreature />
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </Suspense>
    </AnimatePresence>
  );
}

function EncounterDetailsEditor({ children }: { children: React.ReactNode }) {
  const id = useEncounterId();
  const { encounterById } = api.useUtils();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const { mutate: updateEncounter } = api.updateEncounter.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(id);
    },
  });
  const [encounterName, setEncounterName] = React.useState(
    encounter?.name ?? "",
  );

  const debouncedNameUpdate = useDebouncedCallback((name: string) => {
    encounter &&
      updateEncounter({
        ...encounter,
        name,
        description: encounter?.description ?? "",
      });
  }, 500);

  return (
    <div className="flex gap-5 items-center w-full flex-col md:flex-row justify-end pl-10">
      <span className="flex gap-3 items-center flex-col md:flex-row mr-auto">
        <Input
          value={encounterName}
          placeholder={encounter?.name ?? "Unnamed encounter"}
          onChange={(e) => {
            setEncounterName(e.target.value);
            debouncedNameUpdate(e.target.value);
          }}
        />
      </span>
      {children}

      {encounter?.started_at ? (
        <Link href={`${id}/run`}>
          <Button>
            <Play />
            Continue the battle!
          </Button>
        </Link>
      ) : (
        <EncounterStartButton />
      )}
    </div>
  );
}

export function EncounterStartButton() {
  const id = useEncounterId();
  const campaignId = useCampaignId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const [campaign] = api.campaignById.useSuspenseQuery(campaignId);
  const { mutate: startEncounter } = useStartEncounter();
  return (
    <span className="flex gap-2 items-center">
      {campaign.system?.initiative_type === "group" ? (
        <Link
          href={`${id}/run`}
          onClick={async () => encounter && (await startEncounter(id))}
        >
          <Button>
            <Swords />
            Commence the battle
          </Button>
        </Link>
      ) : (
        <Link href={`${id}/roll`}>
          <Button>
            <Dices />
            Roll initiative!
          </Button>
        </Link>
      )}
    </span>
  );
}

function EncounterParticipantRow() {
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  const monsters = encounter.participants
    .filter((participant) => !participant.is_player)
    .sort(sortEncounterCreatures);
  const players = encounter.participants
    .filter((participant) => participant.is_player)
    .sort(sortEncounterCreatures);

  return (
    <>
      <GroupBattleLayout
        playerTitle={
          <h1 className="flex gap-5 text-xl">
            Players <Sword />
          </h1>
        }
        monsterTitle={
          <h1 className="flex gap-5 text-xl">
            Monsters <Angry />
          </h1>
        }
        monsters={monsters.map((participant) => (
          <PrepParticipantCard key={participant.id} participant={participant} />
        ))}
        players={players.map((participant) => (
          <PrepParticipantCard key={participant.id} participant={participant} />
        ))}
      />
      {encounter?.participants?.length === 0 && (
        <h1 className={"text-2xl text-center"}>
          No creatures in this encounter
        </h1>
      )}
    </>
  );
}

function PrepParticipantCard({
  participant,
}: {
  participant: EncounterCreature;
}) {
  const { mutate: removeCreatureFromEncounter } =
    useRemoveParticipantFromEncounter();
  const id = useEncounterId();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const campaign = useCampaign();
  return (
    <AnimationListItem key={participant.id}>
      <div className="flex flex-col items-center gap-3">
        {campaign.system?.initiative_type === "group" ? (
          <GroupBattleCard creature={participant} />
        ) : (
          <BattleCard creature={participant} />
        )}
        <Button
          variant="ghost"
          onClick={() =>
            removeCreatureFromEncounter({
              encounter_id: encounter.id,
              participant_id: participant.id,
            })
          }
        >
          <X />
        </Button>
      </div>
    </AnimationListItem>
  );
}

function EncounterStats() {
  const id = useEncounterId();
  const { data: settings } = api.settings.useQuery();
  const { data: encounter } = api.encounterById.useQuery(id);

  const [estimatedTurnSeconds, setEstimatedTurnSeconds] = React.useState<
    number | null
  >(null);
  const [playerLevel, setPlayerLevel] = React.useState<number | null>(null);
  const [localNumPlayers, setLocalNumPlayers] = React.useState<number | null>(
    null,
  );
  const [estimatedRounds, setEstimatedRounds] = React.useState<number | null>(
    null,
  );

  const finalTurnSeconds =
    estimatedTurnSeconds ?? settings?.average_turn_seconds ?? 180;
  const finalPlayerLevel = playerLevel ?? settings?.default_player_level ?? 1;
  const finalNumPlayers =
    localNumPlayers ??
    encounter?.participants?.filter((p) => p.is_player)?.length ??
    4;
  const finalEstimatedRounds = estimatedRounds ?? 3;

  const numParticipants = encounter?.participants?.length ?? 0;

  const estimatedEncounterDuration =
    (numParticipants * finalEstimatedRounds * finalTurnSeconds) / 60;

  const totalCr =
    encounter?.participants?.reduce((acc, creature) => {
      return acc + creature.challenge_rating;
    }, 0) ?? 0;

  const crBudget = encounterCRPerCharacter.find(
    (cr) => cr.level === finalPlayerLevel,
  );

  const easyTier = (crBudget?.easy ?? 0) * finalNumPlayers;
  const standardTier = (crBudget?.standard ?? 0) * finalNumPlayers;
  const hardTier = (crBudget?.hard ?? 0) * finalNumPlayers;

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

  let encounterTime = "";
  const hourTime = estimatedEncounterDuration / 60;
  const hourCount = Math.floor(hourTime);
  const minuteRemainder = estimatedEncounterDuration % 60;
  if (hourTime >= 1) {
    encounterTime = `${hourCount} hour${hourCount > 1 ? "s" : ""} ${
      minuteRemainder ? `${Math.floor(minuteRemainder)} minutes` : ""
    }`;
  } else {
    encounterTime = `${Math.floor(estimatedEncounterDuration % 60)} minutes`;
  }

  return (
    <>
      <BasePopover
        trigger={
          <Button
            className="flex text-xl items-center gap-5 w-44"
            variant="ghost"
          >
            <Skull />
            {difficulty}
          </Button>
        }
        className="flex flex-col items-center gap-5"
      >
        <span>Total CR: {totalCr}</span>
        <span>
          Budget: {easyTier} / {standardTier} / {hardTier}
        </span>
        <label>
          Number of players in encounter
          <Input
            type={"number"}
            value={finalNumPlayers}
            onChange={(e) => setLocalNumPlayers(parseInt(e.target.value))}
          />
        </label>
        <label>
          Player level
          <Input
            type={"number"}
            value={finalPlayerLevel}
            onChange={(e) => setPlayerLevel(parseInt(e.target.value))}
          />
        </label>
      </BasePopover>
      <BasePopover
        className="flex flex-col items-center gap-5"
        trigger={
          <Button
            className="flex gap-5 items-center text-xl whitespace-nowrap w-60"
            variant="ghost"
          >
            <Clock className="flex-shrink-0" />
            {encounterTime}
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <label>
            Estimated turn seconds
            <Input
              type={"number"}
              value={finalTurnSeconds}
              onChange={(e) =>
                setEstimatedTurnSeconds(parseInt(e.target.value))
              }
            />
          </label>
          <label>
            Estimated rounds
            <Input
              type={"number"}
              value={finalEstimatedRounds}
              onChange={(e) => setEstimatedRounds(parseInt(e.target.value))}
            />
          </label>
        </div>
      </BasePopover>
    </>
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
