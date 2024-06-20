import { LidndAuth } from "@/app/authentication";
import { routeToCampaign } from "@/app/routes";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ServerCampaign } from "@/server/campaigns";
import { ServerEncounter } from "@/server/encounters";

export default async function EncounterLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string; campaign: string };
}) {
  const user = await LidndAuth.getUser();
  if (!user) {
    console.error("No session found, layout should have redirected");
    return <div>User not logged in</div>;
  }
  const [campaign, encounter] = await Promise.all([
    ServerCampaign.campaignByIdThrows(params.campaign, user.id),
    ServerEncounter.encounterByIdThrows(user.id, params.id),
  ]);

  return (
    <section className="flex flex-col gap-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={routeToCampaign(campaign.id)}>
              {campaign.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>{encounter.name}</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {children}
    </section>
  );
}
