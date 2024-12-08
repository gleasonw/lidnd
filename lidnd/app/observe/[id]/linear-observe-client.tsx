"use client";

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
      behavior: "instant",
      block: "center",
    });
  }, [activeIndex]);

  return (
    <>
      <div
        className={`flex z-20 gap-1 w-full max-w-full overflow-auto mx-auto`}
      >
        {participants.map((p, index) => (
          <div
            className={clsx(
              "flex-1 flex flex-col p-1 text-white h-44 max-w-xs shadow-lg",
              ParticipantUtils.isFriendly(p) ? `bg-blue-900` : `bg-red-900`,
              p.is_active && "h-60",
              index < activeIndex
                ? "opacity-60 hover:opacity-100"
                : "hover:opacity-60",
            )}
            key={p.id}
            data-is-active={p.is_active}
          >
            <div className="flex justify-between w-full">
              <span className="text-2xl font-bold">{p.initiative}</span>
              <div className="relative w-16 h-16">
                <CreatureIcon
                  creature={p.creature}
                  size="medium"
                  objectFit="contain"
                />
              </div>
            </div>
            <div className="w-10">
              <span className={`text-2xl text-white max-w-full`}>
                {p.creature.name}
              </span>
            </div>

            <div className="flex gap-1 overflow-auto">
              {p.status_effects.map((effect) => (
                <div
                  key={effect.id}
                  className="flex gap-2 items-center bg-white"
                  style={{ borderColor: ParticipantUtils.iconHexColor(p) }}
                >
                  <EffectIcon effect={effect.effect} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
