"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Minus, Plus, Trophy } from "lucide-react";
import { useEncounter, useUpdateEncounter } from "./hooks";
import { useActiveGameSession } from "@/app/[username]/[campaign_slug]/campaign-hooks";

export function MaliceTracker() {
  const [encounter] = useEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();
  const { data: activeSession } = useActiveGameSession();

  const currentMalice = encounter.malice ?? 0;
  const hasVictories = activeSession && activeSession.victory_count > 0;

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
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-gray-600">Malice</span>
        {hasVictories && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Trophy className="h-3 w-3" />
                <span>+{activeSession.victory_count}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">
                Session victories are adding +{activeSession.victory_count} to
                encounter increment each turn.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Modify victory count from the campaign home page.
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
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
