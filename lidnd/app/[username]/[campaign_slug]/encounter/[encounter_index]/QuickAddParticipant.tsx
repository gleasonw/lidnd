"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LidndPopover } from "@/encounters/base-popover";
import { api } from "@/trpc/react";
import type { Creature } from "@/server/api/router";
import { cn } from "@/lib/utils";
import { useAddExistingCreatureAsParticipant } from "@/encounters/[encounter_index]/hooks";
import { Switch } from "@/components/ui/switch";
import { LidndLabel } from "@/components/ui/LidndLabel";

type QuickAddParticipantsButtonProps = {
  encounterId: string;
  campaignId: string;
  className?: string;
};

export function QuickAddParticipantsButton({
  encounterId,
  campaignId,
  className,
}: QuickAddParticipantsButtonProps) {
  const [search, setSearch] = useState("");
  const [inCampaign, setInCampaign] = useState(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const creaturesQuery = api.getUserCreatures.useQuery(
    {
      name: search,
      campaignId: inCampaign ? campaignId : undefined,
    },
    {
      placeholderData: (prev) => prev,
    }
  );

  const addMonster = useAddExistingCreatureAsParticipant({
    id: encounterId,
    campaign_id: campaignId,
  });

  const creaturesToDisplay = creaturesQuery.data ?? [];

  async function handleAdd(creature: Creature) {
    if (addMonster.isPending) return;

    await addMonster.mutateAsync({
      encounter_id: encounterId,
      creature_id: creature.id,
      hp: creature.max_hp ?? 1,
    });

    setSearch("");
    setIsPopoverOpen(false);
  }

  return (
    <LidndPopover
      className="w-80 p-0"
      open={isPopoverOpen}
      onOpenChange={setIsPopoverOpen}
      trigger={
        <Button variant="secondary" className={cn("gap-2", className)}>
          Existing
        </Button>
      }
    >
      <div className="flex flex-col gap-3 p-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search adversaries`}
          className="h-9 text-sm"
        />
        <LidndLabel label="In campaign" className="flex gap-2 items-center">
          <Switch
            id={`quick-add-${encounterId}`}
            checked={inCampaign}
            onCheckedChange={setInCampaign}
            aria-label={inCampaign ? "In campaign" : "Any"}
          />
        </LidndLabel>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {creaturesToDisplay.map((creature) => (
            <button
              key={creature.id}
              type="button"
              onClick={() => handleAdd(creature)}
              className="flex w-full items-center justify-between rounded-sm border border-transparent px-3 py-2 text-left text-sm transition hover:border-border hover:bg-muted/60"
              disabled={addMonster.isPending}
            >
              <div className="flex flex-col truncate">
                <span className="truncate font-medium">{creature.name}</span>
                <span className="text-xs text-muted-foreground">
                  CR {creature.challenge_rating ?? "?"}
                </span>
              </div>
            </button>
          ))}
        </div>

        {addMonster.error ? (
          <p className="text-xs font-medium text-destructive">
            {addMonster.error.message}
          </p>
        ) : null}
      </div>
    </LidndPopover>
  );
}
