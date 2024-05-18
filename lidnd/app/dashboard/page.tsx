import { isStringMeaningful } from "./utils";
import { createCampaign } from "./actions";
import { Campaign } from "./types";
import { appRoutes, routeToCampaign } from "@/app/routes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getPageSession,
  getSystems,
  getUserCampaigns,
} from "@/server/api/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { CreateCampaignButton } from "@/app/dashboard/create-campaign-button";

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

  if (userCampaigns && userCampaigns.length === 1) {
    // might as well redirect to the first campaign
    return redirect(routeToCampaign(userCampaigns[0].id));
  }

  return (
    <div className="flex w-full flex-col">
      <div className="flex flex-col gap-10 w-[700px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {userCampaigns.map((campaign, index) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
          <CreateCampaignButton
            trigger={
              <Card>
                <Button
                  variant="ghost"
                  className="w-full h-full flex items-center"
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
}

function CampaignCard(props: CampaignCardProps) {
  const { campaign } = props;
  return (
    <Link href={routeToCampaign(campaign.id)}>
      <Card className="flex flex-col gap-5 transition-all hover:bg-gray-200 max-w-lg">
        <CardHeader>
          <CardTitle>
            {isStringMeaningful(campaign.name) ? campaign.name : "Unnamed"}
          </CardTitle>
          <CardDescription className="whitespace-pre-wrap max-h-96 overflow-auto">
            {campaign.description}
          </CardDescription>
        </CardHeader>
        <CardContent></CardContent>
      </Card>
    </Link>
  );
}
