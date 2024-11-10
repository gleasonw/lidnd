import { usePathname } from "next/navigation";

export function useMaybeCampaignSlug() {
  const campaignSlug = usePathname().split("/").at(2);
  if (!campaignSlug) {
    return null;
  }
  return campaignSlug;
}

export function useMaybeEncounterIndex() {
  const encounterIndex = usePathname().split("/").at(4);
  if (!encounterIndex) {
    return null;
  }
  return encounterIndex;
}
