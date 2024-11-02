import ClientOverlays from "@/app/[username]/overlays";
import { TRPCReactProvider } from "@/trpc/react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppLink, SmallSideNav, User } from "@/app/[username]/side-nav";
import { UIStoreProvider } from "@/app/[username]/UIStore";
import { CreateCampaignButton } from "@/app/[username]/create-campaign-button";
import { Home, Plus, Rabbit, Settings } from "lucide-react";
import { LidndAuth } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import { UserProvider } from "@/app/[username]/user-provider";
import { Button } from "@/components/ui/button";
import { db } from "@/server/api/db";
import { settings } from "@/server/api/db/schema";
import { eq } from "drizzle-orm";

// user must be logged in to view anything in this sub route.
export default async function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const now = performance.now();
  const user = await LidndAuth.getUser();

  if (!user) {
    const headersList = await headers();
    const previousLocation = headersList.get("x-pathname");

    if (previousLocation) {
      return redirect(`/login?redirect=${previousLocation}`);
    }

    return redirect(`/login`);
  }

  const userSettings = await db.query.settings.findFirst({
    where: eq(settings.user_id, user.id),
  });

  if (!userSettings) {
    console.error("No user settings found");
    return redirect("/login");
  }

  console.log(`app/[username] layout rendered in ${performance.now() - now}ms`);

  // TODO: these sidebar updates should be made optimistic. but it's a rare mutation and I'm lazy.
  // I'm preferring to server-render to avoid layout shift while loading in the sidebar...
  // maybe I could somehow override the css with a data attribute?
  return (
    <TRPCReactProvider cookies={(await cookies()).toString()}>
      <UserProvider value={user}>
        <UIStoreProvider>
          <ClientOverlays>
            <div className="w-full bg-white min-w-0 overflow-auto">
              {children}
            </div>
          </ClientOverlays>
        </UIStoreProvider>
      </UserProvider>
    </TRPCReactProvider>
  );
}

export async function SideNavBody() {
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return <div>User not logged in</div>;
  }

  return (
    <div className="flex gap-2 items-center flex-col">
      <AppLink route={appRoutes.dashboard(user)}>
        <Home />
        Home
      </AppLink>
      <CreateCampaignButton
        trigger={
          <Button variant="ghost">
            <Plus /> New Campaign
          </Button>
        }
      />
      <AppLink route={appRoutes.creatures(user)}>
        <Rabbit />
        Creatures
      </AppLink>
      <AppLink route={appRoutes.settings(user)}>
        <Settings />
        Settings
      </AppLink>
      <User />
    </div>
  );
}
