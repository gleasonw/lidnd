import { createCreature, getPageSession } from "@/server/api/utils";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "@conform-to/zod";
import { creatureUploadSchema } from "@/server/api/router";
import { db } from "@/server/api/db";
import { encounter_participant } from "@/server/api/db/schema";
import { z } from "zod";

export const POST = async (req: NextRequest, res: NextResponse) => {
  const session = await getPageSession();
  if (!session) {
    return NextResponse.json({ error: "No session found." }, { status: 400 });
  }
  const formData = await req.formData();
  const creature = parse(formData, {
    schema: creatureUploadSchema.merge(z.object({ encounter_id: z.string() })),
  });
  if (!creature.value) {
    return NextResponse.json({ error: creature.error }, { status: 400 });
  }
  const newCreature = await createCreature(session.user.userId, creature.value);
  await db
    .insert(encounter_participant)
    .values({
      encounter_id: creature.value.encounter_id,
      creature_id: newCreature.id,
      hp: newCreature.max_hp,
    });
  return NextResponse.json({ Message: "Success", status: 201 });
};
