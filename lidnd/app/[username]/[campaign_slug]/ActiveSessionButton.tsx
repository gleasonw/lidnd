"use client";

import { useServerAction } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { updateSession } from "@/app/[username]/actions";
import { Button } from "@/components/ui/button";
import type { GameSession } from "@/server/db/schema";
import { Minus, Plus, Clock } from "lucide-react";
import { useState, useEffect } from "react";

export function ActiveSessionButton({ session }: { session: GameSession }) {
  const [isPending, doUpdate] = useServerAction(updateSession);
  const [victoryCount, setVictoryCount] = useState(session.victory_count ?? 0);
  const [duration, setDuration] = useState("");

  useEffect(() => {
    const updateDuration = () => {
      if (!session.started_at) return;
      const start = new Date(session.started_at);
      const now = new Date();
      const diff = now.getTime() - start.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setDuration(`${hours}h ${minutes}m`);
      } else {
        setDuration(`${minutes}m`);
      }
    };

    updateDuration();
    const interval = setInterval(updateDuration, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [session.started_at]);

  const handleVictoryChange = async (delta: number) => {
    const newCount = Math.max(0, victoryCount + delta);
    setVictoryCount(newCount);
    await doUpdate({
      sessionId: session.id,
      updated: {
        ...session,
        victory_count: newCount,
      },
    });
  };

  const handleEndSession = async () => {
    await doUpdate({
      sessionId: session.id,
      updated: {
        ...session,
        ended_at: new Date(),
      },
    });
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 border rounded-md bg-card flex-1">
      <div className="flex flex-col gap-0">
        <span className="font-semibold text-sm">{session.name}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{duration}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 border-l pl-3">
        <span className="text-xs text-muted-foreground">Victories</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleVictoryChange(-1)}
          disabled={isPending || victoryCount === 0}
          className="h-6 w-6"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="text-lg font-bold min-w-[1.5rem] text-center">
          {victoryCount}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleVictoryChange(1)}
          disabled={isPending}
          className="h-6 w-6"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <Button
        variant="destructive"
        disabled={isPending}
        onClick={handleEndSession}
        size="sm"
        className="h-7 text-xs ml-2"
      >
        End Session
      </Button>
    </div>
  );
}
