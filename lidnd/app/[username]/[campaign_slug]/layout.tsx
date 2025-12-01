import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { isCampaignSlug } from "@/server/utils";
import React from "react";

export default async function CampaignLayout(props: {
  children: React.ReactNode;
  params: Promise<unknown>;
}) {
  const params = await props.params;

  const { children } = props;

  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return <div>User not logged in</div>;
  }

  if (!isCampaignSlug(params)) {
    console.error("params object has missing fields");
    return;
  }

  const campaign = await ServerCampaign.campaignFromSlug(
    UserUtils.context(user),
    params.campaign_slug
  );

  console.log({ params });

  if (!campaign) {
    return <div>No campaign found -- bug!</div>;
  }
  // todo: add basic nav box, that takes up the same amount of space as the initiative bar
  return (
    <CampaignId value={campaign.id}>
      <div
        className={`flex flex-col overflow-hidden max-h-full h-full gap-5 relative `}
      >
        {children}
      </div>
    </CampaignId>
  );
}
