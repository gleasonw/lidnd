import {
  CampaignParty,
  CreateEncounterForm,
} from "./encounter/campaign-encounters-overview";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { Calendar, MoveLeft, Trash2 } from "lucide-react";
import { db } from "@/server/db";
import * as R from "remeda";
import {
  campaignCreatureLink,
  creatures,
  encounters,
  gameSessions,
} from "@/server/db/schema";
import { revalidatePath } from "next/cache";
import { and, eq, exists } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { EncounterCard } from "@/app/[username]/[campaign_slug]/EncounterCard";
import { CreateEncounterButton } from "@/app/[username]/[campaign_slug]/CreateEncounterButton";
import { SessionCreateForm } from "@/app/[username]/[campaign_slug]/CreateSessionForm";
import { ButtonWithTooltip } from "@/components/ui/tip";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { RemoveCreatureFromCampaign } from "@/app/[username]/[campaign_slug]/RemoveCreatureFromCampaignButton";

export default async function CampaignPage(props: {
  params: Promise<{
    campaign_slug: string;
    user_id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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

  const campaignRoute = appRoutes.campaign({ campaign: campaignData, user });

  const sessionsInCampaign = await ServerCampaign.sessionsForCampaign(
    { user },
    campaignData.id
  );

  const sortedSessions = R.sort(
    sessionsInCampaign,
    (a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0)
  );

  async function deleteSession(form: FormData) {
    "use server";
    if (!user) {
      console.error("No user found, cannot delete session");
      throw new Error("No user found");
    }

    const sessionId = form.get("session_id")?.toString();

    if (!sessionId) {
      throw new Error("Session id is required");
    }

    await db
      .update(encounters)
      .set({ session_id: null })
      .where(
        and(
          eq(encounters.session_id, sessionId),
          eq(encounters.user_id, user.id)
        )
      );

    await db
      .delete(gameSessions)
      .where(
        and(eq(gameSessions.id, sessionId), eq(gameSessions.user_id, user.id))
      );

    revalidatePath(campaignRoute);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 max-h-full overflow-auto">
      <header className="flex flex-col gap-6 border-b pb-6">
        <div className="flex items-center justify-between gap-4">
          <Link href={appRoutes.dashboard(user)}>
            <Button
              variant="ghost"
              className="px-2 text-sm opacity-60 hover:opacity-100"
            >
              <MoveLeft className="mr-2 h-4 w-4" />
              All campaigns
            </Button>
          </Link>
          <CampaignParty campaign={campaignData} />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {campaignData.name}
            </h1>
            {campaignData.description ? (
              <p className="text-muted-foreground max-w-2xl text-sm">
                {campaignData.description}
              </p>
            ) : null}
          </div>
          <div className="flex">
            <Link
              href={appRoutes.sessionsForCampaign({
                campaign: campaignData,
                user,
              })}
            >
              <Button
                variant={
                  searchParams?.tab !== "creatures" ? "outline" : "ghost"
                }
              >
                Sessions
              </Button>
            </Link>
            <Link
              href={appRoutes.creaturesForCampaign({
                campaign: campaignData,
                user,
              })}
            >
              <Button
                variant={
                  searchParams?.tab === "creatures" ? "outline" : "ghost"
                }
              >
                Creatures
              </Button>
            </Link>
          </div>
        </div>
      </header>
      {searchParams?.tab === "creatures" ? (
        <section>
          <CampaignCreatures campaign={campaignData} />
        </section>
      ) : (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Sessions</h2>
            </div>
            {/*TODO: wacky bug that makes the next dialog disappear if this one isn't present. moving fast for now */}
            <SessionCreateForm campaignData={campaignData} />
          </div>
          {sortedSessions.length === 0 ? (
            <div className="flex flex-col gap-4">
              <p className="font-medium text-base text-foreground">
                No sessions yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSessions.map((session) => {
                const encounterCount = session.encounters?.length ?? 0;
                return (
                  <Card
                    key={session.id}
                    className="border border-border/60 bg-card shadow-sm"
                  >
                    <div className="flex flex-col gap-6 p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold tracking-tight">
                            {session.name}
                          </h3>
                          {session.description ? (
                            <p className="max-w-2xl text-sm text-muted-foreground">
                              {session.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={deleteSession} className="ml-auto">
                            <input
                              type="hidden"
                              name="session_id"
                              value={session.id}
                            />
                            <ButtonWithTooltip
                              text="Delete session"
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-gray-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </ButtonWithTooltip>
                          </form>
                        </div>
                      </div>

                      {encounterCount === 0 ? (
                        <CreateEncounterForm gameSessionId={session.id} />
                      ) : (
                        <>
                          <ul className="grid gap-4 md:grid-cols-2">
                            {session.encounters
                              ?.slice()
                              .sort(
                                (a, b) =>
                                  (a.created_at?.getTime() ?? 0) -
                                  (b.created_at?.getTime() ?? 0)
                              )
                              .map((encounter) => (
                                <EncounterCard
                                  key={encounter.id}
                                  encounter={encounter}
                                />
                              ))}
                          </ul>
                          <CreateEncounterButton gameSessionId={session.id} />
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

async function CampaignCreatures({ campaign }: { campaign: { id: string } }) {
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return redirect(appRoutes.login);
  }
  const onlyCampaignFilter = exists(
    db
      .select()
      .from(campaignCreatureLink)
      .where(
        and(
          eq(campaignCreatureLink.campaign_id, campaign.id),
          eq(campaignCreatureLink.creature_id, creatures.id)
        )
      )
  );
  const creaturesToShow = await db
    .select()
    .from(creatures)
    .where(and(eq(creatures.user_id, user.id), onlyCampaignFilter));
  return (
    <div>
      TODO: add creature
      <div className="grid grid-cols-2 lg:grid-cols-3">
        {creaturesToShow.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <CreatureIcon creature={c} />
            {c.name}
            <RemoveCreatureFromCampaign creature={c} campaign={campaign} />
          </div>
        ))}
      </div>
    </div>
  );
}
