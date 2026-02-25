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
  const [startingVictories, setStartingVictories] = useState(
    lastSession && lastSession.victory_count > 0
      ? String(lastSession.victory_count)
      : ""
  );
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
          className="flex flex-col gap-10"
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
          <span className="text-lg text-center">
            Give{" "}
            <span className="font-bold text-2xl px-2">
              {CampaignUtils.playerCount(campaign)}
            </span>{" "}
            hero tokens to your players.
          </span>
          <LidndTextInput
            basicLabel="Name"
            className="w-64"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Into the Unknown"
          />
          <div className="flex gap-3">
            <LidndLabel label="Starting Victories">
              <div className="flex gap-3">
                <LidndTextInput
                  className="w-20"
                  type="number"
                  value={startingVictories}
                  onChange={(e) => setStartingVictories(e.target.value)}
                  placeholder="0"
                />
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
