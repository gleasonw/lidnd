"use client";

import {
  useActiveGameSession,
  useServerAction,
} from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { CreateNewSessionModal } from "@/app/[username]/[campaign_slug]/CreateNewSessionModal";
import { SessionRuntime } from "@/app/[username]/[campaign_slug]/SessionRuntime";
import { updateSession } from "@/app/[username]/actions";
import { Button } from "@/components/ui/button";
import { Minus, PlayIcon, Plus, TrophyIcon } from "lucide-react";

export function SessionDisplay() {
  const [activeSession] = useActiveGameSession();
  const [isPending, doUpdate] = useServerAction(updateSession);

  if (!activeSession) {
    return (
      <CreateNewSessionModal
        trigger={
          <Button variant="secondary" size="lg" className="gap-3 px-8">
            <PlayIcon />
            Start Session
          </Button>
        }
        />
      );
  }

  const handleVictoryChange = (delta: number) => {
    const currentVictoryCount = activeSession.victory_count ?? 0;
    const newCount = Math.max(0, currentVictoryCount + delta);
    doUpdate({
      sessionId: activeSession.id,
      updated: {
        ...activeSession,
        victory_count: newCount,
      },
    }).catch((error) => {
      console.error("Failed to update session victories", error);
    });
  };

  const handleEndSession = () => {
    doUpdate({
      sessionId: activeSession.id,
      updated: {
        ...activeSession,
        ended_at: new Date(),
      },
    }).catch((error) => {
      console.error("Failed to end session", error);
    });
  };

  return (
    <div className="flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <TrophyIcon className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Session victories</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={isPending || (activeSession.victory_count ?? 0) === 0}
              onClick={() => handleVictoryChange(-1)}
            >
              <Minus className="size-4" />
            </Button>
            <span className="min-w-8 text-center text-2xl font-semibold">
              {activeSession.victory_count ?? 0}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={isPending}
              onClick={() => handleVictoryChange(1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <SessionRuntime startedAt={activeSession.started_at} />
        <Button
          disabled={isPending}
          variant="outline"
          size="sm"
          onClick={handleEndSession}
        >
          End Session
        </Button>
      </div>
    </div>
  );
}
