import { Suspense } from "react";
import React from "react";
import type { ParticipantWithData } from "@/server/api/router";
import { Card } from "@/components/ui/card";
import clsx from "clsx";
import { EncounterUtils } from "@/utils/encounters";
import { ServerEncounter, type ObserveEncounter } from "@/server/encounters";
import { CreatureIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { GroupBattleLayout } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/group-battle-ui";
import { PageRefresher } from "@/app/observe/[id]/page-refresher";
import { LinearObserve } from "@/app/observe/[id]/linear-observe-client";

export default async function ObservePage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EncounterObserverView id={params.id} />
    </Suspense>
  );
}

async function EncounterObserverView({ id }: { id?: string }) {
  console.log("rendering observer view");
  if (!id) {
    return <div>Provide an id in the url.</div>;
  }

  const encounter = await ServerEncounter.encounterWithCampaign(id);

  if (!encounter) {
    return <div>Encounter not found.</div>;
  }

  return (
    <section className="flex flex-col gap-10 lg:gap-20 w-screen pt-5 lg:pt-10 px-2">
      <h1 className="text-3xl font-bold">Round {encounter.current_round}</h1>
      <PageRefresher />
      {EncounterUtils.initiativeType(encounter) === "linear" ? (
        <LinearObserve encounter={encounter} />
      ) : (
        <GroupObserve encounter={encounter} />
      )}
    </section>
  );
}

async function GroupObserve({ encounter }: { encounter: ObserveEncounter }) {
  const monsters = EncounterUtils.monsters(encounter);
  const players = EncounterUtils.allies(encounter);

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
  participant: ParticipantWithData;
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
      {participant.creature_id === "pending" ? (
        <span>Loading</span>
      ) : (
        <CreatureIcon creature={participant.creature} size="medium" />
      )}
    </Card>
  );
}
