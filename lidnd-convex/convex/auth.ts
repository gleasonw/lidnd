import Discord from "@auth/core/providers/discord";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import {
  convexAuth,
  createAccount,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { env } from "./_generated/server";

const devSignInEnabled = env.DEV_SIGN_IN === "true";

// Signs in as one shared "Dev GM" user so the app can be exercised locally
// without Discord. Only registered when DEV_SIGN_IN is "true".
const DevSignIn = ConvexCredentials({
  id: "dev",
  authorize: async (_params, ctx) => {
    const account = { provider: "dev", account: { id: "dev-gm" } };
    try {
      const { user } = await retrieveAccount(ctx, account);
      return { userId: user._id };
    } catch {
      const { user } = await createAccount(ctx, {
        ...account,
        profile: { name: "Dev GM" },
      });
      return { userId: user._id };
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: devSignInEnabled ? [Discord, DevSignIn] : [Discord],
});
