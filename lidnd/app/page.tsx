import { redirect } from "next/navigation";

import type { Metadata } from "next";
import { appRoutes } from "@/app/routes";
import { LidndAuth } from "@/app/authentication";

export const metadata: Metadata = {
  title: "LiDnD",
  description: "A free and open-source initiative tracker for D&D 5e.",
};

export default async function Home() {
  const user = await LidndAuth.getUser();

  if (!user) {
    return redirect(appRoutes.login);
  }

  redirect(appRoutes.dashboard(user));
}
