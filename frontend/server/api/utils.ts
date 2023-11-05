import { db } from "@/server/api/db";
import { creatures } from "@/server/api/db/schema";
import { Creature } from "@/server/api/router";
import { TRPCError } from "@trpc/server";

export async function uploadCreatureImages(creature: Creature) {
  //TODO: aws image uploads, etc
}

export async function deleteCreatureImages(id: string) {
  //TODO: delete aws image uploads, etc
}
