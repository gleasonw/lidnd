"use client";

import { HealthMeterOverlay } from "@/encounters/[encounter_index]/battle-ui";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { EffectIcon } from "@/encounters/[encounter_index]/status-input";
import type { ObserveEncounter } from "@/server/encounters";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import React from "react";

export function LinearObserve({ encounter }: { encounter: ObserveEncounter }) {
  const participants = EncounterUtils.participants(encounter);
  const activeIndex = participants.findIndex(
    (participant) => participant.is_active,
  );

  // scroll active participant into view
  React.useEffect(() => {
    const activeParticipant = document.querySelector('[data-is-active="true"]');
    if (!activeParticipant) {
      return;
    }
    activeParticipant.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIndex]);

  return (
    <div
      className={"flex margin-auto gap-0.5 lg:gap-3 overflow-auto max-w-full"}
    >
      {participants.map((p, index) => (
        <div key={p.id} data-is-active={p.is_active}>
          <div
            className={clsx(
              "w-32 border-8 flex-grow-0 flex justify-center items-center transition-all h-32 relative max-w-xs",
              p.is_active && "h-48",
              index < activeIndex
                ? "opacity-60 hover:opacity-100"
                : "hover:opacity-60",
            )}
            style={{ borderColor: ParticipantUtils.iconHexColor(p) }}
            key={p.id}
          >
            <HealthMeterOverlay participant={p} />
            <CreatureIcon
              creature={p.creature}
              size="medium"
              objectFit="contain"
            />
          </div>
          <ul>
            {p.status_effects.map((effect) => (
              <li key={effect.id} className="flex gap-2">
                <EffectIcon effect={effect.effect} />
                {effect.effect.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
