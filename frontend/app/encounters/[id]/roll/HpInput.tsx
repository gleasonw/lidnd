"use client";

import Input from "@/app/components/Input";
import { useEncounterId } from "@/app/encounters/hooks";
import { updateEncounterCreature } from "../../data";
import React from "react";

export default function HpInput({ creature }: { creature: any }) {
  const [hp, setHp] = React.useState(creature.hp);
  const id = useEncounterId();

  return (
    <form
      action={async () =>
        await updateEncounterCreature({ ...creature, hp: hp }, id)
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
