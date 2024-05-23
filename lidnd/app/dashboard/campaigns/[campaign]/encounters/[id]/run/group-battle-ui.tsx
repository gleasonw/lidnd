"use client";

import {
  BattleCardContent,
  BattleCardCreatureIcon,
  BattleCardCreatureName,
  BattleCardHealthAndStatus,
  BattleCardLayout,
  BattleCardStatusEffects,
  MinionCardStack,
  useBattleUIStore,
} from "./battle-ui";
import { useEncounterId } from "../hooks";
import { Button } from "@/components/ui/button";
import { ParticipantCreature } from "@/server/api/router";
import { api } from "@/trpc/react";
import clsx from "clsx";
import React from "react";
import { OriginalSizeImage } from "../../original-size-image";
import { getAWSimageURL } from "../../utils";
import { AnimatePresence } from "framer-motion";

export function GroupBattleUI() {
  const id = useEncounterId();
  const { data: encounter } = api.encounterById.useQuery(id);

  const [dmSelectedCreature, setDmSelectedCreature] = React.useState<
    string | null
  >(encounter?.participants.at(0)?.id ?? null);
  if (!encounter) return null;
  const monsters = encounter.participants.filter(
    (participant) => !participant.is_player && !participant.is_ally,
  );
  const players = encounter.participants.filter(
    (participant) => participant.is_player || participant.is_ally,
  );

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
            creature={monster}
            isSelected={monster.id === dmSelectedCreature}
          />
        ))}
        players={players.map((player, index) => (
          <GroupBattleCard
            key={player.id + index}
            creature={player}
            isSelected={player.id === dmSelectedCreature}
          />
        ))}
      >
        {selectedMonster && (
          <OriginalSizeImage
            src={getAWSimageURL(selectedMonster.creature_id, "stat_block")}
            alt={"stat block for " + selectedMonster.name}
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
          {playerTitle}
          <div className="flex overflow-auto max-w-full gap-4 pb-2 px-2">
            {players}
          </div>
          {monsterTitle}
          <div className="flex overflow-auto max-w-full gap-4 pb-2 px-2">
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
  creature: ParticipantCreature;
  className?: string;
  isSelected?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export function GroupBattleCard({
  creature,
  children,
  className,
  isSelected,
  ...props
}: GroupBattleCardProps) {
  const id = useEncounterId();
  const { encounterById } = api.useUtils();
  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const [reminders] = api.encounterReminders.useSuspenseQuery(id);

  const { displayReminders } = useBattleUIStore();

  const { mutate: updateCreatureHasPlayedThisRound } =
    api.updateGroupTurn.useMutation({
      onSettled: async () => {
        displayReminders(encounter, reminders);

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
              participant_id: creature.id,
              has_played_this_round: !creature.has_played_this_round,
            })
          }
          variant={creature.has_played_this_round ? "default" : "outline"}
        >
          {creature.has_played_this_round ? "Played" : "Hasn't Played"}
        </Button>
      ) : null}

      <BattleCardLayout
        {...props}
        className={clsx(
          {
            "opacity-40":
              !(encounter?.current_round === 0 && creature.has_surprise) &&
              creature.has_played_this_round,
            "outline-zinc-900 outline": isSelected,
          },
          "cursor-pointer relative",
        )}
      >
        {creature?.minion_count && creature.minion_count > 1 ? (
          <MinionCardStack minionCount={creature.minion_count} />
        ) : null}
        <BattleCardStatusEffects creature={creature} />
        <BattleCardContent className="items-center">
          <BattleCardCreatureName participant={creature} />
          <BattleCardCreatureIcon className="w-32" participant={creature} />
          <BattleCardHealthAndStatus creature={creature} />
        </BattleCardContent>
      </BattleCardLayout>
    </div>
  );
}
