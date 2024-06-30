import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { LidndAuth } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { EncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { db } from "@/server/api/db";
import { isEncounterPathParams } from "@/server/utils";
import _ from "lodash";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

export default async function EncounterLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string; campaign_slug: string };
}) {
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return <div>User not logged in</div>;
  }

  if (!isEncounterPathParams(params)) {
    console.error("params object has missing fields");
    return;
  }

  const campaign = await db.query.campaigns.findFirst({
    where: (campaigns, { eq, and }) =>
      and(
        eq(campaigns.slug, params.campaign_slug),
        eq(campaigns.user_id, user.id),
      ),
    with: {
      encounters: true,
    },
  });

  if (!campaign) {
    console.error("No campaign found -- bug!");
    return <div>No campaign found... bad url or bug</div>;
  }

  console.log(campaign, { params });

  const encounter = campaign?.encounters.find(
    (e) => e.index_in_campaign === Number(params.encounter_index),
  );

  if (!encounter) {
    console.error("No encounter found -- bug!");
    return <div>No encounter found... bad url or bug</div>;
  }

  const currentIndex = encounter.index_in_campaign;

  const priorEncounter = _.maxBy(
    campaign.encounters.filter((e) => e.index_in_campaign < currentIndex),
    (e) => e.index_in_campaign,
  );

  const nextEncounter = _.minBy(
    campaign.encounters.filter((e) => e.index_in_campaign > currentIndex),
    (e) => e.index_in_campaign,
  );

  return (
    <CampaignId value={campaign.id}>
      <EncounterId value={encounter.id}>
        <section className="flex flex-col">
          <div className="flex items-center flex-wrap">
            <Breadcrumb className="h-[var(--encounter-breadcrumb-height)]">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={appRoutes.campaign(campaign, user)}>
                    {campaign.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbLink
                  href={appRoutes.encounter(campaign, encounter, user)}
                >
                  <BreadcrumbItem>{encounter.name}</BreadcrumbItem>
                </BreadcrumbLink>
              </BreadcrumbList>
            </Breadcrumb>
            <span>
              {currentIndex} / {campaign.encounters.length}
            </span>
            <span>
              {priorEncounter ? (
                <Link
                  href={appRoutes.encounter(campaign, priorEncounter, user)}
                >
                  <Button variant="ghost" className="p-0 h-6 w-6" size="icon">
                    <ChevronUp />
                  </Button>
                </Link>
              ) : (
                <Button variant="ghost" disabled>
                  <ChevronUp />
                </Button>
              )}
              {nextEncounter ? (
                <Link href={appRoutes.encounter(campaign, nextEncounter, user)}>
                  <Button variant="ghost" className="p-0 h-6 w-6" size="icon">
                    <ChevronDown />
                  </Button>
                </Link>
              ) : (
                <Button variant="ghost" disabled>
                  <ChevronDown />
                </Button>
              )}
            </span>
          </div>
          {children}
        </section>
      </EncounterId>
    </CampaignId>
  );
}
