"use client";

import { Input } from "@/components/ui/input";
import { useEncounterId } from "@/app/dashboard/hooks";
import { EncounterCreature, updateEncounterCreature } from "../../api";
import React from "react";

export default function HpInput({ creature }: { creature: EncounterCreature }) {
  const [hp, setHp] = React.useState<string | number>(creature.hp);
  const id = useEncounterId();

  return (
    <form
      action={async () =>
        await updateEncounterCreature(
          { creature_id: creature.creature_id, encounter_id: id },
          creature
        )
      }
    >
      <Input
        value={hp}
        onChange={(e) =>
          setHp(!isNaN(parseInt(e.target.value)) ? e.target.value : "")
        }
        placeholder="HP"
        type="text"
      />
      <button type="submit" className="p-5 border">
        Update HP
      </button>
    </form>
  );
}
