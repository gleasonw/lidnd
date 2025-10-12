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
  ChevronDown,
  MoveLeft,
  Plus,
  Trash,
  Trash2,
  BookIcon,
  Clock,
  MoreVertical,
  MoreHorizontal,
} from "lucide-react";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { db } from "@/server/db";
import * as R from "remeda";
import { encounters, gameSessions } from "@/server/db/schema";
import { Input } from "@/components/ui/input";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { EncounterUtils } from "@/utils/encounters";
import { formatSeconds } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import clsx from "clsx";
import type { EncounterWithParticipants } from "@/server/api/router";
import type { Campaign } from "@/app/[username]/types";
import { deleteEncounter } from "@/app/[username]/actions";
import { LidndPopover } from "@/encounters/base-popover";

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

          {sessionsInCampaign.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
              <p className="font-medium text-base text-foreground">
                No sessions yet
              </p>
              <p>Create your first session to start organizing encounters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessionsInCampaign.map((session) => {
                const encounterCount = session.encounters?.length ?? 0;

                return (
                  <details
                    key={session.id}
                    className="group rounded-lg border bg-card shadow-sm"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                      <div className="flex items-start gap-3">
                        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                        <div className="space-y-1">
                          <p className="text-lg font-semibold leading-none">
                            {session.name}
                          </p>
                          {session.description ? (
                            <p className="text-sm text-muted-foreground">
                              {session.description}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            {encounterCount} encounter
                            {encounterCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={appRoutes.gameSession({
                            user,
                            campaign: campaignData,
                            gameSessionId: session.id,
                          })}
                        >
                          <Button variant="ghost" size="sm" className="gap-2">
                            <MoreHorizontal className="h-4 w-4" />
                            Manage session
                          </Button>
                        </Link>

                        <form action={deleteSession}>
                          <input
                            type="hidden"
                            name="session_id"
                            value={session.id}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete session</span>
                          </Button>
                        </form>
                      </div>
                    </summary>

                    <div className="space-y-4 border-t px-5 py-4">
                      {encounterCount === 0 ? (
                        <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                          No encounters yet in this session.
                        </div>
                      ) : (
                        <ul className="space-y-3">
                          {session.encounters?.map((encounter) => (
                            <li
                              key={encounter.id}
                              className="flex flex-col gap-3 rounded-md border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex flex-col gap-3">
                                <span className="text-base font-medium">
                                  {encounter.name || "Unnamed encounter"}
                                </span>
                                {encounter.description ? (
                                  <span className="text-sm text-muted-foreground line-clamp-2">
                                    {encounter.description}
                                  </span>
                                ) : null}
                                <div className="flex flex-wrap items-center gap-3">
                                  <DifficultyBadge encounter={encounter} />
                                  <MonstersInEncounter id={encounter.id} />
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={appRoutes.observe(encounter.id)}
                                  className="flex"
                                >
                                  <Button size="sm" variant="secondary">
                                    View
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
                                <form action={removeEncounter}>
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

                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <LidndDialog
                          title={`Add encounter to ${session.name}`}
                          content={
                            <CreateEncounterForm gameSessionId={session.id} />
                          }
                          trigger={
                            <Button size="sm" className="gap-2">
                              <Plus className="h-4 w-4" />
                              Add encounter
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </details>
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

          <div className="flex flex-wrap w-full max-h-full gap-2 items-center">
            {encountersInSession.map((encounter) => (
              <EncounterCard
                key={encounter.id}
                encounter={encounter}
                campaign={campaign}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

async function EncounterCard({
  encounter,
  campaign,
}: {
  encounter: EncounterWithParticipants;
  campaign: Campaign;
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot render encounter card");
    return <div>No user found</div>;
  }
  return (
    <Card className={clsx("flex px-5 gap-3 max-w-[600px] items-center")}>
      <Link
        href={appRoutes.encounter({ campaign, encounter, user })}
        className="flex gap-3 w-full  h-20 items-center"
      >
        <h2 className={"flex items-center"}>
          <span className="max-w-full truncate">
            {encounter.name ? encounter.name : "Unnamed"}
          </span>
        </h2>

        <MonstersInEncounter id={encounter.id} />
      </Link>
      <LidndPopover
        trigger={
          <Button variant="ghost">
            <MoreVertical />
          </Button>
        }
      >
        <Button
          variant="ghost"
          className="text-red-500"
          onClick={async () => {
            "use server";
            deleteEncounter(encounter);
          }}
        >
          Delete encounter
          <Trash />
        </Button>
      </LidndPopover>
      <DifficultyBadge encounter={encounter} />
    </Card>
  );
}
