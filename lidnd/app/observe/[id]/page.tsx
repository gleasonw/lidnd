import { getEncounterData } from "@/server/api/utils";
import { Suspense } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageRefresher } from "@/app/observe/[id]/page-refresher";

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
  const encounter = await getEncounterData(id);
  if (!encounter) {
    return <div>Encounter not found.</div>;
  }
  const activeIndex = encounter.participants.findIndex(
    (participant) => participant.is_active
  );
  return (
    <section className="flex flex-col gap-20 w-screen h-screen items-center justify-center">
      <h1 className="text-xl">{encounter.name}</h1>
      <PageRefresher />
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
    </section>
  );
}

import React from "react";
import { Encounter, EncounterCreature } from "@/server/api/router";
import { SimpleBattleCard } from "./SimpleBattleCard";
