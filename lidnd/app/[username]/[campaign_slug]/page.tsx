import {
  EncounterArchive,
  SessionEncounters,
} from "./encounter/campaign-encounters-overview";
import { ServerCampaign } from "@/server/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";

export default async function CampaignPage(props: {
  params: Promise<{ campaign_slug: string; user_id: string }>;
}) {
  const params = await props.params;
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return redirect(appRoutes.login);
  }

  const campaignData = await ServerCampaign.campaignFromSlug(
    UserUtils.context(user),
    params.campaign_slug,
  );

  if (!campaignData) {
    console.error("No campaign found, layout should have redirected");
    return <div>No campaign found... this is a bug</div>;
  }

  return (
    <CampaignId value={campaignData.id}>
      <div className="flex flex-col gap-5 max-h-full overflow-hidden ">
        <SessionEncounters />
        <div className="max-h-full flex flex-col overflow-auto">
          <EncounterArchive />
        </div>
      </div>
    </CampaignId>
  );
}
