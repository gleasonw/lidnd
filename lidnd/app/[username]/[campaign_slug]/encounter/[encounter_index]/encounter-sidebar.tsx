"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import {
  EncounterReminderInput,
  EncounterStartButton,
  EncounterStats,
} from "@/encounters/[encounter_index]/encounter-prep";
import {
  useEncounter,
  useEncounterLink,
  useRemoveStatusEffect,
} from "@/encounters/[encounter_index]/hooks";
import {
  EffectIcon,
  StatusInput,
} from "@/encounters/[encounter_index]/status-input";
import { BasePopover } from "@/encounters/base-popover";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantEffectUtils } from "@/utils/participantEffects";
import clsx from "clsx";
import { PanelRightClose, PanelRightOpen, Play } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export function EncounterSidebar() {
  const runLink = useEncounterLink("run");
  const [encounter] = useEncounter();

  const url = usePathname();
  const status = url.split("/").at(-1);

  if (status === "run") {
    return <StatusEffectSidebar />;
  }

  return (
    <div className="pl-7 pt-5 w-[300px] hidden md:flex border-l mr-2">
      <div className="flex-col gap-5 flex">
        {encounter?.started_at ? (
          <Link href={runLink}>
            <Button>
              <Play />
              Continue the battle!
            </Button>
          </Link>
        ) : (
          <EncounterStartButton />
        )}
        <EncounterStats />
        <EncounterReminderInput />
      </div>
    </div>
  );
}

function StatusEffectSidebar() {
  const [isOpen, setIsOpen] = React.useState(true);
  const [encounter] = useEncounter();
  const players = EncounterUtils.players(encounter);
  const { mutate: removeStatusEffect } = useRemoveStatusEffect();
  return (
    <div
      className={clsx(
        "flex flex-col gap-5 border-l transition-all items-center flex-shrink-0",
        {
          "w-[400px]": isOpen,
          "w-14": !isOpen,
        },
      )}
    >
      <div className="flex flex-col gap-5 items-center justify-center w-full">
        {isOpen && <h1 className="text-xl">Player status effects</h1>}
        <Button variant="ghost" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <PanelRightClose /> : <PanelRightOpen />}
        </Button>
        {isOpen && (
          <div className="flex flex-col gap-5 w-full px-5">
            {players.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 w-full">
                <div key={p.id} className="flex gap-2">
                  <CreatureIcon
                    creature={p.creature}
                    size="small"
                    objectFit="contain"
                  />
                  <span
                    className={clsx(
                      {
                        "text-2xl": p.is_active,
                        "text-lg": !p.is_active,
                      },
                      "transition-all",
                    )}
                  >
                    {p.creature.name}
                  </span>
                </div>
                <StatusInput participant={p} />
                {p.status_effects?.length > 0 && (
                  <ul className="text-left overflow-hidden p-3">
                    {p.status_effects.map((se) => (
                      <li
                        key={se.id}
                        className="flex gap-2 items-center w-full"
                      >
                        <BasePopover
                          trigger={
                            <button className="flex gap-2 items-center">
                              <EffectIcon effect={se.effect} />
                              <span>
                                {se.effect.name}{" "}
                                {se.save_ends_dc
                                  ? `(${se.save_ends_dc})`
                                  : null}
                              </span>
                            </button>
                          }
                        >
                          {ParticipantEffectUtils.description(se)}
                        </BasePopover>
                        <Button
                          onClick={() => removeStatusEffect(se)}
                          variant="ghost"
                          className="opacity-50 ml-auto"
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Separator />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
