import { LidndContext } from "@/server/api/router";
import { ServerCampaign } from "@/server/campaigns";
import { ServerEncounter } from "@/server/encounters";

type Path = {
  campaign_slug: string;
  encounter_index: string;
};

function isPath(param: unknown): param is Path {
  return (
    param !== null &&
    typeof param === "object" &&
    "campaign_slug" in param &&
    "encounter_index" in param
  );
}
export async function encounterFromPathParams(
  ctx: LidndContext,
  params: unknown
) {
  if (!isPath(params)) {
    throw new Error("params is missing fields");
  }

  const numberIndex = Number(params.encounter_index);

  if (typeof numberIndex !== "number") {
    throw new Error("encounter_index is not a number");
  }

  const campaign = await ServerCampaign.campaignFromSlug(
    ctx,
    params.campaign_slug
  );

  if (!campaign) {
    throw new Error("No campaign found");
  }

  const encounter = await ServerEncounter.encounterFromCampaignAndIndex(
    ctx,
    campaign.id,
    numberIndex
  );

  if (!encounter) {
    throw new Error("No encounter found");
  }

  return [campaign, encounter] as const;
}
