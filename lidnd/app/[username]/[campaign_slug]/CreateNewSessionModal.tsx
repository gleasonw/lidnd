"use client";
import {
  useCampaign,
  useGameSessionState,
  useHotkey,
  useServerAction,
} from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { startSession } from "@/app/[username]/actions";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import React, { useState } from "react";
import * as CampaignUtils from "@/utils/campaigns";
import type { GameSession } from "@/server/db/schema";
import { LidndLabel } from "@/components/ui/LidndLabel";
import { coerceInt } from "@/app/[username]/utils";
import { PlayIcon } from "lucide-react";

type SessionTriggerProps = {
  disabled?: boolean;
  onClick?: React.MouseEventHandler;
};

export function CreateNewSessionModal({
  lastSession,
  trigger,
}: {
  lastSession?: GameSession | null;
  trigger?: React.ReactElement<SessionTriggerProps>;
}) {
  const [campaign] = useCampaign();
  const [sessionState] = useGameSessionState();
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const previousSession = lastSession ?? sessionState.previousActiveSession;
  const [startingVictories, setStartingVictories] = useState(
    previousSession ? String(previousSession.victory_count ?? 0) : ""
  );
  const [isPending, begin] = useServerAction(startSession);
  useHotkey("s", () => {
    setSessionDialogOpen(true);
  });
  const openDialog = () => {
    setSessionDialogOpen(true);
  };
  const defaultTrigger = (
    <Button
      variant="secondary"
      className="flex-1 gap-3"
      disabled={isPending}
      onClick={openDialog}
    >
      <PlayIcon />
      Start Session
      <Kbd>S</Kbd>
    </Button>
  );
  const resolvedTrigger =
    trigger && React.isValidElement<SessionTriggerProps>(trigger)
      ? React.cloneElement(trigger, {
          disabled: isPending || trigger.props.disabled,
          onClick: (event) => {
            trigger.props.onClick?.(event);
            if (!event.defaultPrevented) {
              openDialog();
            }
          },
        })
      : defaultTrigger;
  return (
    <LidndDialog
      title={"Start New Session"}
      isOpen={sessionDialogOpen}
      onClose={() => setSessionDialogOpen(false)}
      trigger={resolvedTrigger}
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
              <div className="flex flex-col gap-2">
                <LidndTextInput
                  className="w-20"
                  type="number"
                  value={startingVictories}
                  onChange={(e) => setStartingVictories(e.target.value)}
                  placeholder="0"
                />
                {previousSession ? (
                  <span className="text-sm text-muted-foreground">
                    Prefilled from your previous session:{" "}
                    {previousSession.victory_count ?? 0} victories
                  </span>
                ) : null}
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
