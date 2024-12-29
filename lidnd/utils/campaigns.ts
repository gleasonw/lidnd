import type { Campaign } from "@/app/[username]/types";
import type { Encounter } from "@/server/api/router";

export function sortRecent(a: Campaign, b: Campaign) {
  if (a.created_at && b.created_at) {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  }
  return 0;
}

export function encounterFromUrl(
  campaign: { encounters: Encounter[] },
  url: string
) {
  const encounterIndex = url.split("/").at(4);
  const indexToFind = parseInt(encounterIndex ?? "");
  if (isNaN(indexToFind)) {
    return undefined;
  }
  return campaign.encounters.find((e) => e.index_in_campaign === indexToFind);
}
