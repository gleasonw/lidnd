import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/errors";
import { useAuthActions } from "@convex-dev/auth/react";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const devSignInEnabled = useQuery(api.users.devSignInEnabled);

  return (
    <div className="container my-auto">
      <div className="mx-auto flex max-w-[384px] flex-col gap-4 pb-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          Sign in to LiDnD
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
            onClick={() => void signIn("dev").catch(toastError)}
          >
            Sign in as dev user
          </Button>
        )}
      </div>
    </div>
  );
}
