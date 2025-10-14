"use client";

import { Button } from "@/components/ui/button";
import { CreateEncounterForm } from "@/encounters/campaign-encounters-overview";
import { Plus } from "lucide-react";
import React from "react";

export function CreateEncounterButton({
  gameSessionId,
}: {
  gameSessionId: string;
}) {
  const [isCreating, setIsCreating] = React.useState(false);

  if (!isCreating) {
    return (
      <Button variant="secondary" onClick={() => setIsCreating(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Encounter
      </Button>
    );
  }
  return (
    <CreateEncounterForm
      gameSessionId={gameSessionId}
      buttonExtra={
        <Button variant="ghost" onClick={() => setIsCreating(false)}>
          Cancel
        </Button>
      }
    />
  );
}
