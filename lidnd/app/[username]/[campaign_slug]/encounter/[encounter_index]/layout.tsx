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
import {
  EncounterTopBar,
  InitiativeTracker,
} from "@/encounters/[encounter_index]/battle-bar";
import { EncounterUI } from "@/encounters/[encounter_index]/EncounterUiStore";
import { db } from "@/server/api/db";
import { isEncounterPathParams } from "@/server/utils";
import _ from "lodash";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import * as R from "remeda";
import { EncounterPrepBar } from "@/encounters/[encounter_index]/prep-bar";
import { EncounterSidebar } from "@/encounters/[encounter_index]/encounter-sidebar";

export default async function EncounterLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ id: string; campaign_slug: string }>;
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

  const start = performance.now();
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

  const encounter = campaign?.encounters.find(
    (e) => e.index_in_campaign === Number(params.encounter_index),
  );

  const indexForDisplay = R.sort(
    campaign?.encounters,
    (a, b) => a.index_in_campaign - b.index_in_campaign,
  ).findIndex((e) => e.id === encounter?.id);

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

  console.log(
    `rendered encounter index layout in ${performance.now() - start}`,
  );

  return (
    <EncounterUI>
      <CampaignId value={campaign.id}>
        <EncounterId value={encounter.id}>
          <section className="flex h-full overflow-hidden">
            <section className="flex flex-col flex-grow min-w-0">
              <div className="grid grid-cols-3 relative">
                <InitiativeTracker />
                <Breadcrumb>
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
                <EncounterTopBar />
                <div className="ml-auto flex gap-2">
                  <span>
                    {indexForDisplay + 1} / {campaign.encounters.length}
                  </span>
                  <span>
                    {priorEncounter ? (
                      <Link
                        href={appRoutes.encounter(
                          campaign,
                          priorEncounter,
                          user,
                        )}
                      >
                        <Button
                          variant="ghost"
                          className="p-0 h-6 w-6"
                          size="icon"
                        >
                          <ChevronUp />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" disabled className="h-6 w-6 p-0">
                        <ChevronUp />
                      </Button>
                    )}
                    {nextEncounter ? (
                      <Link
                        href={appRoutes.encounter(
                          campaign,
                          nextEncounter,
                          user,
                        )}
                      >
                        <Button
                          variant="ghost"
                          className="p-0 h-6 w-6"
                          size="icon"
                        >
                          <ChevronDown />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" disabled className="h-6 w-6 p-0">
                        <ChevronDown />
                      </Button>
                    )}
                  </span>
                </div>
              </div>
              <EncounterPrepBar />
              <section className="flex flex-col overflow-y-auto">
                {children}
              </section>
            </section>
            <EncounterSidebar />
          </section>
        </EncounterId>
      </CampaignId>
    </EncounterUI>
  );
}
