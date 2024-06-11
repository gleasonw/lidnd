import { appRoutes } from "@/app/routes";
import { db } from "@/server/api/db";
import { settings, users } from "@/server/api/db/schema";
import { LidndAuth } from "@/app/authentication";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { OAuth2RequestError } from "arctic";

export const GET = async (request: NextRequest) => {
  const storedState = cookies().get("discord_oauth_state")?.value;
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  // validate state

  if (!storedState || !state || storedState !== state || !code) {
    console.error("Invalid state when getting Discord user");
    return new Response(null, {
      status: 400,
    });
  }

  try {
    const oauthUser = await LidndAuth.getOauthUser(code);
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.discord_id, oauthUser.id),
    });
    console.log(existingUser);

    if (existingUser) {
      await LidndAuth.createSession(existingUser.id);
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
        },
      });
    }

    const userCreationResult = await db
      .insert(users)
      .values({
        username: oauthUser.username,
        avatar: oauthUser.avatar,
        discord_id: oauthUser.id,
      })
      .returning();

    const newUser = userCreationResult.at(0);

    if (!newUser) {
      throw new Error("Failed to create user");
    }

    await db.insert(settings).values({
      user_id: newUser.id,
    });

    await LidndAuth.createSession(newUser.id);

    const redirectUrl = cookies().get("redirect")?.value;
    const redirectLocation =
      redirectUrl && redirectUrl !== "undefined"
        ? redirectUrl
        : appRoutes.dashboard;

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectLocation,
      },
    });
  } catch (e) {
    console.error(e);
    if (e instanceof OAuth2RequestError) {
      // invalid code
      return new Response(null, {
        status: 400,
      });
    }
    return new Response(null, {
      status: 500,
    });
  }
};
