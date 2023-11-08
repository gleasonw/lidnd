import { createCreature, getPageSession } from "@/server/api/utils";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "@conform-to/zod";
import { creatureUploadSchema } from "@/server/api/router";

export const POST = async (req: NextRequest) => {
  const session = await getPageSession();
  if (!session) {
    return NextResponse.json({ error: "No session found." }, { status: 400 });
  }
  const responseBody = await req.json();
  const dataToDelete = 
  if (!creature.value) {
    return NextResponse.json({ error: creature.error }, { status: 400 });
  }
  await createCreature(session.user.userId, creature.value);
  return NextResponse.json({ Message: "Success", status: 201 });
};
