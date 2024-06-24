import { LidndAuth, UserUtils } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
    <section className="flex flex-col gap-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={appRoutes.campaign(campaign, user)}>
              {campaign.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>{encounter.index_in_campaign}</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {children}
    </section>
  );
}
