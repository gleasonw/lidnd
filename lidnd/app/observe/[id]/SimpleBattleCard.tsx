import { Card } from "@/components/ui/card";
import clsx from "clsx";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { ParticipantWithData } from "@/server/api/router";
import { BasePopover } from "@/app/[username]/[campaign_slug]/encounter/base-popover";
import { ParticipantEffectUtils } from "@/utils/participantEffects";
import { ParticipantUtils } from "@/utils/participants";
import { HealthMeterOverlay } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/battle-ui";
import { CharacterIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import effectIconMap from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/effectIconMap";

export interface SimpleBattleCardProps {
  children?: React.ReactNode;
  participant: ParticipantWithData;
  activeIndex: number;
  encounter: { current_round?: number };
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
                  {
                    effectIconMap[
                      ParticipantEffectUtils.name(
                        effect,
                      ) as keyof typeof effectIconMap
                    ]
                  }
                </Button>
              }
              className="flex flex-col gap-2 text-sm"
            >
              <span>{ParticipantEffectUtils.description(effect)}</span>
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
      <div className={"flex justify-center p-5"}>
        {participant.is_active && <ChevronUp />}
      </div>
    </div>
  );
}
