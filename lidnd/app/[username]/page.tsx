import { isStringMeaningful } from "./utils";
import type { Campaign } from "./types";
import { appRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserCampaigns } from "@/server/api/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { CreateCampaignButton } from "@/app/[username]/create-campaign-button";
import { LidndAuth, type LidndUser, UserUtils } from "@/app/authentication";
import { ServerCampaign } from "@/server/campaigns";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import * as R from "remeda";
import { CampaignUtils } from "@/utils/campaigns";

export default async function Page(
  props: {
    params: Promise<{ username: string }>;
  }
) {
  const params = await props.params;
  const user = await LidndAuth.getUser();

  if (!user || user.username !== params.username) {
    console.error("no user, or wrong username");
    return redirect("/login");
  }

  const userCampaigns = await getUserCampaigns(user.id);

  if (userCampaigns && userCampaigns.length === 1) {
    // might as well redirect to the first campaign
    const firstCampaign = userCampaigns[0];
    if (!firstCampaign) {
      throw new Error("Impossible!");
    }
    return redirect(appRoutes.campaign(firstCampaign, user));
  }

  return (
    <div className="flex w-full flex-col">
      <div className="flex flex-col gap-10 ">
        <CreateCampaignButton
          trigger={
            <Button className="flex items-center w-full h-full">
              <CardTitle>New campaign</CardTitle>
              <Plus />
            </Button>
          }
        />
        <div className="flex flex-col gap-3 w-full items-center">
          {R.sort(userCampaigns, CampaignUtils.sortRecent).map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} user={user} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface CampaignCardProps {
  campaign: Campaign;
  user: LidndUser;
}

async function CampaignCard(props: CampaignCardProps) {
  const { campaign, user } = props;

  const players = await ServerCampaign.campaignById(
    UserUtils.context(user),
    campaign.id,
  );

  return (
    <Link
      href={appRoutes.campaign(campaign, user)}
      className="w-full max-w-2xl m-auto"
    >
      <Card className="flex flex-col transition-all hover:bg-gray-200 w-full ">
        <CardHeader className="flex gap-2 flex-col">
          <CardTitle>
            {isStringMeaningful(campaign.name) ? campaign.name : "Unnamed"}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {players?.campaignToPlayers.map(({ player }) => (
              <CreatureIcon key={player.id} creature={player} size="small" />
            ))}
          </div>
        </CardHeader>
        <CardContent className="max-h-full overflow-auto prose">
          <div
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: campaign.description ?? "" }}
          />
        </CardContent>
      </Card>
    </Link>
  );
}
