import {
  CampaignParty,
  CreateEncounterButton,
  EncounterArchive,
  SessionEncounters,
} from "./encounter/campaign-encounters-overview";
import { deleteCampaign } from "../actions";
import { Button } from "@/components/ui/button";
import { ServerCampaign } from "@/server/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { CampaignDescriptionArea } from "@/app/[username]/campaign-description-area";
import { FadeInSuspense } from "@/components/ui/fade-in-suspense";
import { Skull } from "lucide-react";

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

  const deleteUserCampaign = deleteCampaign.bind(null, user, campaignData.id);

  return (
    <CampaignId value={campaignData.id}>
      <div className="flex items-center justify-between py-4">
        <CampaignDescriptionArea />
        <form action={deleteUserCampaign}>
          <Button variant="destructive" className="whitespace-nowrap">
            Delete campaign
          </Button>
        </form>
      </div>
      <div className="flex flex-col gap-10 h-full max-h-full w-full overflow-hidden">
        <span className="flex gap-5 items-center">
          <CampaignParty />
        </span>
        <div className="grid grid-cols-3 gap-5 max-h-full pb-8 overflow-hidden">
          <div className="col-span-2 max-h-full flex flex-col overflow-hidden">
            <h1 className={"text-2xl gap-5 flex items-center"}>
              <Skull />
              <span className="py-2 text-xl">Encounters</span>
              <CreateEncounterButton category={"active"} />
            </h1>
            <EncounterArchive />
          </div>
          <SessionEncounters />
        </div>
      </div>
    </CampaignId>
  );
}
