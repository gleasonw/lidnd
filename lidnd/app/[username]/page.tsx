import Link from "next/link";
import { redirect } from "next/navigation";
import { AngryIcon, Calendar, Plus, Trash2 } from "lucide-react";
import { LidndAuth, type LidndUser, UserUtils } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createCampaign, deleteCampaign } from "./actions";
import type { Campaign } from "./types";
import { isStringMeaningful } from "./utils";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import * as CampaignUtils from "@/utils/campaigns";
import * as R from "remeda";

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

  const sortedCampaigns = R.sort(userCampaigns, CampaignUtils.sortRecent);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-6 border-b pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              Jump back into your worlds, manage sessions, and keep your prep
              organised.
            </p>
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

      {sortedCampaigns.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sortedCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} user={user} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-xl font-semibold">You haven't created a campaign yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Start your first world to track encounters, organise sessions, and
            invite your players. Use the button above to create a new campaign.
          </p>
        </div>
      )}
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
  const latestSession = sessionList.at(0);
  const campaignRoute = appRoutes.campaign({ campaign, user });
  const campaignName = isStringMeaningful(campaign.name)
    ? campaign.name
    : "Unnamed campaign";
  const campaignDescription = toPlainText(
    campaignDetails?.description ?? campaign.description ?? ""
  );
  const createdAt = campaign.created_at
    ? new Date(campaign.created_at)
    : null;
  const createdAtLabel = createdAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
      }).format(createdAt)
    : null;

  return (
    <Card className="flex h-full flex-col border-muted shadow-sm">
      <CardHeader className="gap-4 pb-0">
        <div className="space-y-2">
          <CardTitle className="text-xl">{campaignName}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
            <span>
              {campaignDetails?.system?.name ?? "System not specified"}
            </span>
            <span className="text-muted-foreground">•</span>
            <span>{sessionList.length} sessions</span>
          </CardDescription>
        </div>

        {campaignDetails?.campaignToPlayers?.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {campaignDetails.campaignToPlayers.map(({ player }) => (
              <CreatureIcon key={player.id} creature={player} size="small" />
            ))}
          </div>
        ) : null}

        {createdAtLabel ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Created {createdAtLabel}</span>
          </div>
        ) : null}
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

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Sessions</span>
            <span>{sessionList.length}</span>
          </div>

          {sessionList.length ? (
            <ul className="flex flex-col gap-2">
              {sessionList.slice(0, 3).map((session) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate" title={session.name}>
                    {session.name}
                  </span>
                  <Link
                    href={appRoutes.gameSession({
                      user,
                      campaign,
                      gameSessionId: session.id,
                    })}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View
                  </Link>
                </li>
              ))}
              {sessionList.length > 3 ? (
                <li className="text-xs text-muted-foreground">
                  + {sessionList.length - 3} more session
                  {sessionList.length - 3 === 1 ? "" : "s"}
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No sessions yet. Create one from the campaign page.
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={campaignRoute} className="inline-flex">
            <Button size="sm">Manage campaign</Button>
          </Link>
          {latestSession ? (
            <Link
              href={appRoutes.gameSession({
                user,
                campaign,
                gameSessionId: latestSession.id,
              })}
              className="inline-flex"
            >
              <Button size="sm" variant="outline">
                Resume last session
              </Button>
            </Link>
          ) : null}
        </div>

        <DeleteCampaignDialog
          campaignId={campaign.id}
          campaignName={campaignName}
        />
      </CardFooter>
    </Card>
  );
}

function DeleteCampaignDialog(props: {
  campaignId: string;
  campaignName: string;
}) {
  const { campaignId, campaignName } = props;

  return (
    <LidndDialog
      title="Delete campaign"
      trigger={
        <Button variant="ghost" size="sm" className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      }
      content={
        <form action={deleteCampaign} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            This will permanently remove <strong>{campaignName}</strong> and
            all of its sessions and encounters. This action cannot be undone.
          </p>
          <input type="hidden" name="campaign_id" value={campaignId} />
          <Button type="submit" variant="destructive">
            Delete campaign
          </Button>
        </form>
      }
    />
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
