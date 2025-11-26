"use client";
import { Button } from "@/components/ui/button";
import { removeCreatureFromCampaign } from "@/creatures/creatureActions";

export function RemoveCreatureFromCampaign({
  creature,
  campaign,
}: {
  creature: { id: string };
  campaign: { id: string };
}) {
  return (
    <Button
      variant="outline"
      onClick={() =>
        removeCreatureFromCampaign({
          creatureId: creature.id,
          campaignId: campaign.id,
        })
      }
    >
      Remove
    </Button>
  );
}
