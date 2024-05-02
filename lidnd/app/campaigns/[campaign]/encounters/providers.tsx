"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { LogOut, Menu, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { logOut } from "@/app/campaigns/actions";
import { SpellSearcher } from "@/app/campaigns/[campaign]/encounters/[id]/run/battle-ui";
import { BasePopover } from "@/app/campaigns/[campaign]/encounters/base-popover";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/app/routes";

export default function Providers({
  children,
  userAvatar,
}: {
  children: React.ReactNode;
  userAvatar: React.ReactNode;
}) {
  const routes = ["/campaigns", "/campaigns/creatures"] as const;

  const routeLabels = {
    "/campaigns": "Campaigns",
    "/campaigns/creatures": "Creatures",
  } as const;

  const path = usePathname();

  const router = useRouter();

  useEffect(() => {
    window.addEventListener("focus", router.refresh);

    return () => {
      window.removeEventListener("focus", () => {});
    };
  }, []);

  return (
    <>
      <SpellSearcher />
      <div className="flex gap-5 absolute top-0 left-1 z-10">
        <BasePopover
          trigger={
            <Button variant="ghost">
              <Menu className="bg-white" />
            </Button>
          }
        >
          <nav>
            <Link href={appRoutes.campaigns} className={"text-2xl p-5"}>
              LiDnD
            </Link>
            {routes.map((route) => (
              <Link
                key={route}
                href={route}
                className={clsx(
                  "flex h-[48px] grow items-center justify-center gap-2 rounded-md p-3 hover:bg-gray-200 md:flex-none md:justify-start md:p-2 md:px-3",
                  {
                    "bg-gray-200 font-bold": path === route,
                  },
                )}
              >
                {routeLabels[route]}
              </Link>
            ))}
            <form
              className={"ml-auto pr-5 flex gap-5 items-center"}
              action={logOut}
            >
              <Link
                href="/encounters/settings"
                className={clsx(
                  "flex h-[48px] grow items-center justify-center gap-4 rounded-md p-3 hover:bg-gray-200 md:flex-none md:justify-start md:p-2 md:px-3",
                  {
                    "bg-gray-200 font-bold": path === "/encounters/settings",
                  },
                )}
              >
                Settings
                <Suspense
                  fallback={
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                  }
                >
                  {userAvatar}
                </Suspense>
              </Link>
              <button type="submit">
                <LogOut />
              </button>
            </form>
          </nav>
        </BasePopover>
      </div>

      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
