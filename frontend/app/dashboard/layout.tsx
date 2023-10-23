import Providers from "@/app/dashboard/providers";
import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

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

        <Providers>
          <div className="md:m-5">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
