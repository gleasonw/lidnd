import { createCreature, getPageSession } from "@/server/api/utils";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "@conform-to/zod";
import { creatureUploadSchema } from "@/encounters/types";

export const POST = async (req: NextRequest, res: NextResponse) => {
  const session = await getPageSession();
  if (!session) {
    return NextResponse.json({ error: "No session found." }, { status: 400 });
  }
  const formData = await req.formData();
  const creature = parse(formData, {
    schema: creatureUploadSchema,
  });
  if (!creature.value) {
    return NextResponse.json({ error: creature.error }, { status: 400 });
  }
  await createCreature(session.user.userId, creature.value);
  return NextResponse.json({ Message: "Success", status: 201 });
};
