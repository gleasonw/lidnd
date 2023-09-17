"use client";

import {
  EncounterCreature,
  updateEncounterCreature,
} from "@/app/encounters/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function CreatureHealthForm({
  creature,
  edit,
}: {
  creature: EncounterCreature;
  edit: (creature: EncounterCreature) => Promise<void>;
}) {
  const [hpDiff, setHpDiff] = useState<string | number>("");

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
      <form
        action={async () =>
          await edit({
            ...creature,
            hp: creature.hp - hpDiff,
          })
        }
      >
        <Button variant="default" className={"bg-red-700"}>
          Damage
        </Button>
      </form>
      <form
        action={async () =>
          await edit({
            ...creature,
            hp: creature.hp + hpDiff,
          })
        }
      >
        <Button variant="default" className={"bg-green-700"}>
          Heal
        </Button>
      </form>
    </>
  );
}
