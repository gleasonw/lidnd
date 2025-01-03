"use client";

import React from "react";
import Link from "next/link";
import { LogOut, PanelLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { logOut } from "./actions";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/app/[username]/UIStore";
import { observer } from "mobx-react-lite";
import styles from "./side-nav.module.css";

export interface SideNavProps {
  children?: React.ReactNode;
}

export const SmallSideNav = observer(function SmallSideNav(
  props: SideNavProps,
) {
  const { isSideNavOpen, toggleSideNav, closeSideNav } = useUIStore();
  const navRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        navRef.current &&
        !navRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        closeSideNav();
      }
    }
    window.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [closeSideNav]);

  return (
    <div className="flex xl:hidden relative">
      <Button
        variant="ghost"
        onClick={toggleSideNav}
        className="z-20"
        ref={buttonRef}
      >
        <PanelLeft />
      </Button>
      <div
        className={`${styles.mobileNavContainer} ${isSideNavOpen ? styles.open : ""} shadow-md z-10`}
        ref={navRef}
      >
        {props.children}
      </div>
    </div>
  );
});

export interface AppLinkProps {
  children?: React.ReactNode;
  route: string;
}

export function AppLink(props: AppLinkProps) {
  const { route, children } = props;
  return (
    <Link key={route} href={route} prefetch={true}>
      <Button variant="ghost" className="items-center gap-3 flex p-3 w-full">
        {children}
      </Button>
    </Link>
  );
}

export interface UserSettingsProps {
  userAvatar: React.ReactNode;
}

export function User() {
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

export function OpenSidebarButton() {
  return (
    <ButtonWithTooltip text="Open sidebar" variant="ghost">
      <PanelLeftOpen />
    </ButtonWithTooltip>
  );
}

export function CloseSidebarButton() {
  return (
    <ButtonWithTooltip text="Close sidebar" variant="ghost">
      <PanelLeftClose />
    </ButtonWithTooltip>
  );
}
