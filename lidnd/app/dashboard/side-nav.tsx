"use client";

import React from "react";
import Link from "next/link";
import { Home, LogOut, PanelLeft, Rabbit, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { logOut } from "./actions";
import { appRoutes, routeLabels } from "@/app/routes";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/app/dashboard/UIStore";
import { observer } from "mobx-react-lite";
import styles from "./side-nav.module.css";

export interface SideNavProps {
  userAvatar: React.ReactNode;
  createCampaignButton: React.ReactNode;
}

export const SmallSideNav = observer(function SmallSideNav(
  props: SideNavProps,
) {
  const { isSideNavOpen, toggleSideNav } = useUIStore();
  return (
    <div className="flex lg:hidden relative">
      <Button variant="ghost" onClick={toggleSideNav} className="z-20">
        <PanelLeft />
      </Button>
      <div
        className={`${styles.mobileNavContainer} ${isSideNavOpen ? styles.open : ""} shadow-md z-10`}
      >
        <SideNavBody {...props} />
      </div>
    </div>
  );
});

export function SideNav(props: SideNavProps) {
  return (
    <nav className="flex-col gap-10 shadow-md h-screen hidden w-64 lg:flex items-center ">
      <SideNavBody {...props} />
    </nav>
  );
}

export function SideNavBody({
  userAvatar,
  createCampaignButton,
}: SideNavProps) {
  return (
    <>
      <AppLink route="dashboard">
        <Home />
      </AppLink>
      {createCampaignButton}
      <AppLink route="creatures">
        <Rabbit />
      </AppLink>
      <AppLink route="settings">
        <Settings />
      </AppLink>
      <User userAvatar={userAvatar} />
    </>
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
      className={clsx("w-full p-2", {
        "bg-gray-200 font-bold": path === route,
      })}
    >
      <Button variant="ghost" className="items-center gap-3 flex p-3 w-full">
        {children}
        {routeLabels[route]}
      </Button>
    </Link>
  );
}

export interface UserSettingsProps {
  userAvatar: React.ReactNode;
}

export function User(props: UserSettingsProps) {
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
