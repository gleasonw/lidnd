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
import { Calendar, MoveLeft, Plus, Trash2 } from "lucide-react";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { db } from "@/server/db";
import * as R from "remeda";
import { encounters, gameSessions } from "@/server/db/schema";
import { Input } from "@/components/ui/input";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { EncounterCard } from "@/app/[username]/[campaign_slug]/EncounterCard";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default async function CampaignPage(props: {
  params: Promise<{
    campaign_slug: string;
    user_id: string;
  }>;
}) {
  const params = await props.params;
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

  const createdAtLabel = campaignData.created_at
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        campaignData.created_at instanceof Date
          ? campaignData.created_at
          : new Date(campaignData.created_at)
      )
    : null;

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
    <CampaignId value={campaignData.id}>
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

            <div className="flex flex-col items-end text-right text-sm text-muted-foreground">
              {createdAtLabel ? <span>Created {createdAtLabel}</span> : null}
              <span>{sessionsInCampaign.length} sessions</span>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Sessions</h2>
            </div>
            {/*TODO: wacky bug that makes the next dialog disappear if this one isn't present. moving fast for now */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add session
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-screen overflow-auto sm:max-w-[1000px]">
                <DialogTitle>Create new session</DialogTitle>
                <SessionCreateForm campaignData={campaignData} />
              </DialogContent>
              <DialogOverlay />
            </Dialog>
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
                const createdLabel = session.created_at
                  ? new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                    }).format(
                      session.created_at instanceof Date
                        ? session.created_at
                        : new Date(session.created_at)
                    )
                  : null;

                return (
                  <Card
                    key={session.id}
                    className="border border-border/60 bg-card shadow-sm"
                  >
                    <div className="flex flex-col gap-6 p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {createdLabel
                              ? `Created ${createdLabel}`
                              : "Session"}
                          </div>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete session
                            </Button>
                          </form>
                        </div>
                      </div>

                      {encounterCount === 0 ? (
                        <CreateEncounterForm gameSessionId={session.id} />
                      ) : (
                        <ul className="grid gap-4 md:grid-cols-2">
                          {session.encounters?.map((encounter) => (
                            <EncounterCard
                              key={encounter.id}
                              encounter={encounter}
                            />
                          ))}
                          <CreateEncounterForm gameSessionId={session.id} />
                        </ul>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </CampaignId>
  );
}

async function SessionCreateForm({
  campaignData,
}: {
  campaignData: { id: string; name: string; slug: string };
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No session found, layout should have redirected");
    return redirect(appRoutes.login);
  }
  const campaignRoute = appRoutes.campaign({ campaign: campaignData, user });

  async function createNewSession(form: FormData) {
    "use server";
    if (!user) {
      console.error("No user found, cannot create session");
      throw new Error("No user found");
    }
    if (!campaignData) {
      console.error("No campaign data found, cannot create session");
      throw new Error("No campaign found");
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
      throw new Error("Name is required");
    }

    await db.insert(gameSessions).values({
      name,
      description,
      user_id: user.id,
      campaign_id: campaignData.id,
    });
    revalidatePath(campaignRoute);
  }
  return (
    <form action={createNewSession} className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Session name</label>
        <Input
          type="text"
          name="name"
          placeholder="Enter session name"
          className="w-full"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Session description</label>
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
  );
}
