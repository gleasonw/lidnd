"use client";

import { updateCampaign } from "@/app/[username]/campaignActions";
import type { Campaign } from "@/app/[username]/types";
import { Button } from "@/components/ui/button";

export function ArchiveCampaignButton({ campaign }: { campaign: Campaign }) {
  const c = campaign;
  return (
    <Button
      variant="outline"
      onClick={() =>
        updateCampaign({
          ...c,
          is_archived: !c.is_archived,
        })
      }
    >
      {c.is_archived ? "Unarchive" : "Archive"}
    </Button>
  );
}
