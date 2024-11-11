import {
  EditingEncounterCard,
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
      <div className="flex h-full max-h-full w-full overflow-hidden gap-5 pt-2 ">
        <div className="w-1/4">
          <EncounterArchive />
        </div>
        <div className="flex flex-col w-3/4 gap-5 max-h-full overflow-hidden ">
          <SessionEncounters />
          <div className="max-h-full flex flex-col overflow-auto">
            <EditingEncounterCard />
          </div>
        </div>
      </div>
    </CampaignId>
  );
}
