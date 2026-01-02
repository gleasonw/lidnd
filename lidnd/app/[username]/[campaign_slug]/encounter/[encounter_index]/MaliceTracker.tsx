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
    <div className="p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">Malice</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleDecrement}
              disabled={currentMalice === 0}
              className="h-8 w-8"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-2xl font-bold min-w-[3rem] text-center">
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
        {encounter.status === "prep" && (
          <div className="text-xs text-gray-500 mt-2">
            When encounter starts, malice will be calculated based on average
            victories and player count
          </div>
        )}
      </div>
    </div>
  );
}
