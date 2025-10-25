"use server";

import { LidndAuth } from "@/app/authentication";
import { db } from "@/server/db";
import {
  gameSessions,
  gameSessionSchema,
  type GameSessionPost,
} from "@/server/db/schema";
import { revalidatePath } from "next/cache";

export async function createSession(
  gameSession: Omit<GameSessionPost, "user_id">
) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot create session");
    throw new Error("No user found");
  }
  const parsedSession = gameSessionSchema
    .omit({ user_id: true })
    .safeParse(gameSession);
  if (!parsedSession.success) {
    console.error("Game session input parsing failed", parsedSession.error);
    throw new Error("Invalid input");
  }
  await db
    .insert(gameSessions)
    .values({ ...parsedSession.data, user_id: user.id });
  revalidatePath("/");
}
