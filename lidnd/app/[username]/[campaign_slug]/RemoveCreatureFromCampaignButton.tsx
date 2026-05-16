"use client";
import { Button } from "@/components/ui/button";
import { removeCreatureFromCampaign } from "@/creatures/creatureActions";
import { TrashIcon } from "lucide-react";

export function RemoveCreatureFromCampaign({
  creature,
  campaign,
}: {
  creature: { id: string };
  campaign: { id: string };
}) {
  return (
    <Button
      variant="ghost"
      onClick={() =>
        removeCreatureFromCampaign({
          creatureId: creature.id,
          campaignId: campaign.id,
        })
      }
    >
      <TrashIcon />
    </Button>
  );
}
