import { getAuthUserId } from "@convex-dev/auth/server";
import { env, query } from "./_generated/server";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId !== null ? ctx.db.get("users", userId) : null;
  },
});

export const devSignInEnabled = query({
  args: {},
  handler: async () => env.DEV_SIGN_IN === "true",
});
