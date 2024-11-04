import { usePathname } from "next/navigation";

export function useMaybeCampaignSlug() {
  const campaignSlug = usePathname().split("/").at(2);
  if (!campaignSlug) {
    return null;
  }
  return campaignSlug;
}
