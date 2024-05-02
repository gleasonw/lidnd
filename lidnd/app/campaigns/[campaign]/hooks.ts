import { api } from "@/trpc/react";
import { usePathname } from "next/navigation";

export function useCampaignId() {
  const pathName = usePathname();

  const campaignId = pathName.split("/")[2];

  if (campaignId === "undefined") {
    throw new Error("Attempted to use campaign id but not found");
  }

  return campaignId;
}

export function useCampaign() {
  const campaignId = useCampaignId();
  const [campaign] = api.campaignById.useSuspenseQuery(campaignId);
  return campaign;
}
