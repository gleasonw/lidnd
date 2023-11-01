"use client";

import {
  EncounterCreature,
  useUpdateEncounterCreature,
} from "@/app/dashboard/encounters/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function CreatureHealthForm({
  creature,
}: {
  creature: EncounterCreature;
}) {
  const [hpDiff, setHpDiff] = useState<string | number>("");
  const { mutate: edit, isPending } = useUpdateEncounterCreature();

  return (
    <div className="flex gap-4">
      <Input
        placeholder="Modify HP"
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
        disabled={isPending}
        variant="default"
        className={"bg-rose-800"}
        onClick={(e) => {
          e.stopPropagation();
          edit({
            ...creature,
            hp: typeof hpDiff === "number" ? creature.hp - hpDiff : creature.hp,
          });
        }}
      >
        Damage
      </Button>
      <Button
        disabled={isPending}
        variant="default"
        className={"bg-lime-800"}
        onClick={(e) => {
          e.stopPropagation();
          edit({
            ...creature,
            hp: typeof hpDiff === "number" ? creature.hp + hpDiff : creature.hp,
          });
        }}
      >
        Heal
      </Button>
    </div>
  );
}
