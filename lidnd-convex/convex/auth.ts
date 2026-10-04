import Discord from "@auth/core/providers/discord";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";
import { env } from "./_generated/server";

const devSignInEnabled = env.DEV_SIGN_IN === "true";

// Each new sign-in creates an ordinary, separate user. The browser retains
// its session across reloads. Only enable this on development deployments.
const DevSignIn = Anonymous({
  profile: () => ({ name: "Local developer", isAnonymous: true }),
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: devSignInEnabled ? [Discord, DevSignIn] : [Discord],
});
