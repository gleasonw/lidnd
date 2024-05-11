import { Card } from "@/components/ui/card";
import clsx from "clsx";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { Encounter, EncounterCreature } from "@/server/api/router";
import { CharacterIcon } from "@/encounters/[id]/character-icon";
import { HealthMeterOverlay } from "@/encounters/[id]/run/battle-ui";
import effectIconMap from "@/encounters/[id]/run/effectIconMap";
import { BasePopover } from "@/encounters/base-popover";

export interface SimpleBattleCardProps {
  children?: React.ReactNode;
  participant: EncounterCreature;
  activeIndex: number;
  encounter: Encounter;
  index: number;
}

export function SimpleBattleCard({
  participant,
  encounter,
  activeIndex,
  index,
}: SimpleBattleCardProps) {
  return (
    <div key={participant.id} className="flex flex-col items-center">
      <span className="flex flex-wrap h-12">
        {participant.status_effects.map((effect) => {
          return (
            <BasePopover
              key={effect.id}
              trigger={
                <Button variant="outline">
                  {effectIconMap[effect.name as keyof typeof effectIconMap]}
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
              (encounter?.current_round === 0 && !participant.has_surprise) ||
              index < activeIndex,
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
      <div className={"flex justify-center p-5"}>
        {participant.is_active && <ChevronUp />}
      </div>
    </div>
  );
}
