import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { TopNav } from "@/app/[username]/[campaign_slug]/TopNav";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { ServerCampaign } from "@/server/campaigns";
import { isCampaignSlug } from "@/server/utils";
import React, { Suspense } from "react";

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
    <Suspense fallback={"Loading campaign"}>
      <CampaignId value={campaign.id}>
        <TopNav campaignId={campaign.id} />
        <div className="px-2">{children}</div>
      </CampaignId>
    </Suspense>
  );
}
