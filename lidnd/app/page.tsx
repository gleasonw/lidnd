import { redirect } from "next/navigation";

import type { Metadata } from "next";
import { appRoutes } from "@/app/routes";
import { LidndAuth } from "@/app/authentication";
import { ServerCampaign } from "@/server/sdk/campaigns";

export const metadata: Metadata = {
  title: "LiDnD",
  description: "A free and open-source initiative tracker for D&D 5e.",
};

export default async function Home() {
  const user = await LidndAuth.getUser();

  if (!user) {
    return redirect(appRoutes.login);
  }

  const lastCampaign = await ServerCampaign.lastVisitedCampaign({ user });

  if (lastCampaign) {
    return redirect(appRoutes.campaign({ campaign: lastCampaign, user }));
  }

  redirect(appRoutes.dashboard(user));
}
