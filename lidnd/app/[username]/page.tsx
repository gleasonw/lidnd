import Link from "next/link";
import { redirect } from "next/navigation";
import { AngryIcon, ArchiveIcon, Plus } from "lucide-react";
import { LidndAuth, type LidndUser, UserUtils } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampaignDescriptionForm } from "@/app/[username]/campaign-description-area";
import { getSystems, getUserCampaigns } from "@/server/api/utils";
import { createCampaign } from "./actions";
import type { Campaign } from "./types";
import { isStringMeaningful } from "./utils";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import * as CampaignUtils from "@/utils/campaigns";
import * as R from "remeda";
import { db } from "@/server/db";
import { campaigns } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { ArchiveCampaignButton } from "@/app/[username]/ArchiveCampaignButton";

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
    db
      .select()
      .from(campaigns)
      .where(
        and(eq(campaigns.user_id, user.id), eq(campaigns.is_archived, false))
      ),
    getSystems(),
  ]);

  const sortedCampaigns = R.sort(userCampaigns, CampaignUtils.sortRecent);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 overflow-auto">
      <header className="flex flex-col gap-6 border-b pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Campaigns</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={appRoutes.creatures(user)}>
              <Button variant="outline" className="min-w-[140px]">
                <AngryIcon className="mr-2 h-4 w-4" />
                Creatures
              </Button>
            </Link>
            <LidndDialog
              trigger={
                <Button className="min-w-[180px]">
                  <Plus className="mr-2 h-4 w-4" />
                  New campaign
                </Button>
              }
              title={"Create new campaign"}
              content={
                <form
                  action={createCampaign}
                  className="flex w-full flex-col gap-5"
                >
                  <div className="flex flex-col gap-3">
                    <LidndTextInput
                      variant="ghost"
                      type="text"
                      name="name"
                      className="text-lg"
                      placeholder="Campaign name"
                    />
                    <CampaignDescriptionForm />
                    <Select name="system_id" required>
                      <SelectTrigger className="w-full">
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
                  <Button type="submit">Create campaign</Button>
                </form>
              }
            />
          </div>
        </div>
      </header>
      <div>
        <LidndDialog
          trigger={
            <Button variant="ghost" className="text-gray-400">
              <ArchiveIcon />
            </Button>
          }
          title="Archive campaigns"
          content={<ArchiveCampaignDialog />}
        />
      </div>

      {sortedCampaigns.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sortedCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} user={user} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-xl font-semibold">
            You haven't created a campaign yet
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Start a campaign to track encounters.
          </p>
        </div>
      )}
    </div>
  );
}

async function ArchiveCampaignDialog() {
  const user = await LidndAuth.getUser();
  if (!user) {
    redirect("/login");
  }
  const campaignsForUser = await getUserCampaigns(user.id);
  return (
    <div className="flex flex-col gap-2">
      {campaignsForUser
        ?.slice()
        .sort((c1, c2) => (c1.is_archived ? -1 : 1))
        .map((c) => (
          <div key={c.id} className="flex gap-3 items-baseline">
            <span>{c.name}</span>
            <ArchiveCampaignButton campaign={c} />
          </div>
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
  const context = UserUtils.context(user);

  const [campaignDetails, sessions] = await Promise.all([
    ServerCampaign.campaignById(context, campaign.id),
    ServerCampaign.sessionsForCampaign(context, campaign.id),
  ]);

  const sessionList = R.sort(sessions ?? [], sortSessionsByRecent);
  const campaignRoute = appRoutes.campaign({ campaign, user });
  const campaignName = isStringMeaningful(campaign.name)
    ? campaign.name
    : "Unnamed campaign";
  const campaignDescription = toPlainText(
    campaignDetails?.description ?? campaign.description ?? ""
  );

  return (
    <Link href={campaignRoute}>
      <Card className="flex h-full flex-col border-muted shadow-sm">
        <CardHeader className="gap-4 pb-0">
          <div className="space-y-2">
            <CardTitle className="text-xl">{campaignName}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
              <span>{campaignDetails?.system ?? "System not specified"}</span>
              <span className="text-muted-foreground">•</span>
              <span>{sessionList.length} sessions</span>
            </CardDescription>
          </div>

          {campaignDetails?.campaignToPlayers?.length ? (
            <div className="flex flex-wrap items-center gap-2 h-10">
              {campaignDetails.campaignToPlayers.map(({ player }) => (
                <CreatureIcon key={player.id} creature={player} size="small" />
              ))}
            </div>
          ) : (
            <div className="h-10">
              <span className="text-sm text-muted-foreground">
                No players yet
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-6 pt-4">
          {campaignDescription ? (
            <p className="text-sm text-muted-foreground">
              {campaignDescription.length > 200
                ? `${campaignDescription.slice(0, 200)}…`
                : campaignDescription}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No description provided.
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

type GameSession = Awaited<
  ReturnType<typeof ServerCampaign.sessionsForCampaign>
>[number];

function sortSessionsByRecent(a: GameSession, b: GameSession) {
  const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;

  return bTime - aTime;
}

function toPlainText(description: string) {
  return description
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
