import ClientOverlays from "@/app/[username]/overlays";
import { TRPCReactProvider } from "@/trpc/react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AppLink,
  LargeSideNav,
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

  return (
    <TRPCReactProvider cookies={cookies().toString()}>
      <UserProvider value={user}>
        <UIStoreProvider>
          <ClientOverlays>
            <div className="flex flex-col max-h-screen">
              <SmallSideNav>
                <SideNavBody />
              </SmallSideNav>
              <div className="flex pt-2 flex-grow overflow-hidden relative">
                <LargeSideNav>
                  <SideNavBody />
                </LargeSideNav>
                <div className="w-full shadow-sm border p-[var(--main-content-padding)] pt-2 bg-white min-w-0 overflow-auto">
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

export async function SideNavBody() {
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return <div>User not logged in</div>;
  }

  return (
    <>
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
    </>
  );
}
