import { TotalVictoriesCount } from "@/app/[username]/[campaign_slug]/TotalVictoriesCount";
import type { Campaign } from "@/app/[username]/types";
import { LidndAuth } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  AngryIcon,
  CalendarDays,
  HomeIcon,
  LayoutGrid,
  Users,
} from "lucide-react";
import Link from "next/link";

export async function LidndSidebar({
  campaign,
  topSlot,
}: {
  campaign: Campaign;
  topSlot?: React.ReactNode;
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    return <div>User not logged in</div>;
  }

  return (
    <Sidebar collapsible="icon" className="bg-white">
      <SidebarHeader className="p-1 text-lg pb-4">
        {topSlot}
        <SidebarMenuButton asChild tooltip={`${campaign.name} Home`}>
          <Link href={appRoutes.campaign({ campaign, user })}>
            <HomeIcon />
            {campaign.name}
          </Link>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent className="p-1">
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <TotalVictoriesCount />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Sessions">
              <Link href={appRoutes.sessions({ campaign, user })}>
                <CalendarDays />
                Sessions
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Creatures">
              <Link href={appRoutes.creaturesForCampaign({ campaign, user })}>
                <AngryIcon />
                <span>Creatures</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Party">
              <Link href={appRoutes.party({ campaign, user })}>
                <Users />
                <span>Party</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="All Campaigns">
              <Link href={appRoutes.dashboard(user)}>
                <LayoutGrid />
                <span>All Campaigns</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
