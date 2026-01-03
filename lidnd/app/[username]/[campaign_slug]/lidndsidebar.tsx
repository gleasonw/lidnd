import { EncounterImage } from "@/app/[username]/[campaign_slug]/EncounterImage";
import type { Campaign } from "@/app/[username]/types";
import { LidndAuth } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { db } from "@/server/db";
import { encounters } from "@/server/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { AngryIcon, CalendarDays, HomeIcon, Users } from "lucide-react";
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

  const encountersInCampaign = await db.query.encounters.findMany({
    where: and(
      eq(encounters.campaign_id, campaign.id),
      eq(encounters.user_id, user.id)
    ),
    orderBy: (e) => asc(e.name),
    with: {
      tags: {
        with: {
          tag: true,
        },
      },
      participants: {
        with: {
          creature: true,
        },
      },
    },
  });

  return (
    <Sidebar collapsible="icon" className="bg-white">
      <SidebarHeader className="p-1 text-lg pb-4">
        {topSlot}
        <SidebarMenuButton asChild tooltip="Campaign Home">
          <Link href={appRoutes.campaign({ campaign, user })}>
            <HomeIcon />
            {campaign.name}
          </Link>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent className="p-1">
        <SidebarMenu className="gap-2">
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
        <SidebarGroup>
          <SidebarGroupLabel>Encounters</SidebarGroupLabel>
          <SidebarGroupContent className="p-2">
            <SidebarMenu>
              {encountersInCampaign.map((encounter) => (
                <SidebarMenuItem key={encounter.id}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={appRoutes.encounter({
                        campaign,
                        encounter,
                        user,
                      })}
                    >
                      <EncounterImage encounter={encounter} />
                      {encounter.name || "<No Name>"}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
    </Sidebar>
  );
}
