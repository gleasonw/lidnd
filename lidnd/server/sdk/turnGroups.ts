import { db } from "@/server/db";
import { turn_groups, type TurnGroupInsert } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export function updateTurnGroup(
  tg: TurnGroupInsert & { id: string },
  dbObject = db
) {
  return dbObject
    .update(turn_groups)
    .set({
      ...tg,
    })
    .where(eq(turn_groups.id, tg.id))
    .returning();
}
