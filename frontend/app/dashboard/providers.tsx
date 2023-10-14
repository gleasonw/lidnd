"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logOut } from "@/app/dashboard/actions";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());
  const routes = ["dashboard", "creatures", "discord"] as const;

  const routeLabels = {
    dashboard: "Encounters",
    creatures: "Creatures",
    discord: "Discord",
  } as const;

  const routePaths = {
    dashboard: "/dashboard",
    creatures: "/dashboard/creatures",
    discord: "/dashboard/discord",
  } as const;

  return (
    <QueryClientProvider client={queryClient}>
      <nav className="border-bottom border flex items-center gap-10">
        <Link href="/dashboard" className={"text-2xl p-5"}>
          LiDnD
        </Link>
        {routes.map((route) => (
          <Link
            key={route}
            href={routePaths[route]}
            className={`p-2 text-center rounded transition-all hover:bg-gray-200 `}
          >
            {routeLabels[route]}
          </Link>
        ))}
        <form action={logOut} className={"ml-auto pr-5"}>
          <button type="submit">
            <LogOut />
          </button>
        </form>
      </nav>
      {children}
    </QueryClientProvider>
  );
}
