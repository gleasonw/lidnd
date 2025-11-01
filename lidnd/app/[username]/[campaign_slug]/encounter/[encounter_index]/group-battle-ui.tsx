"use client";

import {
  BattleCardContent,
  BattleCardCreatureIcon,
  BattleCardCreatureName,
  BattleCardHealthAndStatus,
  BattleCardLayout,
  BattleCardStatusEffects,
  MinionCardStack,
} from "./battle-ui";
import { Button } from "@/components/ui/button";
import type { ParticipantWithData } from "@/server/api/router";
import { api } from "@/trpc/react";
import clsx from "clsx";
import React from "react";
import { AnimatePresence } from "framer-motion";
import { EncounterUtils } from "@/utils/encounters";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import { CreatureStatBlock } from "@/encounters/[encounter_index]/CreatureStatBlock";

export function GroupBattleUI() {
  const id = useEncounterId();
  const { data: encounter } = api.encounterById.useQuery(id);

  const [dmSelectedCreature, setDmSelectedCreature] = React.useState<
    string | null
  >(encounter?.participants.at(0)?.id ?? null);
  if (!encounter) return null;

  const monsters = EncounterUtils.monsters(encounter);
  const players = EncounterUtils.allies(encounter);

  return (
    <div className="flex flex-col overflow-auto">
      <div className="flex border-blue-500 mx-auto">
        {players.map((player, index) => (
          <GroupBattleCard
            key={player.id + index}
            participant={player}
            isSelected={player.id === dmSelectedCreature}
          />
        ))}
      </div>
      <div className="flex flex-wrap border-red-500">
        {monsters.map((monster, index) => (
          <div key={monster.id + index}>
            <GroupBattleCard
              onClick={() => setDmSelectedCreature(monster.id)}
              participant={monster}
              isSelected={monster.id === dmSelectedCreature}
            />
            <CreatureStatBlock creature={monster.creature} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GroupBattleLayout({
  monsters,
  players,
  playerTitle,
  monsterTitle,
  children,
  ...props
}: {
  monsters: React.ReactNode[];
  players: React.ReactNode[];
  playerTitle?: React.ReactNode;
  monsterTitle?: React.ReactNode;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="flex flex-col max-w-full" {...props}>
      <div className="flex gap-4 flex-col">
        <AnimatePresence>
          {playerTitle &&
            React.cloneElement(playerTitle as React.ReactElement, {
              key: "player_title",
            })}
          <div
            className="flex overflow-auto max-w-full gap-4 pb-2 px-2"
            key="players"
          >
            {players}
          </div>
          {monsterTitle &&
            React.cloneElement(monsterTitle as React.ReactElement, {
              key: "monster_title",
            })}
          <div
            className="flex overflow-auto max-w-full gap-4 pb-2 px-2"
            key="monsters"
          >
            {monsters}
          </div>
        </AnimatePresence>
        {children}
      </div>
    </div>
  );
}

export type GroupBattleCardProps = {
  children?: React.ReactNode;
  participant: ParticipantWithData;
  className?: string;
  isSelected?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export function GroupBattleCard({
  participant,
  isSelected,
  ...props
}: GroupBattleCardProps) {
  const id = useEncounterId();
  const { encounterById } = api.useUtils();
  const [encounter] = api.encounterById.useSuspenseQuery(id);

  const { mutate: updateCreatureHasPlayedThisRound } =
    api.updateGroupTurn.useMutation({
      onSettled: async () => {
        return await encounterById.invalidate(id);
      },
    });

  return (
    <div>
      {encounter?.started_at ? (
        <Button
          onClick={() =>
            updateCreatureHasPlayedThisRound({
              encounter_id: id,
              participant_id: participant.id,
              has_played_this_round: !participant.has_played_this_round,
            })
          }
          variant={participant.has_played_this_round ? "default" : "outline"}
        >
          {participant.has_played_this_round ? "Played" : "Hasn't Played"}
        </Button>
      ) : null}

      <BattleCardLayout
        participant={participant}
        {...props}
        className={clsx(
          {
            "outline-zinc-900 outline": isSelected,
          },
          "cursor-pointer relative"
        )}
      >
        {participant?.minion_count && participant.minion_count > 1 ? (
          <MinionCardStack minionCount={participant.minion_count} />
        ) : null}
        <BattleCardStatusEffects participant={participant} />
        <BattleCardContent className="items-center">
          <BattleCardCreatureName participant={participant} />
          <BattleCardCreatureIcon className="w-32" participant={participant} />
          <BattleCardHealthAndStatus participant={participant} />
        </BattleCardContent>
      </BattleCardLayout>
    </div>
  );
}
