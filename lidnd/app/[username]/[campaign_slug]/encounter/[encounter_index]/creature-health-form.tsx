"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ParticipantWithData, Participant } from "@/server/api/router";
import { useState } from "react";
import { toNumber } from "lodash";
import { ParticipantUtils } from "@/utils/participants";
import {
  useUpdateEncounterParticipant,
  useUpdateEncounterMinionParticipant,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import { useDebouncedCallback } from "use-debounce";
import React from "react";
import { Heart, Minus, Plus, Shield, Sword } from "lucide-react";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { LidndPopover } from "@/encounters/base-popover";

export function ParticipantHealthForm({
  participant,
}: {
  participant: ParticipantWithData;
}) {
  const [hpDiff, setHpDiff] = useState<string | number>("");
  const [tempHpDiff, setTempHpDiff] = useState<number | string>("");
  const setTempHp = useDebouncedCallback((tempHp: number) => {
    edit({
      ...participant,
      temporary_hp: tempHp,
    });
  }, 300);

  const { mutate: edit, isPending: isLoading } =
    useUpdateEncounterParticipant();

  if (isMinion(participant)) {
    return <MinionHealthForm participant={participant} />;
  }

  function handleHPChange(updatedHp: number) {
    if (isLoading) {
      return;
    }

    const hpDiff = participant.hp - updatedHp;

    if (participant.temporary_hp === 0 || hpDiff <= 0) {
      return edit({
        ...participant,
        hp: updatedHp,
      });
    }

    if (hpDiff >= participant.temporary_hp) {
      setTempHp(0);
      return edit({
        ...participant,
        hp: participant.hp - (hpDiff - participant.temporary_hp),
        temporary_hp: 0,
      });
    }

    // the damage is less than the temporary hp
    setTempHp(participant.temporary_hp - hpDiff);
    edit({
      ...participant,
      temporary_hp: participant.temporary_hp - hpDiff,
    });
  }

  const hpPercent = ParticipantUtils.healthPercent(participant);

  return (
    <div className="flex flex-wrap gap-5 w-full">
      <div className="flex max-w-full w-full gap-2">
        <span className="w-full h-10 shadow-md relative border bg-red-100">
          <span
            className={`absolute bg-green-500 h-full transition-all`}
            style={{
              width: `${hpPercent}%`,
            }}
          />
          <span
            className={`absolute bg-blue-500 h-full transition-all z-10`}
            style={{
              width: `${ParticipantUtils.tempHpPercent(participant) * 100}%`,
            }}
          />
          <span className="flex w-full items-center justify-center h-full">
            <span className="z-10 text-xl text-white">
              {participant.hp} / {ParticipantUtils.maxHp(participant)}
            </span>
          </span>
        </span>
        <LidndPopover
          trigger={
            <Button variant="outline" className="bg-blue-100 text-blue-700">
              <Shield /> Temp
            </Button>
          }
        >
          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setTempHp(
                  typeof tempHpDiff === "number"
                    ? participant.temporary_hp - tempHpDiff
                    : participant.temporary_hp,
                );
              }}
            >
              <Minus />
            </Button>
            <LidndTextInput
              variant="ghost"
              placeholder="Temp HP"
              type="number"
              className="w-32 text-sm"
              value={tempHpDiff}
              onChange={(e) => {
                if (!isNaN(parseInt(e.target.value))) {
                  setTempHpDiff(parseInt(e.target.value));
                } else {
                  setTempHpDiff("");
                }
              }}
            />
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setTempHp(
                  typeof tempHpDiff === "number"
                    ? participant.temporary_hp + tempHpDiff
                    : participant.temporary_hp,
                );
              }}
            >
              <Plus />
            </Button>
          </div>
        </LidndPopover>
      </div>
      <div className="flex flex-wrap gap-8">
        <div className="flex gap-4 text-2xl">
          <Input
            placeholder="HP"
            type="number"
            className="w-32"
            value={hpDiff}
            onChange={(e) => {
              if (!isNaN(parseInt(e.target.value))) {
                setHpDiff(parseInt(e.target.value));
              } else {
                setHpDiff("");
              }
            }}
          />
          <Button
            variant="outline"
            className={"bg-red-100 text-red-700 gap-3 flex items-center"}
            onClick={(e) => {
              e.stopPropagation();
              handleHPChange(
                typeof hpDiff === "number"
                  ? participant.hp - hpDiff
                  : participant.hp,
              );
            }}
          >
            <Sword /> Damage
          </Button>
          <Button
            variant="outline"
            className={"bg-green-100 text-green-700 gap-3 flex items-center"}
            onClick={(e) => {
              e.stopPropagation();
              handleHPChange(
                typeof hpDiff === "number"
                  ? participant.hp + hpDiff
                  : participant.hp,
              );
            }}
          >
            <Heart /> Heal
          </Button>
        </div>
      </div>
    </div>
  );
}

function isMinion(participant: Participant): participant is Minion {
  if (participant.minion_count) {
    return true;
  }
  return false;
}

export type Minion = ParticipantWithData & { minion_count: number };

export interface MinionHealthFormProps {
  participant: Minion;
}

export function MinionHealthForm({ participant }: MinionHealthFormProps) {
  const [damage, setDamage] = useState<string | number>("");
  const [extraMinionsInRange, setExtraMinionsInRange] = useState<
    number | string
  >("");
  const { mutate: edit, isPending: isLoading } =
    useUpdateEncounterMinionParticipant();
  const [isDoingDamage, setIsDoingDamage] = useState(false);

  function handleHPChange() {
    edit({
      ...participant,
      damage: toNumber(damage),
      minions_in_overkill_range: toNumber(extraMinionsInRange),
    });
    setDamage(0);
    setExtraMinionsInRange(0);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4">
        {isDoingDamage ? (
          <span className="flex items-center gap-3">
            <Button
              disabled={isLoading}
              className={"bg-rose-800"}
              onClick={(e) => {
                e.stopPropagation();
                handleHPChange();
                setIsDoingDamage(false);
              }}
            >
              Damage
            </Button>
            <Input
              placeholder="Overkill range"
              type="number"
              value={extraMinionsInRange}
              onChange={(e) => {
                if (!isNaN(parseInt(e.target.value))) {
                  setExtraMinionsInRange(parseInt(e.target.value));
                } else {
                  setExtraMinionsInRange(0);
                }
              }}
            />
          </span>
        ) : (
          <span className="flex gap-3 items-center">
            <Button
              className={"bg-rose-800"}
              onClick={(e) => {
                e.stopPropagation();
                setIsDoingDamage(true);
              }}
            >
              Damage
            </Button>
            <Input
              placeholder="HP"
              type="number"
              value={damage}
              onChange={(e) => {
                if (!isNaN(parseInt(e.target.value))) {
                  setDamage(parseInt(e.target.value));
                } else {
                  setDamage(0);
                }
              }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
