"use client";

import { api } from "@/trpc/react";
import React from "react";

export function RememberLastCampaign({
  campaignId,
}: {
  campaignId: string;
}) {
  const { mutate } = api.rememberLastCampaign.useMutation();
  const lastSentCampaignId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (lastSentCampaignId.current === campaignId) {
      return;
    }

    lastSentCampaignId.current = campaignId;
    mutate(campaignId);
  }, [campaignId, mutate]);

  return null;
}
