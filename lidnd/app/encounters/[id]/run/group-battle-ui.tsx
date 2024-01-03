"use client";

import {
  BattleCard,
  BattleCardContent,
  BattleCardCreatureIcon,
  BattleCardCreatureName,
  BattleCardHealthAndStatus,
  BattleCardLayout,
  BattleCardStatusEffects,
  InitiativeTypeToggle,
  MinionCardStack,
} from "@/app/encounters/[id]/run/battle-ui";
import { useEncounterId } from "@/app/encounters/hooks";
import { CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Encounter, EncounterCreature } from "@/server/api/router";
import { api } from "@/trpc/react";
import clsx from "clsx";
import React from "react";
import { OriginalSizeImage } from "@/app/encounters/original-size-image";
import { getAWSimageURL } from "@/app/encounters/utils";
import { Skull, Sword } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface GroupBattleUIProps {
  children?: React.ReactNode;
}

export function GroupBattleUI({ children }: GroupBattleUIProps) {
  const id = useEncounterId();
  const { data: encounter } = api.encounterById.useQuery(id);

  const [dmSelectedCreature, setDmSelectedCreature] = React.useState<
    string | null
  >(encounter?.participants.at(0)?.id ?? null);
  if (!encounter) return null;
  const monsters = encounter.participants.filter(
    (participant) => !participant.is_player
  );
  const players = encounter.participants.filter(
    (participant) => participant.is_player
  );

  const selectedMonster = monsters.find(
    (monster) => monster.id === dmSelectedCreature
  );
  return (
    <div>
      <GroupBattleLayout
        encounter={encounter}
        monsters={monsters.map((monster) => (
          <GroupBattleCard
            key={monster.id}
            onClick={() => setDmSelectedCreature(monster.id)}
            creature={monster}
            isSelected={monster.id === dmSelectedCreature}
          />
        ))}
        players={players.map((player) => (
          <GroupBattleCard
            key={player.id}
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
  encounter,
  children,
  ...props
}: {
  monsters: React.ReactNode;
  players: React.ReactNode;
  encounter: Encounter;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="flex flex-col justify-center" {...props}>
      <div className="flex gap-4 flex-col">
        <div className="flex overflow-auto max-w-full gap-4 pb-2 px-2 mx-auto">
          {monsters}
        </div>
        {children}
        <Separator />
        <div className="flex overflow-auto max-w-full gap-4 pb-2 px-2 mx-auto">
          {players}
        </div>
      </div>
    </div>
  );
}

export type GroupBattleCardProps = {
  children?: React.ReactNode;
  creature: EncounterCreature;
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
  const { mutate: updateCreatureHasPlayedThisRound } =
    api.updateGroupTurn.useMutation({
      onSettled: async () => {
        return await encounterById.invalidate(id);
      },
    });

  return (
    <div>
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
      <BattleCardLayout
        {...props}
        className={clsx(
          {
            "opacity-40":
              !(encounter?.current_round === 0 && creature.has_surprise) &&
              creature.has_played_this_round,
            "outline-zinc-900 outline": isSelected,
          },
          "cursor-pointer relative"
        )}
      >
        {creature?.minion_count && creature.minion_count > 1 ? (
          <MinionCardStack minionCount={creature.minion_count} />
        ) : null}
        <BattleCardStatusEffects creature={creature} />
        <BattleCardContent className="items-center">
          <BattleCardCreatureName creature={creature} />
          <BattleCardCreatureIcon className="w-32" creature={creature} />
          <BattleCardHealthAndStatus creature={creature} />
        </BattleCardContent>
      </BattleCardLayout>
    </div>
  );
}
