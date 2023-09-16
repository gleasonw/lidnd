"use client";

import Input from "@/app/components/Input";
import { useEncounterId } from "@/app/encounters/hooks";
import { updateEncounterCreature } from "../../data";
import { Button } from "@/components/ui/button";
import React from "react";

export default function InitiativeInput({ creature }: { creature: any }) {
  const [initiative, setInitiative] = React.useState(creature.initiative);
  const id = useEncounterId();

  return (
    <form
      action={async () =>
        await updateEncounterCreature(
          { ...creature, initiative: initiative },
          id
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
