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
import { AngryIcon, HomeIcon, Users } from "lucide-react";
import Link from "next/link";

export async function LidndSidebar({ campaign }: { campaign: Campaign }) {
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
    <Sidebar collapsible="icon" className="bg-gray-100">
      <SidebarHeader>
        <SidebarMenuButton asChild>
          <Link href={appRoutes.campaign({ campaign, user })}>
            <HomeIcon />
            {campaign.name}
          </Link>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={appRoutes.creaturesForCampaign({ campaign, user })}>
                <AngryIcon />
                Creatures
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={appRoutes.party({ campaign, user })}>
                <Users />
                Party
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarGroup>
          <SidebarGroupLabel>Encounters</SidebarGroupLabel>
          <SidebarGroupContent>
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
