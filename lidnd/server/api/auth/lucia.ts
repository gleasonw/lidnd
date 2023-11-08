import { lucia } from "lucia";
import { nextjs_future } from "lucia/middleware";
import { postgres as postgresAdapter } from "@lucia-auth/adapter-postgresql";
import { queryClient } from "@/server/api/db";
import { discord } from "@lucia-auth/oauth/providers";
import { rerouteUrl } from "@/app/login/page";

export const auth = lucia({
  adapter: postgresAdapter(queryClient, {
    user: "users",
    key: "user_key",
    session: "user_session",
  }),
  env: process.env.NODE_ENV === "development" ? "DEV" : "PROD",
  middleware: nextjs_future(),

  sessionCookie: {
    expires: false,
  },

  getUserAttributes: (user) => {
    return {
      username: user.username,
    };
  },
});

export const discordAuth = discord(auth, {
  clientId: process.env.CLIENT_ID ?? "",
  clientSecret: process.env.CLIENT_SECRET ?? "",
  redirectUri: `${rerouteUrl}/api/discord`,
});

export type Auth = typeof auth;
