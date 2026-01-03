"use client";

import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useEncounter, useUpdateEncounter } from "./hooks";

export function MaliceTracker() {
  const [encounter] = useEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();

  const currentMalice = encounter.malice ?? 0;

  const handleIncrement = () => {
    updateEncounter({
      id: encounter.id,
      campaign_id: encounter.campaign_id,
      malice: currentMalice + 1,
    });
  };

  const handleDecrement = () => {
    updateEncounter({
      id: encounter.id,
      campaign_id: encounter.campaign_id,
      malice: Math.max(0, currentMalice - 1),
    });
  };

  return (
    <div className="flex items-center justify-between gap-5">
      <span className="text-sm font-semibold text-gray-600">Malice</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={currentMalice === 0}
          className="h-8 w-8"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-lg min-w-[3rem] text-center">
          {currentMalice}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          className="h-8 w-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
