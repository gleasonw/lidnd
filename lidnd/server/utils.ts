import { LidndContext } from "@/server/api/router";
import { ServerCampaign } from "@/server/campaigns";
import { ServerEncounter } from "@/server/encounters";
import { cache } from "react";

type CampaignSlug = {
  campaign_slug: string;
};

type IndexPath = {
  encounter_index: string;
};

type Nested = CampaignSlug & IndexPath;

function isDefinedObject(
  obj: unknown
): obj is NonNullable<Record<string, unknown>> {
  return obj !== null && typeof obj === "object";
}

export function isCampaignSlug(param: unknown): param is CampaignSlug {
  return isDefinedObject(param) && "campaign_slug" in param;
}

function isPath(param: unknown): param is Nested {
  return isCampaignSlug(param) && "encounter_index" in param;
}

export const encounterFromPathParams = cache(_encounterFromPathParams);
async function _encounterFromPathParams(ctx: LidndContext, params: unknown) {
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
