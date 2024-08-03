import CampaignEncountersOverview from "./encounter/campaign-encounters-overview";
import { deleteCampaign } from "../actions";
import { Button } from "@/components/ui/button";
import { ServerCampaign } from "@/server/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";

export default async function CampaignPage({
  params,
}: {
  params: { campaign_slug: string; user_id: string };
}) {
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
      <CampaignEncountersOverview
        campaignHeader={
          <div className="w-full flex flex-col gap-5">
            <h1 className="text-2xl font-bold flex">{campaignData.name}</h1>
          </div>
        }
        deleteCampaignButton={
          <CampaignDeleteButton campaignId={params.campaign_slug} />
        }
      />
    </CampaignId>
  );
}

async function CampaignDeleteButton(props: { campaignId: string }) {
  const user = await LidndAuth.getUser();

  if (!user) {
    return <div>No user found</div>;
  }

  const deleteUserCampaign = deleteCampaign.bind(null, user, props.campaignId);

  return (
    <form action={deleteUserCampaign}>
      <Button type="submit" variant="destructive">
        Delete campaign
      </Button>
    </form>
  );
}
