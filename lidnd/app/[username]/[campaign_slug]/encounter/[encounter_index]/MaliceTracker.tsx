"use client";

import { Button } from "@/components/ui/button";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Minus, Plus, Trophy } from "lucide-react";
import { useState } from "react";
import { useEncounter, useUpdateEncounter } from "./hooks";
import { useActiveGameSession } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { cn } from "@/lib/utils";

interface MaliceTrackerProps {
  className?: string;
}

export function MaliceTracker({ className }: MaliceTrackerProps) {
  const [encounter] = useEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();
  const [activeSession] = useActiveGameSession();
  const [maliceDiff, setMaliceDiff] = useState<string | number>("");

  const currentMalice = encounter.malice ?? 0;
  const hasVictories = activeSession && activeSession.victory_count > 0;

  function maliceChangeAmount() {
    return typeof maliceDiff === "number" && maliceDiff > 0 ? maliceDiff : 1;
  }

  function handleIncrement() {
    const amount = maliceChangeAmount();
    updateEncounter({
      id: encounter.id,
      campaign_id: encounter.campaign_id,
      malice: currentMalice + amount,
    });
    setMaliceDiff("");
  }

  function handleDecrement() {
    const amount = maliceChangeAmount();
    updateEncounter({
      id: encounter.id,
      campaign_id: encounter.campaign_id,
      malice: Math.max(0, currentMalice - amount),
    });
    setMaliceDiff("");
  }

  const trackerControls = (
    <div className={cn("flex items-center gap-1 shrink-0")}>
      <Button
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={currentMalice === 0}
        className="h-8 w-8"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <LidndTextInput
        placeholder="1"
        type="number"
        min={1}
        inputMode="numeric"
        className={cn("h-8 text-center w-16")}
        value={maliceDiff}
        onChange={(e) => {
          const nextValue = parseInt(e.target.value);
          if (!isNaN(nextValue) && nextValue > 0) {
            setMaliceDiff(nextValue);
            return;
          }
          setMaliceDiff("");
        }}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        className="h-8 w-8"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className={cn("flex items-center gap-5", className)}>
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
      <div className="flex items-center gap-3">
        <span className="text-lg min-w-[3rem] text-center">
          {currentMalice}
        </span>
        {trackerControls}
      </div>
    </div>
  );
}
