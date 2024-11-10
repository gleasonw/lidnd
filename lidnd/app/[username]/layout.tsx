import ClientOverlays from "@/app/[username]/overlays";
import { TRPCReactProvider } from "@/trpc/react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { UIStoreProvider } from "@/app/[username]/UIStore";
import { LidndAuth } from "@/app/authentication";
import { UserProvider } from "@/app/[username]/user-provider";
import { db } from "@/server/api/db";
import { settings } from "@/server/api/db/schema";
import { eq } from "drizzle-orm";
import { TopNav } from "@/app/[username]/[campaign_slug]/TopNav";
import { CreateCampaignButton } from "@/app/[username]/create-campaign-button";
import { Plus } from "lucide-react";
import { ButtonWithTooltip } from "@/components/ui/tip";

export default async function CampaignsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ campaign_slug: string }>;
}) {
  const now = performance.now();
  const user = await LidndAuth.getUser();
  console.log(await params);

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

  return (
    <TRPCReactProvider cookies={(await cookies()).toString()}>
      <UserProvider value={user}>
        <UIStoreProvider>
          <ClientOverlays>
            <TopNav
              createCampaignButton={
                <CreateCampaignButton
                  trigger={
                    <ButtonWithTooltip
                      text="Create new campaign"
                      className="flex items-center"
                    >
                      <Plus />
                    </ButtonWithTooltip>
                  }
                />
              }
            />
            <div className="flex flex-col max-h-full overflow-hidden h-full">
              {children}
            </div>
          </ClientOverlays>
        </UIStoreProvider>
      </UserProvider>
    </TRPCReactProvider>
  );
}
