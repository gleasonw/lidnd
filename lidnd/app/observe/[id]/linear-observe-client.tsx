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
      behavior: "instant",
      block: "center",
    });
  }, [activeIndex]);

  const enemies = participants.filter((p) => !ParticipantUtils.isFriendly(p));

  return (
    <>
      <div
        className={`flex flex-grow-0 z-20 gap-1 w-full max-w-full overflow-auto mx-auto`}
      >
        {participants.map((p, index) => (
          <div key={p.id} data-is-active={p.is_active}>
            <div
              className={clsx(
                "w-32 flex-grow-0 flex flex-col p-1 text-white h-44 max-w-xs shadow-lg",
                ParticipantUtils.isFriendly(p) ? `bg-blue-900` : `bg-red-900`,
                p.is_active && "h-60",
                index < activeIndex
                  ? "opacity-60 hover:opacity-100"
                  : "hover:opacity-60",
              )}
              key={p.id}
            >
              <div className="flex justify-between w-full">
                <span className="text-2xl font-bold">{p.initiative}</span>
                <div className="relative w-16 h-16">
                  <HealthMeterOverlay participant={p} />
                  <CreatureIcon
                    creature={p.creature}
                    size="medium"
                    objectFit="contain"
                  />
                </div>
              </div>
              <span className={`text-2xl text-white`}>{p.creature.name}</span>
              <div className="flex gap-1 overflow-auto">
                {p.status_effects.map((effect) => (
                  <div
                    key={effect.id}
                    className="flex gap-2 items-center"
                    style={{ borderColor: ParticipantUtils.iconHexColor(p) }}
                  >
                    <EffectIcon effect={effect.effect} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col">
        <div className="space-y-4">
          {enemies.map((enemy) => (
            <div key={enemy.id} className="relative">
              {/* Enemy Name and Level */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-lg font-semibold">
                  {enemy.creature.name}
                </span>
                <div className="flex gap-2">
                  {enemy.status_effects.map((effect, index) => (
                    <span
                      key={index}
                      className="text-sm flex items-center px-2 py-1 rounded border shadow-lg"
                    >
                      {effect.effect.name}
                      <EffectIcon effect={effect.effect} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Health Bar Container */}
              <div className="h-4 bg-gray-700 rounded relative overflow-hidden">
                {/* Red Health Bar (Animation) */}
                <div
                  className="absolute h-full bg-red-600 duration-700"
                  style={{
                    width: ParticipantUtils.healthPercent(enemy) + "%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
