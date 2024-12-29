import { isStringMeaningful } from "./utils";
import type { Campaign } from "./types";
import { appRoutes } from "@/app/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserCampaigns } from "@/server/api/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { LidndAuth, type LidndUser, UserUtils } from "@/app/authentication";
import { ServerCampaign } from "@/server/campaigns";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import * as R from "remeda";
import * as CampaignUtils from "@/utils/campaigns";

export default async function Page(props: {
  params: Promise<{ username: string }>;
}) {
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
    <div className="flex w-full flex-col gap-10 p-5">
      {R.sort(userCampaigns, CampaignUtils.sortRecent).map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} user={user} />
      ))}
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
    campaign.id
  );

  return (
    <Link href={appRoutes.campaign(campaign, user)} className="w-full">
      <Card className=" flex flex-col relative transition-all border-2 shadow-lg hover:bg-gray-200 w-full ">
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
        <ChevronRight className="opacity-20 absolute top-0 right-0 h-20 w-20" />
      </Card>
    </Link>
  );
}
