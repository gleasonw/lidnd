import { appRoutes } from "@/app/routes";
import { db } from "@/server/db";
import { LidndAuth, type LidndUser } from "@/app/authentication";
import { DEV_USER, isDevLoginEnabled } from "@/server/auth/dev-user";
import type { NextRequest } from "next/server";

// Dev/test-mode-only bypass for the Discord OAuth flow. Logs in as a fixed
// seeded user (see `pnpm dev:seed`) instead of round-tripping through
// Discord. Returns a plain 404 unless isDevLoginEnabled() holds, so the
// route acts as if it doesn't exist anywhere this isn't explicitly opted
// into - see README.md#dev-test-mode.
export const GET = async (request: NextRequest) => {
  if (!isDevLoginEnabled()) {
    return new Response(null, { status: 404 });
  }

  const devUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.discord_id, DEV_USER.discord_id),
  });

  if (!devUser) {
    return new Response(
      "Dev user not found. Run `pnpm dev:seed` first.",
      { status: 500 }
    );
  }

  await LidndAuth.createSession(devUser.id);

  const redirectUrl = request.nextUrl.searchParams.get("redirect");
  const location =
    redirectUrl && redirectUrl !== "undefined"
      ? redirectUrl
      : appRoutes.dashboard(devUser as LidndUser);

  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
    },
  });
};
