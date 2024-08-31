import type { Campaign } from "@/app/[username]/types";

export const CampaignUtils = {
  sortRecent(a: Campaign, b: Campaign) {
    if (a.created_at && b.created_at) {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    return 0;
  },
};
