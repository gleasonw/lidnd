"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <nav className="">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem className="text-2xl p-5">
              The Init Tracker
            </NavigationMenuItem>
            <NavigationMenuItem className="cursor-pointer">
              <Link href="/encounters" legacyBehavior>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Encounters
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </nav>
      {children}
    </QueryClientProvider>
  );
}
