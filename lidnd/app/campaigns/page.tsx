import { createCampaign } from "@/app/campaigns/actions";
import { Campaign } from "@/app/campaigns/types";
import { appRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getPageSession,
  getSystems,
  getUserCampaigns,
} from "@/server/api/utils";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getPageSession();

  if (!session) {
    return redirect("/login");
  }

  const user = session.user;

  const [userCampaigns, systems] = await Promise.all([
    getUserCampaigns(user.userId),
    getSystems(),
  ]);

  return (
    <div className="flex w-full items-center flex-col">
      <div className="flex flex-col gap-5 pt-10 w-[900px] items-center">
        <form
          action={createCampaign}
          className="flex flex-col gap-5 max-w-[400px]"
        >
          <div className="flex gap-2 flex-wrap">
            <label>
              <span>Name</span>

              <Input type="text" name="name" />
            </label>
            <label>
              <span>Description</span>
              <Input type="text" name="description" />
            </label>
            <select name="system_id" className="flex-grow">
              {systems.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Create a new campaign</Button>
        </form>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {userCampaigns.map((campaign, index) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      </div>
    </div>
  );
}

export interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard(props: CampaignCardProps) {
  const { campaign } = props;
  return (
    <Card className="flex flex-col gap-5">
      <Link href={`${appRoutes.campaigns}/${campaign.id}`}>
        {campaign.name}
      </Link>
    </Card>
  );
}
