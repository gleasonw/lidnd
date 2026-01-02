import { ServerCampaign } from "@/server/sdk/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { db } from "@/server/db";
import { encounters } from "@/server/db/schema";
import { and, eq, ilike } from "drizzle-orm";
import { CreateEncounterButton } from "@/app/[username]/[campaign_slug]/CreateEncounterButton";
import { EncounterCard } from "@/app/[username]/[campaign_slug]/EncounterCard";
import { EncountersSearchBar } from "@/app/[username]/[campaign_slug]/EncountersSearchBar";
import { EncounterUtils } from "@/utils/encounters";
import { SessionButton } from "@/app/[username]/[campaign_slug]/SessionButton";

export default async function CampaignPage(props: {
  params: Promise<{
    campaign_slug: string;
    user_id: string;
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

  const encounterSearch = searchParams?.encounterSearch as string | undefined;

  const encountersInCampaign = await db.query.encounters.findMany({
    where: and(
      eq(encounters.campaign_id, campaignData.id),
      eq(encounters.user_id, user.id),
      encounterSearch
        ? ilike(encounters.name, `%${encounterSearch}%`)
        : undefined
    ),
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

  const encountersGroupedByTag =
    EncounterUtils.groupEncountersByTag(encountersInCampaign);

  const tagsWithEncounters = Object.entries(encountersGroupedByTag).map(
    ([tagId, tagGroup]) => {
      const firstTag = tagGroup[0]?.tag;
      return {
        ...firstTag,
        encounters: tagGroup.map((et) => et.encounter),
      };
    }
  );

  const encountersWithNoTag =
    encountersInCampaign?.filter((e) => e.tags.length === 0) || [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-6">
      <section className="flex flex-col gap-6">
        <div className="flex w-full justify-center">
          <div className="flex gap-3 flex-col max-w-2xl w-full">
            <SessionButton campaignId={campaignData.id} />
            <CreateEncounterButton />
          </div>
        </div>

        <EncountersSearchBar search={encounterSearch} />
        <div className="flex flex-col gap-8">
          {tagsWithEncounters.length === 0 ? (
            <p className="text-muted-foreground">
              No tagged encounters. Add tags to your encounters to group them.
            </p>
          ) : (
            tagsWithEncounters.map((tagGroup) => (
              <div key={tagGroup.id} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold border-b pb-2">
                  {tagGroup.name}
                </h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tagGroup.encounters.map((encounter) => (
                    <EncounterCard key={encounter.id} encounter={encounter} />
                  ))}
                </div>
              </div>
            ))
          )}
          {encountersWithNoTag.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg border-b pb-2">No tag</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {encountersWithNoTag.map((encounter) => (
                  <EncounterCard key={encounter.id} encounter={encounter} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
