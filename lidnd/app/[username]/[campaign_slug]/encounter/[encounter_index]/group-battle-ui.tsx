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
import { ParticipantWithData } from "@/server/api/router";
import { api } from "@/trpc/react";
import clsx from "clsx";
import React from "react";
import { AnimatePresence } from "framer-motion";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { OriginalSizeImage } from "@/app/[username]/[campaign_slug]/encounter/original-size-image";
import { getAWSimageURL } from "@/app/[username]/[campaign_slug]/encounter/utils";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";

export function GroupBattleUI() {
  const id = useEncounterId();
  const { data: encounter } = api.encounterById.useQuery(id);

  const [dmSelectedCreature, setDmSelectedCreature] = React.useState<
    string | null
  >(encounter?.participants.at(0)?.id ?? null);
  if (!encounter) return null;

  const monsters = EncounterUtils.monsters(encounter);
  const players = EncounterUtils.allies(encounter);

  const selectedMonster = monsters.find(
    (monster) => monster.id === dmSelectedCreature,
  );

  return (
    <div>
      <GroupBattleLayout
        monsters={monsters.map((monster, index) => (
          <GroupBattleCard
            key={monster.id + index}
            onClick={() => setDmSelectedCreature(monster.id)}
            participant={monster}
            isSelected={monster.id === dmSelectedCreature}
          />
        ))}
        players={players.map((player, index) => (
          <GroupBattleCard
            key={player.id + index}
            participant={player}
            isSelected={player.id === dmSelectedCreature}
          />
        ))}
      >
        {selectedMonster && (
          <OriginalSizeImage
            src={getAWSimageURL(selectedMonster.creature_id, "stat_block")}
            alt={"stat block for " + ParticipantUtils.name(selectedMonster)}
          />
        )}
      </GroupBattleLayout>
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
  children,
  className,
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
        {...props}
        className={clsx(
          {
            "opacity-40":
              !(encounter?.current_round === 0 && participant.has_surprise) &&
              participant.has_played_this_round,
            "outline-zinc-900 outline": isSelected,
          },
          "cursor-pointer relative",
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
