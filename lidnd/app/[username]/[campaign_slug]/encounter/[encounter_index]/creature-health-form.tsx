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

export function ParticipantHealthForm({
  participant,
}: {
  participant: ParticipantWithData;
}) {
  const [hpDiff, setHpDiff] = useState<string | number>("");
  const [tempHp, setTempHp] = useState<number>(participant.temporary_hp);

  const { mutate: edit, isPending: isLoading } =
    useUpdateEncounterParticipant();

  if (isMinion(participant)) {
    return <MinionHealthForm participant={participant} />;
  }

  function handleHPChange(updatedHp: number) {
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

  const handleTempHpChange = useDebouncedCallback((tempHp: number) => {
    edit({
      ...participant,
      temporary_hp: tempHp,
    });
  }, 300);

  return (
    <div className="grid grid-cols-3 gap-1">
      <div className="flex flex-col gap-1">
        <Button
          disabled={isLoading}
          variant="default"
          className={"bg-lime-800 h-7"}
          onClick={(e) => {
            e.stopPropagation();
            handleHPChange(
              typeof hpDiff === "number"
                ? participant.hp + hpDiff
                : participant.hp,
            );
          }}
        >
          Heal
        </Button>
        <Input
          placeholder="HP"
          type="number"
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
          disabled={isLoading}
          variant="default"
          className={"bg-rose-800 h-7"}
          onClick={(e) => {
            e.stopPropagation();
            handleHPChange(
              typeof hpDiff === "number"
                ? participant.hp - hpDiff
                : participant.hp,
            );
          }}
        >
          Damage
        </Button>
      </div>
      {!ParticipantUtils.isPlayer(participant) && (
        <span className="whitespace-nowrap text-xl text-center flex justify-center items-center">
          {participant.hp} / {ParticipantUtils.maxHp(participant)}
        </span>
      )}
      <label>
        Temp
        <Input
          placeholder="Temp hp"
          type="number"
          value={tempHp}
          onChange={(e) => {
            if (!isNaN(parseInt(e.target.value))) {
              setTempHp(parseInt(e.target.value));
              handleTempHpChange(parseInt(e.target.value));
            } else {
              setTempHp(0);
              handleTempHpChange(0);
            }
          }}
        />
      </label>
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
