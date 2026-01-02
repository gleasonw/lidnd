import { ServerCampaign } from "@/server/sdk/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { db } from "@/server/db";
import { encounters, gameSessions } from "@/server/db/schema";
import { and, eq, gte, lte, isNotNull } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { EncounterImage } from "@/app/[username]/[campaign_slug]/EncounterImage";

// TODO: thanks sonnet 4.5. in the future, we probably want to explicitly link
// encounters to sessions. but this is fine for now.
export default async function CampaignSessionsPage(props: {
  params: Promise<{
    campaign_slug: string;
    username: string;
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

  const sessions = await db.query.gameSessions.findMany({
    where: and(
      eq(gameSessions.campaign_id, campaignData.id),
      eq(gameSessions.user_id, user.id)
    ),
    orderBy: (s, { desc }) => [desc(s.started_at), desc(s.created_at)],
  });

  // For each session, get encounters started within the session timeframe
  const sessionsWithEncounters = await Promise.all(
    sessions.map(async (session) => {
      if (!session.started_at) {
        return {
          ...session,
          encounters: [],
        };
      }

      const conditions = [
        eq(encounters.campaign_id, campaignData.id),
        isNotNull(encounters.started_at),
        gte(encounters.started_at, session.started_at),
      ];

      if (session.ended_at) {
        conditions.push(lte(encounters.started_at, session.ended_at));
      }

      const sessionEncounters = await db.query.encounters.findMany({
        where: and(...conditions),
        orderBy: (e, { asc }) => [asc(e.started_at)],
        with: {
          participants: {
            with: {
              creature: true,
            },
          },
        },
      });

      return {
        ...session,
        encounters: sessionEncounters,
      };
    })
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-6">
      <section className="flex flex-col gap-4">
        {sessionsWithEncounters.length === 0 ? (
          <p className="text-muted-foreground">
            No sessions yet. Start a session from the campaign page.
          </p>
        ) : (
          <div className="grid gap-4">
            {sessionsWithEncounters.map((session) => (
              <Card key={session.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{session.name}</span>
                    {session.encounters.length > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {session.encounters.length} encounter
                        {session.encounters.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {session.description && (
                    <p className="text-sm text-muted-foreground">
                      {session.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-sm">
                    {session.started_at && (
                      <div>
                        <span className="font-medium">Started: </span>
                        <span className="text-muted-foreground">
                          {new Date(session.started_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    )}
                    {session.ended_at && (
                      <div>
                        <span className="font-medium">Ended: </span>
                        <span className="text-muted-foreground">
                          {new Date(session.ended_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {session.victory_count > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Victories: </span>
                      <span className="text-muted-foreground">
                        {session.victory_count}
                      </span>
                    </div>
                  )}

                  {session.encounters.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Encounters</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {session.encounters.map((encounter) => {
                          const duration =
                            encounter.started_at && encounter.ended_at
                              ? Math.round(
                                  (new Date(encounter.ended_at).getTime() -
                                    new Date(encounter.started_at).getTime()) /
                                    1000 /
                                    60
                                )
                              : null;

                          return (
                            <Link
                              key={encounter.id}
                              href={appRoutes.encounter({
                                campaign: campaignData,
                                encounter,
                                user,
                              })}
                            >
                              <Card className="hover:bg-accent transition-colors cursor-pointer">
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <EncounterImage encounter={encounter} />
                                    <div className="font-medium text-sm truncate flex-1">
                                      {encounter.name}
                                    </div>
                                  </div>
                                  {duration !== null ? (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {duration} min
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Pending
                                    </Badge>
                                  )}
                                </CardContent>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
