"use client";
import {
  useCampaign,
  useHotkey,
  useServerAction,
} from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { startSession } from "@/app/[username]/actions";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { useState } from "react";
import * as CampaignUtils from "@/utils/campaigns";
import type { GameSession } from "@/server/db/schema";
import { LidndLabel } from "@/components/ui/LidndLabel";
import { coerceInt } from "@/app/[username]/utils";

export function CreateNewSessionButton({
  lastSession,
}: {
  lastSession: GameSession | null;
}) {
  const [campaign] = useCampaign();
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [startingVictories, setStartingVictories] = useState("0");
  const [isPending, begin] = useServerAction(startSession);
  useHotkey("s", () => {
    setSessionDialogOpen(true);
  });
  return (
    <LidndDialog
      title={"Start New Session"}
      isOpen={sessionDialogOpen}
      onClose={() => setSessionDialogOpen(false)}
      trigger={
        <Button
          variant="secondary"
          className="flex-1"
          disabled={isPending}
          onClick={() => {
            setSessionDialogOpen(true);
          }}
        >
          Start Session
          <Kbd>S</Kbd>
        </Button>
      }
      content={
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const parsedVictoryNumber = coerceInt(startingVictories);
            begin({
              campaignId: campaign.id,
              name: sessionName,
              victoryCount: parsedVictoryNumber,
            })
              .then(() => {
                setSessionDialogOpen(false);
              })
              .catch((err) => {
                console.error("Failed to start session:", err);
              });
          }}
        >
          <span className="text-lg font-bold">
            Remember to distribute {CampaignUtils.playerCount(campaign)} hero
            tokens to your players.
          </span>
          <LidndTextInput
            basicLabel="Name"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Into the Unknown"
          />
          <div className="flex gap-3">
            <LidndLabel label="Starting Victories">
              <div className="flex gap-3">
                <LidndTextInput
                  type="number"
                  value={startingVictories}
                  onChange={(e) => setStartingVictories(e.target.value)}
                  placeholder="0"
                />
                {lastSession && lastSession.victory_count > 0 && (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        setStartingVictories(
                          lastSession.victory_count.toString()
                        );
                      }}
                    >
                      Start from last session's victories (
                      {lastSession.victory_count})
                    </Button>
                  </div>
                )}
              </div>
            </LidndLabel>
          </div>

          <Button type="submit" className="mt-auto" disabled={isPending}>
            Create Session
          </Button>
        </form>
      }
    />
  );
}
