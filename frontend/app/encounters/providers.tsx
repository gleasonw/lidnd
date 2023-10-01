"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import Link from "next/link";
import { useUser } from "@/app/hooks";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Nav />
      {children}
    </QueryClientProvider>
  );
}

function Nav() {
  const { data: user } = useUser();
  const routes = ["encounters", "creatures"] as const;

  if (!user) {
    return null;
  } else {
    return (
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
    );
  }
}
