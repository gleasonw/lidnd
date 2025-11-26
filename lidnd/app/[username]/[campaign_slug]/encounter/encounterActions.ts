"use server";
import { LidndAuth } from "@/app/authentication";
import { t } from "@/server/api/base-trpc";
import { appRouter } from "@/server/api/router";
import { type EncounterInsert } from "@/server/db/schema";
import { revalidatePath } from "next/cache";

// TODO: abstract this a bit
export async function updateEncounter(
  encounter: EncounterInsert & { id: string }
) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No user found, cannot update encounter");
    throw new Error("No user found");
  }
  const createCaller = t.createCallerFactory(appRouter);
  const trpcCaller = createCaller({ user });
  await trpcCaller.updateEncounter(encounter);
  revalidatePath("/");
}
