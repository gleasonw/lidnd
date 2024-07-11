"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ParticipantWithData, Participant } from "@/server/api/router";
import { useState } from "react";
import { toNumber } from "lodash";
import { ParticipantUtils } from "@/utils/participants";
import {
  useUpdateEncounterParticipant,
  useUpdateEncounterMinionParticipant,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";

export function ParticipantHealthForm({
  participant,
}: {
  participant: ParticipantWithData;
}) {
  const [hpDiff, setHpDiff] = useState<string | number>("");
  const { mutate: edit, isPending: isLoading } =
    useUpdateEncounterParticipant();

  if (isMinion(participant)) {
    return <MinionHealthForm participant={participant} />;
  }

  function handleHPChange(hp: number) {
    edit({
      ...participant,
      hp,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4">
        <Button
          disabled={isLoading}
          variant="default"
          className={"bg-rose-800"}
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

        <Button
          disabled={isLoading}
          variant="default"
          className={"bg-lime-800"}
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
      <span className="whitespace-nowrap font-bold text-lg text-center">
        {participant.hp} / {ParticipantUtils.maxHp(participant)}
      </span>
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
              placeholder="Additional minions in range (overkill)?"
              type="number"
              className="w-60"
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
