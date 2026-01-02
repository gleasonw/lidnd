import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { LidndSidebar } from "@/app/[username]/[campaign_slug]/lidndsidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { isCampaignSlug } from "@/server/utils";
import React from "react";
import { cookies } from "next/headers";
import { CampaignHeader } from "@/app/[username]/[campaign_slug]/CampaignHeader";

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

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <CampaignId value={campaign.id}>
        <LidndSidebar
          campaign={campaign}
          topSlot={
            <div className="pl-1.5">
              <SidebarTrigger />
            </div>
          }
        />

        <div
          className={`flex flex-col max-h-full h-full gap-5 relative max-w-full overflow-hidden w-full `}
        >
          <CampaignHeader campaign={campaign} />
          {children}
        </div>
      </CampaignId>
    </SidebarProvider>
  );
}
