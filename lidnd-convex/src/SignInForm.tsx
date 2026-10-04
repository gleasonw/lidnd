import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/errors";
import { useAuthActions } from "@convex-dev/auth/react";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const devSignInEnabled = useQuery(
    api.users.devSignInEnabled,
    import.meta.env.DEV ? {} : "skip",
  );
  const [signingIn, setSigningIn] = useState(false);

  async function signInAsDeveloper() {
    setSigningIn(true);
    try {
      await signIn("anonymous");
    } catch (error) {
      toastError(error);
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="container my-auto">
      <div className="mx-auto flex max-w-[384px] flex-col gap-4 pb-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          Sign in to Runsheet
        </h2>
        <Button
          variant="outline"
          type="button"
          onClick={() => void signIn("discord").catch(toastError)}
        >
          <DiscordLogoIcon className="mr-2 h-4 w-4" /> Continue with Discord
        </Button>
        {devSignInEnabled && (
          <Button
            variant="ghost"
            type="button"
            disabled={signingIn}
            onClick={() => void signInAsDeveloper()}
          >
            Continue as local developer
          </Button>
        )}
      </div>
    </div>
  );
}
