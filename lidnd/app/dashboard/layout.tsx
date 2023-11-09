import Providers from "@/app/dashboard/providers";
import "@/app/globals.css";
import { getPageSession } from "@/server/api/utils";
import { TRPCReactProvider } from "@/trpc/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LiDnD",
  description: "A free and open-source initiative tracker for D&D 5e.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPageSession();
  if (!session) redirect("/login");
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Include shared UI here e.g. a header or sidebar */}

        <TRPCReactProvider cookies={cookies().toString()}>
          <Providers userAvatar={<UserAvatar />}>
            <div className="md:px-5 pt-2 pb-10">{children}</div>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
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
