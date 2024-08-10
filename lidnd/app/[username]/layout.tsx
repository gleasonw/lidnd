import ClientOverlays from "@/app/[username]/overlays";
import { TRPCReactProvider } from "@/trpc/react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AppLink,
  CloseSidebarButton,
  OpenSidebarButton,
  SmallSideNav,
  User,
} from "@/app/[username]/side-nav";
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
import { ButtonWithTooltip } from "@/components/ui/tip";
import Link from "next/link";
import { revalidatePath } from "next/cache";

// user must be logged in to view anything in this sub route.
export default async function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await LidndAuth.getUser();

  if (!user) {
    const headersList = headers();
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

  // TODO: these sidebar updates should be made optimistic. but it's a rare mutation and I'm lazy.
  // I'm preferring to server-render to avoid layout shift while loading in the sidebar...
  // maybe I could somehow override the css with a data attribute?
  return (
    <TRPCReactProvider cookies={cookies().toString()}>
      <UserProvider value={user}>
        <UIStoreProvider>
          <ClientOverlays>
            <div className="flex flex-col max-h-screen">
              <SmallSideNav>
                <SideNavBody />
              </SmallSideNav>
              <div className="flex flex-grow overflow-hidden relative">
                {userSettings.collapse_sidebar ? (
                  <nav className="flex-col gap-10 h-screen hidden w-12 xl:flex items-center flex-shrink-0">
                    <AppLinkTooltip
                      route={appRoutes.dashboard(user)}
                      text="Home"
                    >
                      <Home />
                    </AppLinkTooltip>
                    <CreateCampaignButton
                      trigger={
                        <Button variant="ghost">
                          <Plus />
                        </Button>
                      }
                    />
                    <AppLinkTooltip
                      route={appRoutes.creatures(user)}
                      text="Creatures"
                    >
                      <Rabbit />
                    </AppLinkTooltip>
                    <AppLinkTooltip
                      route={appRoutes.settings(user)}
                      text="Settings"
                    >
                      <Settings />
                    </AppLinkTooltip>
                    <User />
                    <form
                      action={async () => {
                        "use server";
                        await db
                          .update(settings)
                          .set({
                            collapse_sidebar: false,
                          })
                          .where(eq(settings.user_id, user.id));
                        revalidatePath(appRoutes.dashboard(user));
                      }}
                      className="mt-auto"
                    >
                      <OpenSidebarButton />
                    </form>
                  </nav>
                ) : (
                  <nav className="flex-col gap-10 h-screen hidden w-64 xl:flex items-center flex-shrink-0">
                    <SideNavBody />
                    <form
                      action={async () => {
                        "use server";
                        await db
                          .update(settings)
                          .set({
                            collapse_sidebar: true,
                          })
                          .where(eq(settings.user_id, user.id));
                        revalidatePath(appRoutes.dashboard(user));
                      }}
                      className="mt-auto"
                    >
                      <CloseSidebarButton />
                    </form>
                  </nav>
                )}
                <div className="w-full bg-white min-w-0 overflow-auto h-screen">
                  {children}
                </div>
              </div>
            </div>
          </ClientOverlays>
        </UIStoreProvider>
      </UserProvider>
    </TRPCReactProvider>
  );
}

function AppLinkTooltip({
  children,
  route,
  text,
}: {
  children: React.ReactNode;
  route: string;
  text: string;
}) {
  return (
    <Link href={route}>
      <ButtonWithTooltip variant="ghost" text={text}>
        {children}
      </ButtonWithTooltip>
    </Link>
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
