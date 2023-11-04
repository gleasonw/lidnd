import Providers from "@/app/dashboard/providers";
import "@/app/globals.css";
import { TRPCReactProvider } from "@/trpc/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LiDnD",
  description: "A free and open-source initiative tracker for D&D 5e.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Include shared UI here e.g. a header or sidebar */}

        <TRPCReactProvider cookies={cookies().toString()}>
          <Providers>
            <div className="md:px-5 pt-2 pb-10">{children}</div>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
