import { getEncounterData } from "@/server/api/utils";
import { Suspense } from "react";
import { PageRefresher } from "@/app/observe/[id]/page-refresher";
import React from "react";
import { SimpleBattleCard } from "./SimpleBattleCard";
import {
  EncounterCreature,
  EncounterWithParticipants,
} from "@/server/api/router";
import { Card } from "@/components/ui/card";
import clsx from "clsx";
import { CharacterIcon } from "@/encounters/[id]/character-icon";
import { HealthMeterOverlay } from "@/encounters/[id]/run/battle-ui";
import { GroupBattleLayout } from "@/encounters/[id]/run/group-battle-ui";

export default function ObservePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EncounterObserverView id={params.id} />
    </Suspense>
  );
}

async function EncounterObserverView({ id }: { id?: string }) {
  if (!id) {
    return <div>Provide an id in the url.</div>;
  }

  //TODO: we need to get the campaign data as well
  const encounter = await getEncounterData(id);

  if (!encounter) {
    return <div>Encounter not found.</div>;
  }

  return (
    <section className="flex flex-col gap-20 w-screen pt-10 items-center">
      <h1 className="text-xl">{encounter.name}</h1>
      <PageRefresher />
      <LinearObserve encounter={encounter} />
    </section>
  );
}

async function LinearObserve({
  encounter,
}: {
  encounter: EncounterWithParticipants;
}) {
  const activeIndex = encounter.participants.findIndex(
    (participant) => participant.is_active,
  );
  return (
    <div className={"flex margin-auto gap-3 overflow-auto max-w-full"}>
      {encounter.participants.map((participant, index) => {
        return (
          <SimpleBattleCard
            key={participant.id}
            participant={participant}
            activeIndex={activeIndex}
            encounter={encounter}
            index={index}
          />
        );
      })}
    </div>
  );
}

async function GroupObserve({
  encounter,
}: {
  encounter: EncounterWithParticipants;
}) {
  const monsters = encounter.participants.filter(
    (participant) => !participant.is_player,
  );
  const players = encounter.participants.filter(
    (participant) => participant.is_player,
  );

  return (
    <GroupBattleLayout
      monsters={monsters.map((monster) => (
        <SimpleGroupBattleCard key={monster.id} participant={monster} />
      ))}
      players={players.map((player) => (
        <SimpleGroupBattleCard key={player.id} participant={player} />
      ))}
    />
  );
}

function SimpleGroupBattleCard({
  participant,
}: {
  participant: EncounterCreature;
}) {
  return (
    <Card
      key={participant.id}
      data-active={participant.is_active}
      className={clsx(
        "w-40 shadow-lg border-2 relative select-none mb-8 rounded-sm justify-between overflow-hidden pt-3 gap-0 items-center flex flex-col transition-all",
        {
          "opacity-20": participant.has_played_this_round,
        },
      )}
    >
      <HealthMeterOverlay creature={participant} />
      {participant.creature_id === "pending" ? (
        <span>Loading</span>
      ) : (
        <CharacterIcon
          id={participant.creature_id}
          name={participant.name}
          width={400}
          height={400}
          className="h-60 object-cover"
        />
      )}
    </Card>
  );
}
