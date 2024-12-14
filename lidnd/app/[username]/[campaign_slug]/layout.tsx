import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { ServerCampaign } from "@/server/campaigns";
import { isCampaignSlug } from "@/server/utils";
import React from "react";

export default async function CampaignLayout(props: {
  children: React.ReactNode;
  params: Promise<unknown>;
}) {
  const start = performance.now();
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
    params.campaign_slug,
  );

  if (!campaign) {
    return <div>No campaign found -- bug!</div>;
  }
  console.log(`loaded campaign layout in ${performance.now() - start}ms`);
  return (
    <CampaignId value={campaign.id}>
      <div className="mx-2 flex flex-col overflow-hidden max-h-full h-full gap-5">
        {children}
      </div>
    </CampaignId>
  );
}
