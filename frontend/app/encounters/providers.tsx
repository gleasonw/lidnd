"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import Link from "next/link";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());
  const routes = ["encounters", "creatures"] as const;

  return (
    <QueryClientProvider client={queryClient}>
      <nav className="border-bottom border flex items-center gap-10">
        <Link href="/" className={"text-2xl p-5"}>
          LiDnD
        </Link>
        {routes.map((route) => (
          <Link
            key={route}
            href={`/${route}`}
            className={
              "p-2 text-center rounded transition-all hover:bg-gray-200"
            }
          >
            {route === "encounters" ? "Encounters" : "Creatures"}
          </Link>
        ))}
      </nav>
      {children}
    </QueryClientProvider>
  );
}
