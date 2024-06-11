import { auth, discordAuth } from "@/server/api/auth/lucia";
import { discordApi } from "@/utils/discord";
import { cookies } from "next/headers";
import { cache } from "react";

export const LidndAuth = {
  getOauthUser: async (code: string) => {
    const tokens = await discordAuth.validateAuthorizationCode(code);
    const discordUser = await discordApi.getUser(tokens.accessToken);

    if (!discordUser) {
      throw new Error("No oauth user found with that code");
    }
    return discordUser;
  },

  createSession: async (user_id: string) => {
    const session = await auth.createSession(user_id, {});
    const sessionCookie = auth.createSessionCookie(session.id);
    console.log(sessionCookie.name);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );
    console.log("cookies", cookies());
  },

  invalidateSession: async (session_id: string) => {
    await auth.invalidateSession(session_id);
  },

  getUserSession: cache(async () => {
    const sessionId = cookies().get(auth.sessionCookieName)?.value ?? null;
    if (!sessionId) return null;
    const { user, session } = await auth.validateSession(sessionId);
    try {
      if (session && session.fresh) {
        const sessionCookie = auth.createSessionCookie(session.id);
        cookies().set(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes,
        );
      }
      if (!session) {
        const sessionCookie = auth.createBlankSessionCookie();
        cookies().set(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes,
        );
      }
    } catch {
      // Next.js throws error when attempting to set cookies when rendering page
    }

    if (!user || !session) {
      console.error("No user or no session found, maybe not logged in");
      return null;
    }

    return { user, session };
  }),
};
