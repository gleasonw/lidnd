import clsx from "clsx";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/app/globals.css";
import { GlobalUI } from "@/app/UIStore";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LiDnD",
  description: "A free and open-source initiative tracker for D&D 5e.",
};

const isDev = process.env.NODE_ENV === "development";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {isDev && (
          <script
            src="https://unpkg.com/react-scan/dist/auto.global.js"
            async
          />
        )}
      </head>
      <body className={clsx(inter.className)}>
        <GlobalUI>
          <div className="h-screen max-h-full flex flex-col">{children}</div>
        </GlobalUI>
      </body>
    </html>
  );
}
