"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useUser } from "@/app/hooks";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { logOut } from "@/app/dashboard/actions";

export default function Providers({
  children,
  userAvatar,
}: {
  children: React.ReactNode;
  userAvatar: React.ReactNode;
}) {
  const routes = ["/dashboard", "/dashboard/creatures"] as const;

  const routeLabels = {
    "/dashboard": "Encounters",
    "/dashboard/creatures": "Creatures",
  } as const;

  const path = usePathname();

  return (
    <>
      <nav className="border-bottom border flex items-center gap-3 flex-col sm:flex-row sm:gap-5">
        <Link href="/dashboard" className={"text-2xl p-5"}>
          LiDnD
        </Link>
        {routes.map((route) => (
          <Link
            key={route}
            href={route}
            className={clsx(
              "flex h-[48px] grow items-center justify-center gap-2 rounded-md p-3 font-medium hover:bg-gray-200 md:flex-none md:justify-start md:p-2 md:px-3",
              {
                "bg-gray-200 font-bold": path === route,
              }
            )}
          >
            {routeLabels[route]}
          </Link>
        ))}
        <form
          className={"ml-auto pr-5 flex gap-5  items-center"}
          action={logOut}
        >
          <Link href="/dashboard/settings" className="flex gap-5 items-center">
            Settings
          </Link>
          <Suspense
            fallback={
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
            }
          >
            {userAvatar}
          </Suspense>
          <button type="submit">
            <LogOut />
          </button>
        </form>
      </nav>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
