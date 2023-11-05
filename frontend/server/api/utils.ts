import { db } from "@/server/api/db";
import { creatures, encounters } from "@/server/api/db/schema";
import { and, eq } from "drizzle-orm";
import { Creature } from "@/server/api/router";
import { TRPCError } from "@trpc/server";

export async function uploadCreatureImages(creature: Creature) {
  //TODO: aws image uploads, etc
}

export async function deleteCreatureImages(id: string) {
  //TODO: delete aws image uploads, etc
}

export async function getUserEncounter(user_id: number, encounter_id: string) {
  const encounter = await db
    .select()
    .from(encounters)
    .where(
      and(eq(encounters.id, encounter_id), eq(encounters.user_id, user_id))
    );
  if (encounter.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No encounter found",
    });
  }
  return encounter[0];
}

