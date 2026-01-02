import { CreateNewSessionButton } from "@/app/[username]/[campaign_slug]/CreateNewSessionButton";
import { LidndAuth } from "@/app/authentication";
import { db } from "@/server/db";
import { and, eq, isNull, desc } from "drizzle-orm";
import { gameSessions } from "@/server/db/schema";
import { ActiveSessionButton } from "@/app/[username]/[campaign_slug]/ActiveSessionButton";

export async function SessionButton({ campaignId }: { campaignId: string }) {
  const user = await LidndAuth.getUser();
  if (!user) {
    return null;
  }
  const [activeSession, lastSession] = await Promise.all([
    db
      .select()
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.campaign_id, campaignId),
          eq(gameSessions.user_id, user.id),
          isNull(gameSessions.ended_at)
        )
      )
      .limit(1),
    db
      .select()
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.campaign_id, campaignId),
          eq(gameSessions.user_id, user.id)
        )
      )
      .orderBy(desc(gameSessions.ended_at))
      .limit(1),
  ]);

  const targetActiveSession = activeSession.at(0) || null;
  const lastSessionData = lastSession.at(0) || null;

  return (
    <div className="h-10 w-full flex">
      {targetActiveSession ? (
        <ActiveSessionButton session={targetActiveSession} />
      ) : (
        <CreateNewSessionButton lastSession={lastSessionData} />
      )}
    </div>
  );
}
