"use client";
import { useActiveGameSession } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { LidndTooltip } from "@/components/ui/tip";
import { TrophyIcon } from "lucide-react";

function trophySizeForVictoryCount(victoryCount: number) {
  if (victoryCount >= 16) {
    return "size-3";
  }

  if (victoryCount >= 9) {
    return "size-3.5";
  }

  if (victoryCount >= 5) {
    return "size-4";
  }

  return "size-5";
}

export function TotalVictoriesCount() {
  const [activeSession] = useActiveGameSession();
  if (!activeSession || !activeSession.victory_count) {
    return null;
  }

  const victoryCount = activeSession.victory_count ?? 0;
  const trophySize = trophySizeForVictoryCount(victoryCount);

  return (
    <LidndTooltip text="Session victories">
      <div className="flex flex-wrap items-center justify-center gap-1 p-2 text-amber-600">
        {victoryCount > 0 ? (
          Array.from({ length: victoryCount }, (_, index) => (
            <TrophyIcon
              key={index}
              className={`${trophySize} shrink-0`}
              aria-hidden="true"
            />
          ))
        ) : (
          <TrophyIcon className="size-5 opacity-35" aria-hidden="true" />
        )}
        <span className="sr-only">{victoryCount} session victories</span>
      </div>
    </LidndTooltip>
  );
}
