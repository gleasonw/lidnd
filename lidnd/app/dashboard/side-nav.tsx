"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { Home, LogOut, Rabbit, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { logOut } from "./actions";
import { appRoutes, routeLabels } from "@/app/routes";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { Button } from "@/components/ui/button";

export function SideNav({ userAvatar }: { userAvatar: React.ReactNode }) {
  return (
    <nav className="flex-col flex gap-10 transition-all shadow-md h-full w-10 lg:w-20 items-center sticky top-0">
      <AppLink route="dashboard">
        <Home />
      </AppLink>
      <AppLink route="creatures">
        <Rabbit />
      </AppLink>
      <AppLink route="settings">
        <Settings />
      </AppLink>
      <User userAvatar={userAvatar} />
    </nav>
  );
}

export interface AppLinkProps {
  children?: React.ReactNode;
  route: keyof typeof appRoutes;
}

export function AppLink(props: AppLinkProps) {
  const path = usePathname();
  const { route, children } = props;
  return (
    <Link
      key={route}
      href={appRoutes[route]}
      className={clsx({
        "bg-gray-200 font-bold": path === route,
      })}
    >
      <ButtonWithTooltip text={routeLabels[route]} variant="ghost">
        {children}
      </ButtonWithTooltip>
    </Link>
  );
}

export interface UserSettingsProps {
  userAvatar: React.ReactNode;
}

export function User(props: UserSettingsProps) {
  const { userAvatar } = props;
  return (
    <form
      className="flex gap-5 items-center flex-col justify-end"
      action={logOut}
    >
      <ButtonWithTooltip text="Logout" type="submit" variant="ghost">
        <LogOut />
      </ButtonWithTooltip>
    </form>
  );
}
