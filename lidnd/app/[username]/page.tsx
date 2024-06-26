import { isStringMeaningful } from "./utils";
import { Campaign } from "./types";
import { appRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserCampaigns } from "@/server/api/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { CreateCampaignButton } from "@/app/[username]/create-campaign-button";
import { LidndAuth, LidndUser } from "@/app/authentication";

export default async function Page({
  params,
}: {
  params: { username: string };
}) {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {userCampaigns.map((campaign, index) => (
            <CampaignCard key={campaign.id} campaign={campaign} user={user} />
          ))}
          <CreateCampaignButton
            trigger={
              <Card className="flex items-center justify-center w-full h-full">
                <Button
                  variant="ghost"
                  className="flex items-center w-full h-full"
                >
                  <CardTitle>New campaign</CardTitle>
                  <Plus />
                </Button>
              </Card>
            }
          />
        </div>
      </div>
    </div>
  );
}

interface CampaignCardProps {
  campaign: Campaign;
  user: LidndUser;
}

function CampaignCard(props: CampaignCardProps) {
  const { campaign, user } = props;
  return (
    <Link href={appRoutes.campaign(campaign, user)}>
      <Card className="flex flex-col gap-5 transition-all hover:bg-gray-200 max-w-lg h-96">
        <CardHeader>
          <CardTitle>
            {isStringMeaningful(campaign.name) ? campaign.name : "Unnamed"}
          </CardTitle>
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
