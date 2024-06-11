import ClientOverlays from "@/app/dashboard/overlays";
import "@/app/globals.css";
import { getPageSession } from "@/server/api/utils";
import { TRPCReactProvider } from "@/trpc/react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SideNav, SmallSideNav } from "@/app/dashboard/side-nav";
import { UIStoreProvider } from "@/app/dashboard/UIStore";
import { CreateCampaignButton } from "@/app/dashboard/create-campaign-button";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LidndAuth } from "@/app/authentication";

// user must be logged in to view anything in this sub route.
export default async function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPageSession();

  if (!session) {
    const headersList = headers();
    const previousLocation = headersList.get("x-pathname");

    if (previousLocation) {
      return redirect(`/login?redirect=${previousLocation}`);
    }

    return redirect(`/login`);
  }

  const createCampaign = (
    <CreateCampaignButton
      trigger={
        <Button variant="ghost" className="flex gap-2 w-full">
          <Plus />
          New campaign
        </Button>
      }
    />
  );

  return (
    <TRPCReactProvider cookies={cookies().toString()}>
      <UIStoreProvider>
        <ClientOverlays>
          <SmallSideNav
            userAvatar={<UserAvatar />}
            createCampaignButton={createCampaign}
          />
          <div className="flex">
            <SideNav
              userAvatar={<UserAvatar />}
              createCampaignButton={createCampaign}
            />
            <div className="px-5 pt-2 pb-10 w-full max-h-screen overflow-auto">
              {children}
            </div>
          </div>
        </ClientOverlays>
      </UIStoreProvider>
    </TRPCReactProvider>
  );
}

async function UserAvatar() {
  const result = await LidndAuth.getUserSession();
  if (!result) {
    return redirect("/login");
  }
  const user = result.user;

  return (
    <img
      alt={user?.username ?? "User"}
      src={`https://cdn.discordapp.com/avatars/${user?.discord_id}/${user?.avatar}.png`}
      width={40}
      height={40}
      className={"rounded-full"}
    />
  );
}
