import { redirect } from "next/navigation";
import { getPageSession } from "@/server/api/utils";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LiDnD",
  description: "A free and open-source initiative tracker for D&D 5e.",
};

export default async function Home() {
  const session = await getPageSession();
  if (!session) {
    return redirect("/login");
  }
  redirect("/encounters");
}
