"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { logOut } from "./actions";
import { appRoutes, routeLabels } from "@/app/routes";

export function SideNav({ userAvatar }: { userAvatar: React.ReactNode }) {
  return (
    <nav className="flex-col flex gap-2 transition-all shadow-md h-screen">
      <Link href={appRoutes.dashboard} className={"text-2xl p-5"}>
        LiDnD
      </Link>
      <AppLink route="creatures" />
      <UserSettings userAvatar={userAvatar} />
    </nav>
  );
}

export interface AppLinkProps {
  children?: React.ReactNode;
  route: keyof typeof appRoutes;
}

export function AppLink(props: AppLinkProps) {
  const path = usePathname();
  const { route } = props;
  return (
    <Link
      key={route}
      href={appRoutes[route]}
      className={clsx(
        "flex h-[48px] grow items-center justify-center gap-2 rounded-md p-3 hover:bg-gray-200 md:flex-none md:justify-start md:p-2 md:px-3",
        {
          "bg-gray-200 font-bold": path === route,
        },
      )}
    >
      {routeLabels[route]}
    </Link>
  );
}

export interface UserSettingsProps {
  userAvatar: React.ReactNode;
}

export function UserSettings(props: UserSettingsProps) {
  const { userAvatar } = props;
  const path = usePathname();
  return (
    <form
      className="ml-auto pr-5 flex gap-5 items-center flex-col flex-grow justify-end"
      action={logOut}
    >
      <Link
        href={appRoutes.settings}
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
  );
}
