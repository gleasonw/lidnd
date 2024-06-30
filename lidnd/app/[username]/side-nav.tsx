"use client";

import React from "react";
import Link from "next/link";
import { LogOut, PanelLeft } from "lucide-react";
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

  React.useEffect(() => {
    window.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex lg:hidden relative">
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

export function LargeSideNav(props: SideNavProps) {
  return (
    <nav className="flex-col gap-10 h-screen hidden w-64 lg:flex items-center">
      {props.children}
    </nav>
  );
}

export interface AppLinkProps {
  children?: React.ReactNode;
  route: string;
}

export function AppLink(props: AppLinkProps) {
  const { route, children } = props;
  return (
    <Link key={route} href={route}>
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
