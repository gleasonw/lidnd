import {
  CampaignParty,
  CreateEncounterForm,
  DifficultyBadge,
  MonstersInEncounter,
} from "./encounter/campaign-encounters-overview";
import { ServerCampaign } from "@/server/sdk/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MoveLeft,
  Plus,
  Trash2,
  BookIcon,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { db } from "@/server/db";
import * as R from "remeda";
import { encounters, gameSessions } from "@/server/db/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { EncounterUtils } from "@/utils/encounters";
import { formatSeconds } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { EncounterWithParticipants } from "@/server/api/router";
import { deleteEncounter } from "@/app/[username]/actions";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QuickAddParticipantsButton } from "./game-session-quick-add";

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

  const campaignRoute = appRoutes.campaign({ campaign: campaignData, user });

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

  const sortedSessions = R.sort(
    sessionsInCampaign,
    (a, b) =>
      (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0)
  );

  const createdAtLabel = campaignData.created_at
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        campaignData.created_at instanceof Date
          ? campaignData.created_at
          : new Date(campaignData.created_at)
      )
    : null;

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

  async function removeEncounter(form: FormData) {
    "use server";

    const encounterId = form.get("encounter_id")?.toString();

    if (!encounterId) {
      throw new Error("Encounter id is required");
    }

    await deleteEncounter({ id: encounterId });
    revalidatePath(campaignRoute);
  }

  return (
    <CampaignId value={campaignData.id}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6">
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
                      required
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
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add session
                </Button>
              }
            />
          </div>

          {sortedSessions.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
              <p className="font-medium text-base text-foreground">
                No sessions yet
              </p>
              <p>Create your first session to start organizing encounters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSessions.map((session) => {
                const encounterCount = session.encounters?.length ?? 0;
                const estimatedDuration = Math.round(
                  session.encounters?.reduce((total, encounter) => {
                    return (
                      total +
                      EncounterUtils.durationSeconds(encounter, {
                        playerLevel: campaignData.party_level,
                      })
                    );
                  }, 0) ?? 0
                );
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
                            {createdLabel ? `Created ${createdLabel}` : "Session"}
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

                        <div className="flex flex-col items-end gap-2 text-xs font-medium text-muted-foreground">
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-2 text-xs"
                          >
                            <BookIcon className="h-3.5 w-3.5" />
                            {encounterCount} encounter
                            {encounterCount === 1 ? "" : "s"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-2 text-xs"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {encounterCount > 0
                              ? formatSeconds(estimatedDuration)
                              : "No encounters yet"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={appRoutes.gameSession({
                            user,
                            campaign: campaignData,
                            gameSessionId: session.id,
                          })}
                        >
                          <Button size="sm" className="gap-2">
                            <MoreHorizontal className="h-4 w-4" />
                            Open session
                          </Button>
                        </Link>

                        <LidndDialog
                          title={`Add encounter to ${session.name}`}
                          content={
                            <CreateEncounterForm gameSessionId={session.id} />
                          }
                          trigger={
                            <Button size="sm" variant="secondary" className="gap-2">
                              <Plus className="h-4 w-4" />
                              Add encounter
                            </Button>
                          }
                        />

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

                      <Separator />

                      {encounterCount === 0 ? (
                        <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                          No encounters yet in this session.
                        </div>
                      ) : (
                        <ul className="grid gap-4 md:grid-cols-2">
                          {session.encounters?.map((encounter) => (
                            <li
                              key={encounter.id}
                              className="flex flex-col gap-4 rounded-lg border bg-background p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="text-base font-medium">
                                    {encounter.name || "Unnamed encounter"}
                                  </p>
                                  {encounter.description ? (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {encounter.description}
                                    </p>
                                  ) : null}
                                </div>
                                <DifficultyBadge encounter={encounter} />
                              </div>
                              <MonstersInEncounter id={encounter.id} />
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={appRoutes.observe(encounter.id)}
                                  className="flex"
                                >
                                  <Button size="sm" variant="secondary">
                                    Observe
                                  </Button>
                                </Link>
                                <Link
                                  href={appRoutes.encounter({
                                    campaign: campaignData,
                                    encounter,
                                    user,
                                  })}
                                  className="flex"
                                >
                                  <Button size="sm" variant="outline">
                                    Edit
                                  </Button>
                                </Link>
                                <form action={removeEncounter} className="ml-auto">
                                  <input
                                    type="hidden"
                                    name="encounter_id"
                                    value={encounter.id}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    Delete
                                  </Button>
                                </form>
                              </div>
                            </li>
                          ))}
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

  const [session, campaign] = await Promise.all([
    await ServerCampaign.sessionFromId({ user }, gameSessionId),
    await ServerCampaign.campaignById({ user }, campaignId),
  ]);

  if (!campaign) {
    console.error("No campaign found for game session");
    return <div>No campaign found</div>;
  }

  if (!session) {
    console.error("No session found");
    return <div>No session found</div>;
  }

  const campaignRoute = appRoutes.campaign({ campaign, user });
  const sessionRoute = appRoutes.gameSession({
    campaign,
    user,
    gameSessionId,
  });

  const sortedEncounters = R.sort(session.encounters ?? [], (a, b) => {
    return (
      (b.created_at ? new Date(b.created_at).getTime() : 0) -
      (a.created_at ? new Date(a.created_at).getTime() : 0)
    );
  });

  const encounterCount = sortedEncounters.length;
  const totalDurationSeconds = Math.round(
    R.sumBy(sortedEncounters, (encounter) =>
      EncounterUtils.durationSeconds(encounter as EncounterWithParticipants, {
        playerLevel: campaign.party_level,
      })
    )
  );

  const createdLabel = session.created_at
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
      }).format(
        session.created_at instanceof Date
          ? session.created_at
          : new Date(session.created_at)
      )
    : null;

  async function updateSessionDetails(formData: FormData) {
    "use server";

    const name = formData.get("name")?.toString().trim();
    const description = formData.get("description")?.toString().trim();

    if (!name) {
      throw new Error("Session name is required");
    }

    await db
      .update(gameSessions)
      .set({
        name,
        description: description && description.length > 0 ? description : null,
      })
      .where(
        and(
          eq(gameSessions.id, session.id),
          eq(gameSessions.user_id, user.id)
        )
      );

    await Promise.all([
      revalidatePath(campaignRoute),
      revalidatePath(sessionRoute),
    ]);
  }

  async function removeEncounter(formData: FormData) {
    "use server";

    const encounterId = formData.get("encounter_id")?.toString();

    if (!encounterId) {
      throw new Error("Encounter id is required");
    }

    await deleteEncounter({ id: encounterId });

    await Promise.all([
      revalidatePath(campaignRoute),
      revalidatePath(sessionRoute),
    ]);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={campaignRoute}>
          <Button
            variant="ghost"
            className="px-2 text-sm opacity-60 hover:opacity-100"
          >
            <MoveLeft className="mr-2 h-4 w-4" />
            Back to campaign
          </Button>
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          {createdLabel ? <span>Created {createdLabel}</span> : null}
          <Badge variant="secondary" className="flex items-center gap-2 text-xs">
            <BookIcon className="h-3.5 w-3.5" />
            {encounterCount} encounter
            {encounterCount === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5" />
            {encounterCount > 0
              ? formatSeconds(totalDurationSeconds)
              : "Add encounters to estimate runtime"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <Card className="border border-border/60 bg-card p-6 shadow-sm">
          <form action={updateSessionDetails} className="flex flex-col gap-5">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="session-name">
                Session name
              </label>
              <Input
                id="session-name"
                name="name"
                defaultValue={session.name}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="session-description"
              >
                Session summary
              </label>
              <Textarea
                id="session-description"
                name="description"
                defaultValue={session.description ?? ""}
                rows={4}
                placeholder="Objectives, table notes, or reminders for this session."
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Updates save across the campaign once you click save.
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="gap-2">
                Save session details
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-4">
          <CreateEncounterForm gameSessionId={session.id} />
          <Card className="border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
            Build encounters here or quick add creatures from your vault to keep
            this session battle-ready.
          </Card>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Encounters</h2>
          </div>
          <span className="text-sm text-muted-foreground">
            Sorted by most recent activity
          </span>
        </div>

        {encounterCount === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
            <p className="text-base font-medium text-foreground">
              No encounters in this session yet
            </p>
            <p>Add an encounter or quick add saved creatures to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {sortedEncounters.map((encounter) => {
              const encounterDuration = Math.round(
                EncounterUtils.durationSeconds(
                  encounter as EncounterWithParticipants,
                  {
                    playerLevel: campaign.party_level,
                  }
                )
              );
              const encounterCreatedLabel = encounter.created_at
                ? new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(
                    encounter.created_at instanceof Date
                      ? encounter.created_at
                      : new Date(encounter.created_at)
                  )
                : null;

              return (
                <Card
                  key={encounter.id}
                  className="flex flex-col gap-4 border border-border/60 bg-background p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold tracking-tight">
                        {encounter.name ?? "Unnamed encounter"}
                      </h3>
                      {encounter.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {encounter.description}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {encounterCreatedLabel ? (
                          <span>Updated {encounterCreatedLabel}</span>
                        ) : null}
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 text-[0.7rem]"
                        >
                          <Clock className="h-3 w-3" />
                          {formatSeconds(encounterDuration)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[0.7rem]"
                        >
                          {encounter.participants.length} participant
                          {encounter.participants.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </div>
                    <DifficultyBadge encounter={encounter} />
                  </div>
                  <MonstersInEncounter id={encounter.id} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={appRoutes.observe(encounter.id)}
                      className="flex"
                    >
                      <Button size="sm" variant="secondary">
                        Observe
                      </Button>
                    </Link>
                    <Link
                      href={appRoutes.encounter({
                        campaign,
                        encounter,
                        user,
                      })}
                      className="flex"
                    >
                      <Button size="sm" variant="outline">
                        Edit encounter
                      </Button>
                    </Link>
                    <QuickAddParticipantsButton
                      encounterId={encounter.id}
                      campaignId={campaign.id}
                    />
                    <form action={removeEncounter} className="ml-auto">
                      <input
                        type="hidden"
                        name="encounter_id"
                        value={encounter.id}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
