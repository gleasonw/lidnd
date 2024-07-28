import { NextRequest, NextResponse } from "next/server";
import { parse } from "@conform-to/zod";
import { creatureUploadSchema } from "@/app/[username]/[campaign_slug]/encounter/types";
import { LidndAuth } from "@/app/authentication";
import { ServerCreature } from "@/server/creatures";

export const POST = async (req: NextRequest, res: NextResponse) => {
  const user = await LidndAuth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No session found." }, { status: 400 });
  }
  const formData = await req.formData();
  const creature = parse(formData, {
    schema: creatureUploadSchema,
  });
  if (!creature.value) {
    return NextResponse.json({ error: creature.error }, { status: 400 });
  }
  await ServerCreature.create({ user }, creature.value);
  return NextResponse.json({ Message: "Success", status: 201 });
};
