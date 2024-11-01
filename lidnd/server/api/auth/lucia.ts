import { Lucia, TimeSpan } from "lucia";
import { session, users } from "@/server/api/db/schema";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "@/server/api/db";
import { Discord } from "arctic";
import { rerouteUrl } from "@/app/[username]/utils";

//@ts-expect-error - some drizzle lucia type conflict?
const lucia = new Lucia(new DrizzlePostgreSQLAdapter(db, session, users), {
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      avatar: attributes.avatar,
      discord_id: attributes.discord_id,
    };
  },
  sessionExpiresIn: new TimeSpan(30, "d"),
  sessionCookie: {
    name: "session",
    expires: false,
  },
});

export const auth = lucia;
export type Auth = typeof lucia;
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseSessionAttributes {}
interface DatabaseUserAttributes {
  username: string;
  avatar: string;
  discord_id: string;
}

export const discordAuth = new Discord(
  process.env.CLIENT_ID ?? "",
  process.env.CLIENT_SECRET ?? "",
  `${rerouteUrl}/api/discord`
);

export interface LidndDiscordAuth {}
