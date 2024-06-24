import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { EncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { encounterFromPathParams } from "@/server/utils";

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

  const [campaign, encounter] = await encounterFromPathParams(
    UserUtils.context(user),
    params,
  );

  return (
    <CampaignId value={campaign.id}>
      <EncounterId value={encounter.id}>
        <section className="flex flex-col">
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
          {children}
        </section>
      </EncounterId>
    </CampaignId>
  );
}
