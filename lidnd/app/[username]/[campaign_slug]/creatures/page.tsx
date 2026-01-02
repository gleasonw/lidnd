import { ServerCampaign } from "@/server/sdk/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { db } from "@/server/db";
import { campaignCreatureLink, creatures } from "@/server/db/schema";
import { and, eq, exists, ilike } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { RemoveCreatureFromCampaign } from "@/app/[username]/[campaign_slug]/RemoveCreatureFromCampaignButton";
import { CreatureUpdateForm } from "@/creatures/creatures-page";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { CampaignCreatureSearch } from "@/app/[username]/[campaign_slug]/CampaignCreatureSearch";

export default async function CampaignCreaturesPage(props: {
  params: Promise<{
    campaign_slug: string;
    username: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return redirect(appRoutes.login);
  }

  const campaignData = await ServerCampaign.campaignFromSlug(
    UserUtils.context(user),
    params.campaign_slug
  );

  if (!campaignData) {
    console.error("No campaign found, layout should have redirected");
    return <div>No campaign found... this is a bug</div>;
  }

  const search =
    typeof searchParams?.search === "string" ? searchParams.search : undefined;

  const onlyCampaignFilter = exists(
    db
      .select()
      .from(campaignCreatureLink)
      .where(
        and(
          eq(campaignCreatureLink.campaign_id, campaignData.id),
          eq(campaignCreatureLink.creature_id, creatures.id)
        )
      )
  );

  const filters = [eq(creatures.user_id, user.id), onlyCampaignFilter];
  if (search) {
    filters.push(ilike(creatures.name, `%${search}%`));
  }

  const creaturesToShow = await db
    .select()
    .from(creatures)
    .where(and(...filters));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-6">
      <section className="flex flex-col gap-4">
        <CampaignCreatureSearch defaultValue={search} />
        {creaturesToShow.length === 0 ? (
          <p className="text-muted-foreground">
            {search ? "No creatures match your search" : "No creatures yet"}
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3">
            {creaturesToShow.map((c) => (
              <div key={c.id} className="flex gap-2">
                <LidndDialog
                  title="Update Creature"
                  trigger={
                    <Button variant="ghost">
                      <CreatureIcon creature={c} size="medium" />
                      <span>{c.name}</span>
                    </Button>
                  }
                  content={<CreatureUpdateForm creature={c} />}
                />
                <RemoveCreatureFromCampaign
                  creature={c}
                  campaign={campaignData}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
