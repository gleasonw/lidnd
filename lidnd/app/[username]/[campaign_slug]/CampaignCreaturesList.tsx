"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { CreatureUpdateForm } from "@/creatures/creatures-page";
import { RemoveCreatureFromCampaign } from "@/app/[username]/[campaign_slug]/RemoveCreatureFromCampaignButton";
import type { creatures } from "@/server/db/schema";

type Creature = typeof creatures.$inferSelect;

type CampaignCreaturesListProps = {
  campaign: { id: string };
  creatures: Creature[];
};

export function CampaignCreaturesList({
  campaign,
  creatures,
}: CampaignCreaturesListProps) {
  const [query, setQuery] = useState("");
  const filteredCreatures = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return creatures;
    }
    return creatures.filter((creature) =>
      creature.name.toLowerCase().includes(trimmed)
    );
  }, [creatures, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search creatures"
          className="max-w-sm"
          type="text"
          onChange={(event) => setQuery(event.target.value)}
          value={query}
        />
        <span className="text-sm text-muted-foreground">
          {filteredCreatures.length} of {creatures.length}
        </span>
      </div>
      {filteredCreatures.length === 0 ? (
        <p className="text-sm text-muted-foreground">No creatures found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {filteredCreatures.map((creature) => (
            <div key={creature.id} className="flex gap-2">
              <LidndDialog
                title="Update Creature"
                trigger={
                  <Button variant="ghost">
                    <CreatureIcon creature={creature} size="medium" />
                    <span>{creature.name}</span>
                  </Button>
                }
                content={<CreatureUpdateForm creature={creature} />}
              />
              <RemoveCreatureFromCampaign
                creature={creature}
                campaign={campaign}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
