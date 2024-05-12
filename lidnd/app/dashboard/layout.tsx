import ClientOverlays from "@/app/dashboard/overlays";
import "@/app/globals.css";
import { getPageSession } from "@/server/api/utils";
import { TRPCReactProvider } from "@/trpc/react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SideNav } from "@/app/dashboard/side-nav";

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

  return (
    <TRPCReactProvider cookies={cookies().toString()}>
      <ClientOverlays>
        <div className="flex">
          <SideNav userAvatar={<UserAvatar />} />
          <div className="sm:px-5 pt-2 pb-10 grow">{children}</div>
        </div>
      </ClientOverlays>
    </TRPCReactProvider>
  );
}

async function UserAvatar() {
  const session = await getPageSession();
  if (!session) {
    return redirect("/login");
  }
  const user = session.user;

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
