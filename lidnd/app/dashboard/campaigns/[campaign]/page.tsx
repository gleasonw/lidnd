import { CharacterIcon } from "../[campaign]/encounters/[id]/character-icon";
import CampaignEncountersOverview from "../[campaign]/encounters/encounters-overview";
import { deleteCampaign } from "../../actions";
import { Button } from "@/components/ui/button";
import { getPageSession } from "@/server/api/utils";
import { playersInCampaign } from "@/server/campaigns";

export default function CampaignPage({
  params,
}: {
  params: { campaign: string };
}) {
  return (
    <CampaignEncountersOverview
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

  return (
    <div className="flex gap-3">
      {players.map(
        ({ player }) =>
          player.name && (
            <CharacterIcon key={player.id} id={player.id} name={player.name} />
          ),
      )}
    </div>
  );
}
