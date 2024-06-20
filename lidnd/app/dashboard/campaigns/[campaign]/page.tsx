import { CharacterIcon } from "../[campaign]/encounters/[id]/character-icon";
import CampaignEncountersOverview from "./encounters/campaign-encounters-overview";
import { deleteCampaign } from "../../actions";
import { Button } from "@/components/ui/button";
import { ServerCampaign } from "@/server/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth } from "@/app/authentication";

export default async function CampaignPage({
  params,
}: {
  params: { campaign: string };
}) {
  const campaign = params.campaign;
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No session found, layout should have redirected");
    return redirect(appRoutes.login);
  }

  const campaignData = await ServerCampaign.campaignById(campaign, user.id);

  if (!campaignData) {
    console.error("No campaign found, layout should have redirected");
    return <div>No campaign found... this is a bug</div>;
  }

  return (
    <CampaignEncountersOverview
      campaignHeader={
        <div className="w-full flex flex-col gap-5">
          <h1 className="text-2xl font-bold flex">{campaignData.name}</h1>
        </div>
      }
      deleteCampaignButton={
        <CampaignDeleteButton campaignId={params.campaign} />
      }
      playersDisplay={<CampaignPlayers campaignId={params.campaign} />}
    />
  );
}

async function CampaignDeleteButton(props: { campaignId: string }) {
  const user = await LidndAuth.getUser();

  if (!user) {
    return <div>No user found</div>;
  }

  const deleteUserCampaign = deleteCampaign.bind(
    null,
    user.id,
    props.campaignId,
  );

  return (
    <form action={deleteUserCampaign}>
      <Button type="submit" variant="destructive">
        Delete campaign
      </Button>
    </form>
  );
}

async function CampaignPlayers(props: { campaignId: string }) {
  const user = await LidndAuth.getUser();
  const { campaignId } = props;

  if (!user) {
    return <div>No session found</div>;
  }

  const players = await ServerCampaign.playersInCampaign(campaignId, user.id);

  if (!players.length) {
    return <div>No player creatures yet</div>;
  }

  return (
    <div className="flex gap-3 flex-wrap">
      {players.map(
        ({ player }) =>
          player.name && (
            <CharacterIcon key={player.id} id={player.id} name={player.name} />
          ),
      )}
    </div>
  );
}
