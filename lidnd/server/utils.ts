import type { LidndContext } from "@/server/api/base-trpc";
import { ServerCampaign } from "@/server/campaigns";
import { ServerEncounter } from "@/server/encounters";
import { cache } from "react";

type CampaignSlug = {
  campaign_slug: string;
};

type IndexPath = {
  encounter_index: string;
};

type EncounterPath = CampaignSlug & IndexPath;

function isDefinedObject(
  obj: unknown
): obj is NonNullable<Record<string, unknown>> {
  return obj !== null && typeof obj === "object";
}

export function isCampaignSlug(param: unknown): param is CampaignSlug {
  return isDefinedObject(param) && "campaign_slug" in param;
}

export function isEncounterPathParams(param: unknown): param is EncounterPath {
  return (
    isCampaignSlug(param) &&
    "encounter_index" in param &&
    typeof Number(param.encounter_index) === "number"
  );
}

export const encounterFromPathParams = cache(_encounterFromPathParams);
async function _encounterFromPathParams(ctx: LidndContext, params: unknown) {
  if (!isEncounterPathParams(params)) {
    throw new Error("params is missing fields");
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
    parseInt(params.encounter_index)
  );

  if (!encounter) {
    throw new Error("No encounter found");
  }

  return [campaign, encounter] as const;
}
