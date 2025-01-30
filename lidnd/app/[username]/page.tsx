import { isStringMeaningful } from "./utils";
import type { Campaign } from "./types";
import { appRoutes } from "@/app/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSystems, getUserCampaigns } from "@/server/api/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AngryIcon, ChevronRight } from "lucide-react";
import { LidndAuth, type LidndUser, UserUtils } from "@/app/authentication";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import * as R from "remeda";
import * as CampaignUtils from "@/utils/campaigns";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { CampaignDescriptionForm } from "@/app/[username]/campaign-description-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCampaign } from "./actions";
import { Button } from "@/components/ui/button";
import { LidndDialog } from "@/components/ui/lidnd_dialog";

export default async function Page(props: {
  params: Promise<{ username: string }>;
}) {
  const params = await props.params;
  const user = await LidndAuth.getUser();

  if (!user || user.username !== params.username) {
    console.error("no user, or wrong username");
    return redirect("/login");
  }

  const [userCampaigns, systems] = await Promise.all([
    getUserCampaigns(user.id),
    getSystems(),
  ]);

  return (
    <div className="flex w-full flex-col gap-10 p-5">
      <Link href={appRoutes.creatures(user)}>
        <Button variant={"outline"}>
          Creatures <AngryIcon />
        </Button>
      </Link>
      <LidndDialog
        trigger={
          <Button className="max-w-sm mx-auto mt-5">Create new campaign</Button>
        }
        title={"Create new campaign"}
        content={
          <form action={createCampaign} className="flex flex-col gap-5 w-full">
            <div className="flex gap-2 flex-col">
              <LidndTextInput
                variant="ghost"
                type="text"
                name="name"
                className="text-xl"
                placeholder="Name"
              />
              <CampaignDescriptionForm />
              <Select name="system_id" required>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a system" />
                </SelectTrigger>
                <SelectContent>
                  {systems.map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Create a new campaign</Button>
          </form>
        }
      />
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
    <Link href={appRoutes.campaign({ campaign, user })} className="w-full">
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
