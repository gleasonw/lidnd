import ClientOverlays from "@/app/[username]/overlays";
import "@/app/globals.css";
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
import { Home, Rabbit, Settings } from "lucide-react";
import { LidndAuth } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import { UserProvider } from "@/app/[username]/user-provider";

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
            <SmallSideNav>
              <SideNavBody />
            </SmallSideNav>
            <div className="flex pt-2">
              <LargeSideNav>
                <SideNavBody />
              </LargeSideNav>
              <div className="w-full max-h-screen overflow-auto shadow-sm border p-[var(--main-content-padding)] pt-2">
                {children}
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
      </AppLink>
      <CreateCampaignButton />
      <AppLink route={appRoutes.creatures(user)}>
        <Rabbit />
      </AppLink>
      <AppLink route={appRoutes.settings(user)}>
        <Settings />
      </AppLink>
      <User />
    </>
  );
}
