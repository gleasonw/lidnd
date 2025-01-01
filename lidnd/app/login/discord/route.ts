// app/login/github/route.ts
import { discordAuth } from "@/server/auth/lucia";
import { generateState } from "arctic";
import * as context from "next/headers";

import type { NextRequest } from "next/server";

export const GET = async (request: NextRequest) => {
  const state = generateState();
  const url = await discordAuth.createAuthorizationURL(state, {
    scopes: ["identify"],
  });
  // store state
  (await context.cookies()).set("discord_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  const redirectUrl = request.nextUrl.searchParams.get("redirect");

  if (redirectUrl && redirectUrl !== "undefined") {
    (await context.cookies()).set("redirect", redirectUrl);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
    },
  });
};
