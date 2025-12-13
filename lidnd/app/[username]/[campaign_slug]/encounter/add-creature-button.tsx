"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { Button } from "@/components/ui/button";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import type { Creature } from "@/server/api/router";
import { crLabel } from "@/utils/campaigns";
import { Heart } from "lucide-react";

type AddCreatureButtonProps = {
  creature: Creature;
  children?: React.ReactNode;
} & React.ComponentProps<typeof Button>;

export function AddCreatureButton({
  creature,
  children,
  ...props
}: AddCreatureButtonProps) {
  const [campaign] = useCampaign();
  return (
    <Button
      {...props}
      variant="ghost"
      className="flex items-start justify-start h-12 gap-2 w-full"
    >
      <CreatureIcon creature={creature} size="small" />
      <div className="flex flex-col">
        <span className="truncate ">{creature.name}</span>
        {creature.challenge_rating ? (
          <span className="flex text-gray-500 gap-4">
            <span className="flex gap-2">
              <span>{crLabel(campaign)}</span>
              <span>{creature.challenge_rating}</span>
            </span>
            <span className="flex gap-2">
              <Heart className="inline-block h-4 w-4" />
              <span>{creature.max_hp}</span>
            </span>
          </span>
        ) : null}
      </div>
    </Button>
  );
}
