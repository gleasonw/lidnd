"use client";

import { Input } from "@/components/ui/input";
import { useEncounterId } from "@/app/encounters/hooks";
import {
  EncounterCreature,
  updateEncounterCreature,
} from "../../api";
import { Button } from "@/components/ui/button";
import React from "react";

export default function InitiativeInput({
  creature,
}: {
  creature: EncounterCreature;
}) {
  const [initiative, setInitiative] = React.useState<string | number>(
    creature.initiative
  );
  const id = useEncounterId();

  return (
    <form
      action={async () =>
        await updateEncounterCreature(
          { creature_id: creature.id, encounter_id: id },
          creature
        )
      }
    >
      <Input
        value={initiative}
        onChange={(e) =>
          setInitiative(!isNaN(parseInt(e.target.value)) ? e.target.value : "")
        }
        placeholder="Initiative"
        type="text"
      />
      <Button type="submit" variant="secondary">
        Update initiative
      </Button>
    </form>
  );
}
