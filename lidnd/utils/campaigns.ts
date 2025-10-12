import type { Campaign } from "@/app/[username]/types";
import type { Encounter } from "@/server/api/router";

export function sortRecent(a: Campaign, b: Campaign) {
  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

  return bTime - aTime;
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
