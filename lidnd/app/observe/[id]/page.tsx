import { getEncounterData } from "@/server/api/utils";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import clsx from "clsx";
import { ChevronUp } from "lucide-react";
import { HealthMeterOverlay } from "@/app/encounters/[id]/run/battle-ui";
import { PageRefresher } from "@/app/observe/[id]/page-refresher";
import { effectIconMap } from "@/app/encounters/[id]/run/effectIconMap";
import { BasePopover } from "@/app/encounters/base-popover";
import { Button } from "@/components/ui/button";

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
      <div className={"flex items-center gap-3 overflow-auto"}>
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
              <Card
                key={participant.id}
                data-active={participant.is_active}
                className={clsx(
                  "w-28 h-40 shadow-lg border-2 relative select-none mb-8 rounded-sm justify-between overflow-hidden pt-3 gap-0 items-center flex flex-col transition-all",
                  {
                    "h-48 mb-0": participant.is_active,
                    "opacity-40":
                      (encounter?.current_round === 0 &&
                        !participant.has_surprise) ||
                      index < activeIndex,
                  }
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
              <div className={"flex justify-center p-5"}>
                {participant.is_active && <ChevronUp />}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
