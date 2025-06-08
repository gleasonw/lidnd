import {
  CampaignParty,
  CreateEncounterForm,
} from "./encounter/campaign-encounters-overview";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MoveLeft, Plus, Calendar, BookIcon, Clock } from "lucide-react";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { db } from "@/server/db";
import * as R from "remeda";
import { encounters, gameSessions } from "@/server/db/schema";
import { Input } from "@/components/ui/input";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { EncounterUtils } from "@/utils/encounters";
import { formatSeconds } from "@/lib/utils";

export default async function CampaignPage(props: {
  params: Promise<{
    campaign_slug: string;
    user_id: string;
  }>;
  searchParams: Promise<{
    game_session?: string;
  }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return redirect(appRoutes.login);
  }

  const campaignData = await ServerCampaign.campaignFromSlug(
    UserUtils.context(user),
    params.campaign_slug
  );

  if (!campaignData) {
    console.error("No campaign found, layout should have redirected");
    return <div>No campaign found... this is a bug</div>;
  }

  if (searchParams?.game_session) {
    return (
      <GameSessionView
        gameSessionId={searchParams.game_session}
        campaignId={campaignData.id}
      />
    );
  }

  const sessionsInCampaign = await ServerCampaign.sessionsForCampaign(
    { user },
    campaignData.id
  );

  async function createNewSession(form: FormData) {
    "use server";
    if (!user) {
      console.error("No user found, cannot create session");
      return { message: "No user found", status: 400 };
    }
    if (!campaignData) {
      console.error("No campaign data found, cannot create session");
      return { message: "No campaign found", status: 400 };
    }
    const name = form.get("name")?.toString() || "New Session";
    const description = form.get("description")?.toString() || "";
    console.log(
      "Creating new session with name:",
      name,
      "and description:",
      description
    );
    if (!name) {
      return { message: "Name is required", status: 400 };
    }

    const newSession = await db.insert(gameSessions).values({
      name,
      description,
      user_id: user.id,
      campaign_id: campaignData.id,
    });
    revalidatePath(appRoutes.campaign({ campaign: campaignData, user }));
    return newSession;
  }

  return (
    <CampaignId value={campaignData.id}>
      <div className="flex flex-col gap-6 p-4 max-w-6xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href={appRoutes.dashboard(user)}>
            <Button variant="ghost" className="opacity-60 hover:opacity-100">
              <MoveLeft className="mr-2 h-4 w-4" />
              All campaigns
            </Button>
          </Link>
          <CampaignParty campaign={campaignData} />

          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Sessions</h1>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <LidndDialog
              content={
                <form action={createNewSession} className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Session name</label>
                    <Input
                      type="text"
                      name="name"
                      placeholder="Enter session name"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Session description
                    </label>
                    <Input
                      type="text"
                      name="description"
                      placeholder="Enter session description"
                      className="w-full"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Session
                  </Button>
                </form>
              }
              title="Create New Session"
              trigger={
                <Button
                  variant="default"
                  size="lg"
                  className="px-8 py-6 text-base"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create New Session
                </Button>
              }
            />
          </div>

          {sessionsInCampaign.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessionsInCampaign.map((session) => (
                <Link
                  key={session.id}
                  href={appRoutes.gameSession({
                    user,
                    campaign: campaignData,
                    gameSessionId: session.id,
                  })}
                  className="group"
                >
                  <div className="p-4 border rounded-lg hover:shadow-md transition-all duration-200 group-hover:border-primary/50 bg-card">
                    <h3 className="font-medium text-lg mb-2 group-hover:text-primary transition-colors">
                      {session.name}
                    </h3>
                    {session.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {session.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p className="text-lg mb-2">No sessions yet</p>
                <p className="text-sm">
                  Create your first session to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </CampaignId>
  );
}

async function GameSessionView({
  gameSessionId,
  campaignId,
}: {
  gameSessionId: string;
  campaignId: string;
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot view game session");
    return <div>No user found</div>;
  }
  const [encountersInSession, campaign] = await Promise.all([
    await db.query.encounters.findMany({
      where: and(
        eq(encounters.session_id, gameSessionId),
        eq(encounters.user_id, user.id)
      ),
      with: {
        participants: {
          with: {
            creature: true,
            status_effects: {
              with: {
                effect: true,
              },
            },
          },
        },
      },
    }),
    await ServerCampaign.campaignById({ user }, campaignId),
  ]);
  if (!campaign) {
    console.error("No campaign found for game session");
    return <div>No campaign found</div>;
  }
  const sumActiveDuration = R.sumBy(encountersInSession, (e) =>
    EncounterUtils.durationSeconds(e, {
      playerLevel: campaign?.party_level,
    })
  );
  return (
    <div className="flex flex-col w-full justify-center items-center">
      <div className="flex flex-col gap-5 max-h-full overflow-hidden h-full w-full max-w-6xl">
        <div className="h-[200px]">
          <CreateEncounterForm gameSessionId={gameSessionId} />
        </div>
        <div className="flex flex-col">
          <div className="flex justify-between items-center w-full">
            <h1 className={"text-2xl gap-5 flex items-center"}>
              <BookIcon />
              <span className="py-2 text-xl">Session docket</span>
            </h1>
            <span className="opacity-50 flex items-center gap-2 text-sm ml-auto">
              <Clock className="text-4xl" />
              <span>Est. duration:</span>
              {formatSeconds(sumActiveDuration)}
            </span>
          </div>

          <div className="grid grid-cols-4 w-full max-h-full gap-2 items-center">
            {encountersInSession.map((encounter) => (
              <Link
                key={encounter.id}
                href={appRoutes.encounter({ campaign, encounter, user })}
              >
                <Button>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{encounter.name}</span>
                    {encounter.description && (
                      <span className="text-sm text-muted-foreground">
                        {encounter.description}
                      </span>
                    )}
                  </div>
                  <span className="ml-auto text-xs opacity-70">
                    {encounter.participants.length} participants
                  </span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
