"use client";

import {
  EncounterCreature,
  useUpdateEncounterCreature,
} from "@/app/encounters/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function CreatureHealthForm({
  creature,
}: {
  creature: EncounterCreature;
}) {
  const [hpDiff, setHpDiff] = useState<string | number>("");
  const { mutate: edit } = useUpdateEncounterCreature();

  return (
    <>
      <Input
        placeholder="Modify HP"
        type="text"
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
        variant="default"
        className={"bg-red-700"}
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
        variant="default"
        className={"bg-green-700"}
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
    </>
  );
}
