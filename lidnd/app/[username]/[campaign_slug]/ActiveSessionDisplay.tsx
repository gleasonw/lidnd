import { LidndAuth } from "@/app/authentication";
import { db } from "@/server/db";
import { and, eq, isNull } from "drizzle-orm";
import { gameSessions } from "@/server/db/schema";
import { ActiveSessionButton } from "@/app/[username]/[campaign_slug]/ActiveSessionButton";

export async function ActiveSessionDisplay({
  campaignId,
}: {
  campaignId: string;
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    return null;
  }
  const activeSession = await db
    .select()
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.campaign_id, campaignId),
        eq(gameSessions.user_id, user.id),
        isNull(gameSessions.ended_at)
      )
    );
  if (activeSession.length > 1) {
    console.error("Multiple active sessions found, this is a bug");
    return null;
  }
  const targetActiveSession = activeSession.at(0) || null;
  if (targetActiveSession === null) {
    return null;
  }

  return <ActiveSessionButton session={targetActiveSession} />;
}
