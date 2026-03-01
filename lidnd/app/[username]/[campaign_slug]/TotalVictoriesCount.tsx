"use client";
import { useActiveGameSession } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { LidndTooltip } from "@/components/ui/tip";
import { TrophyIcon } from "lucide-react";
export function TotalVictoriesCount() {
  const [activeSession] = useActiveGameSession();
  if (!activeSession) {
    return null;
  }
  return (
    <LidndTooltip text="Session victories">
      <div className="flex flex-col gap-1 p-2 items-center">
        {activeSession?.victory_count ?? 0}
        <TrophyIcon />
      </div>
    </LidndTooltip>
  );
}
