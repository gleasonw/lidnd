import { getEncounterData } from "@/server/api/utils";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import clsx from "clsx";
import { ChevronUp } from "lucide-react";
import {
  HealthMeterOverlay,
  SimpleIconBattleCard,
} from "@/app/encounters/[id]/run/battle-ui";
import { PageRefresher } from "@/app/observe/[id]/page-refresher";
import { effectIconMap } from "@/app/encounters/[id]/run/effectIconMap";
import { BasePopover } from "@/app/encounters/base-popover";
import { Button } from "@/components/ui/button";
import Providers from "@/app/encounters/providers";

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
            <div key={participant.id} className="flex flex-col items-center">
              <span className="flex flex-wrap h-12">
                {participant.status_effects.map((effect) => {
                  return (
                    <BasePopover
                      key={effect.id}
                      trigger={
                        <Button variant="outline">
                          {
                            effectIconMap[
                              effect.name as keyof typeof effectIconMap
                            ]
                          }
                        </Button>
                      }
                      className="flex flex-col gap-2 text-sm"
                    >
                      <span>{effect.description}</span>
                      {!!effect.save_ends_dc && (
                        <span>Save ends ({effect.save_ends_dc})</span>
                      )}
                    </BasePopover>
                  );
                })}
              </span>
              <SimpleIconBattleCard
                creature={participant}
                index={index}
                activeIndex={activeIndex}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
