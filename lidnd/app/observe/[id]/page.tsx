import { Suspense } from "react";
import { PageRefresher } from "@/app/observe/[id]/page-refresher";
import React from "react";
import { ParticipantWithData } from "@/server/api/router";
import { Card } from "@/components/ui/card";
import clsx from "clsx";
import { EncounterUtils } from "@/utils/encounters";
import { ServerEncounter, ObserveEncounter } from "@/server/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { HealthMeterOverlay } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/battle-ui";
import { CharacterIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { GroupBattleLayout } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/group-battle-ui";

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

  const encounter = await ServerEncounter.encounterWithCampaign(id);

  if (!encounter) {
    return <div>Encounter not found.</div>;
  }

  return (
    <section className="flex flex-col gap-20 w-screen pt-10 items-center">
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

async function LinearObserve({ encounter }: { encounter: ObserveEncounter }) {
  const participants = EncounterUtils.participants(encounter);
  const activeIndex = participants.findIndex(
    (participant) => participant.is_active,
  );
  return (
    <div className={"flex margin-auto gap-1 md:gap-3 overflow-auto max-w-full"}>
      {participants.map((p, index) => (
        <div
          className={clsx(
            "w-32 border-4 flex-grow-0 flex justify-center items-center transition-all h-32 relative",
            ParticipantUtils.isFriendly(p)
              ? "border-blue-600"
              : "border-red-600",
            p.is_active && "h-48",
            index < activeIndex
              ? "opacity-60 hover:opacity-100"
              : "hover:opacity-60",
          )}
          key={p.id}
        >
          <HealthMeterOverlay participant={p} />
          <CharacterIcon
            className="object-contain max-h-full max-w-full"
            id={p.creature_id}
            name={ParticipantUtils.name(p)}
            size="none"
          />
        </div>
      ))}
    </div>
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
      <HealthMeterOverlay participant={participant} />
      {participant.creature_id === "pending" ? (
        <span>Loading</span>
      ) : (
        <CharacterIcon
          id={participant.creature_id}
          name={ParticipantUtils.name(participant)}
          className="h-60 object-cover"
        />
      )}
    </Card>
  );
}
