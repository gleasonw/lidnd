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
import { cn } from "@/lib/utils";

interface MaliceTrackerProps {
  compact?: boolean;
  className?: string;
}

export function MaliceTracker({
  compact = false,
  className,
}: MaliceTrackerProps) {
  const [encounter] = useEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();
  const [activeSession] = useActiveGameSession();

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

  if (compact) {
    return (
      <div
        className={cn(
          "w-full rounded-md border bg-white px-2 py-1",
          className
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
              Malice
            </span>
            {hasVictories ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-amber-600 whitespace-nowrap">
                    <Trophy className="h-3 w-3" />
                    <span>+{activeSession.victory_count}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">
                    Session victories are adding {activeSession.victory_count}{" "}
                    to malice each turn.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Modify victory count from the campaign home page.
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={handleDecrement}
              disabled={currentMalice === 0}
              className="h-8 w-8"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-lg min-w-[2rem] text-center">
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
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between gap-5", className)}>
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
                Session victories are adding {activeSession.victory_count} to
                malice each turn.
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
