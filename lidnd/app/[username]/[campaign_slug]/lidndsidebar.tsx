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
        <Link href={appRoutes.campaign({ campaign, user })}>
          <SidebarMenuButton tooltip={`${campaign.name} Home`}>
            <HomeIcon />
            {campaign.name}
          </SidebarMenuButton>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-1">
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <Link href={appRoutes.sessions({ campaign, user })}>
              <SidebarMenuButton tooltip="Sessions">
                <CalendarDays />
                Sessions
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href={appRoutes.creaturesForCampaign({ campaign, user })}>
              <SidebarMenuButton tooltip="Creatures">
                <AngryIcon />
                <span>Creatures</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href={appRoutes.party({ campaign, user })}>
              <SidebarMenuButton tooltip="Party">
                <Users />
                <span>Party</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <TotalVictoriesCount />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href={appRoutes.dashboard(user)}>
              <SidebarMenuButton tooltip="All Campaigns">
                <LayoutGrid />
                <span>All Campaigns</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
