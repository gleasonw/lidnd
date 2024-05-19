import { CharacterIcon } from "../[campaign]/encounters/[id]/character-icon";
import CampaignEncountersOverview from "../[campaign]/encounters/encounters-overview";
import { deleteCampaign } from "../../actions";
import { Button } from "@/components/ui/button";
import { getPageSession } from "@/server/api/utils";
import { campaignById, playersInCampaign } from "@/server/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { CardDescription } from "@/components/ui/card";

export default async function CampaignPage({
  params,
}: {
  params: { campaign: string };
}) {
  const campaign = params.campaign;
  const session = await getPageSession();
  if (!session) {
    console.error("No session found, layout should have redirected");
    return redirect(appRoutes.login);
  }
  const user = session.user;
  const campaignData = await campaignById(campaign, user.userId);

  if (!campaignData) {
    console.error("No campaign found, layout should have redirected");
    return <div>No campaign found... this is a bug</div>;
  }

  return (
    <CampaignEncountersOverview
      campaignHeader={
        <div className="w-full flex flex-col gap-5">
          <h1 className="text-2xl font-bold flex">{campaignData.name}</h1>
          <CardDescription className="whitespace-pre-wrap">
            {campaignData.description}
          </CardDescription>
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
  const session = await getPageSession();

  if (!session) {
    return <div>No session found</div>;
  }

  const user = session.user;

  const deleteUserCampaign = deleteCampaign.bind(
    null,
    user.userId,
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
  const session = await getPageSession();
  const { campaignId } = props;

  if (!session) {
    return <div>No session found</div>;
  }

  const user = session.user;

  const players = await playersInCampaign(campaignId, user.userId);

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
