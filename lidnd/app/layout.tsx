import "@/app/globals.css";
import { TRPCReactProvider } from "@/trpc/react";

import type { Metadata } from "next";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "LiDnD",
  description: "A free and open-source initiative tracker for D&D 5e.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider cookies={cookies().toString()}>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}
