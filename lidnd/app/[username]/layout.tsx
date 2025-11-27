import ClientOverlays from "@/app/[username]/overlays";
import { TRPCReactProvider } from "@/trpc/react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LidndAuth } from "@/app/authentication";
import { UserProvider } from "@/app/[username]/user-provider";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { eq } from "drizzle-orm";

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

  const [userSettings] = await Promise.all([
    db.query.settings.findFirst({
      where: eq(settings.user_id, user.id),
    }),
  ]);

  if (!userSettings) {
    console.error("No user settings found");
    return redirect("/login");
  }

  console.log(`app/[username] layout rendered in ${performance.now() - now}ms`);

  return (
    <TRPCReactProvider cookies={(await cookies()).toString()}>
      <UserProvider value={user}>
        <ClientOverlays>
          <div className="flex flex-col max-h-full overflow-hidden h-full ">
            {children}
          </div>
        </ClientOverlays>
      </UserProvider>
    </TRPCReactProvider>
  );
}
