"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LidndPopover } from "@/encounters/base-popover";
import { api } from "@/trpc/react";
import type { Creature } from "@/server/api/router";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAddExistingCreatureAsParticipant } from "@/encounters/[encounter_index]/hooks";

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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [addAsAlly, setAddAsAlly] = useState(false);

  const creaturesQuery = api.getUserCreatures.useQuery({
    name: search,
    is_player: addAsAlly ? true : false,
  });

  const addMonster = useAddExistingCreatureAsParticipant({
    id: encounterId,
    campaign_id: campaignId,
  });

  const isLoading = creaturesQuery.isLoading || addMonster.isPending;

  const creaturesToDisplay = creaturesQuery.data ?? [];

  async function handleAdd(creature: Creature) {
    if (addMonster.isPending) return;

    setSearch("");
    setIsPopoverOpen(false);

    addMonster.mutateAsync({
      encounter_id: encounterId,
      creature_id: creature.id,
      is_ally: addAsAlly,
      hp: creature.max_hp ?? 1,
    });
  }

  return (
    <LidndPopover
      className="w-80 p-0"
      open={isPopoverOpen}
      onOpenChange={setIsPopoverOpen}
      trigger={
        <Button
          size="sm"
          variant="outline"
          className={cn("gap-2 rounded-full", className)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      }
    >
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick add creature
          </span>
          <label className="flex items-center gap-2 text-xs font-medium">
            <Switch
              id={`quick-add-${encounterId}`}
              checked={addAsAlly}
              onCheckedChange={setAddAsAlly}
              aria-label={addAsAlly ? "Add as ally" : "Add as opponent"}
            />
            {addAsAlly ? "Allies" : "Opponents"}
          </label>
        </div>

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search ${addAsAlly ? "allies" : "monsters"}`}
          className="h-9 text-sm"
        />

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Fetching creatures
            </div>
          ) : creaturesToDisplay.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No saved {addAsAlly ? "allies" : "monsters"} found.
            </p>
          ) : (
            creaturesToDisplay.map((creature) => (
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
                <Badge variant="secondary" className="text-xs">
                  {addAsAlly ? "Ally" : "Foe"}
                </Badge>
              </button>
            ))
          )}
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
