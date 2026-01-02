import { ServerCampaign } from "@/server/sdk/campaigns";
import { appRoutes } from "@/app/routes";
import { redirect } from "next/navigation";
import { LidndAuth, UserUtils } from "@/app/authentication";
import { db } from "@/server/db";
import {
  campaignCreatureLink,
  creatures,
  encounters,
} from "@/server/db/schema";
import { and, eq, exists, ilike } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { RemoveCreatureFromCampaign } from "@/app/[username]/[campaign_slug]/RemoveCreatureFromCampaignButton";
import { CreatureUpdateForm } from "@/creatures/creatures-page";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { CampaignCreatureSearch } from "@/app/[username]/[campaign_slug]/CampaignCreatureSearch";
import { CreateEncounterButton } from "@/app/[username]/[campaign_slug]/CreateEncounterButton";
import { EncounterCard } from "@/app/[username]/[campaign_slug]/EncounterCard";
import { EncountersSearchBar } from "@/app/[username]/[campaign_slug]/EncountersSearchBar";
import { EncounterUtils } from "@/utils/encounters";
import { PartyPage } from "@/app/[username]/[campaign_slug]/partyPage";
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-6 border-b pb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl tracking-tight">{campaignData.name}</h1>
            {campaignData.description ? (
              <p className="text-muted-foreground max-w-2xl text-sm">
                {campaignData.description}
              </p>
            ) : null}
          </div>
          <div className="flex ml-auto">
            <Link
              href={appRoutes.sessionsForCampaign({
                campaign: campaignData,
                user,
              })}
            >
              <Button
                variant={
                  !searchParams?.tab || searchParams?.tab === "sessions"
                    ? "outline"
                    : "ghost"
                }
              >
                Encounters
              </Button>
            </Link>
            <Link
              href={appRoutes.creaturesForCampaign({
                campaign: campaignData,
                user,
              })}
            >
              <Button
                variant={
                  searchParams?.tab === "creatures" ? "outline" : "ghost"
                }
              >
                Creatures
              </Button>
            </Link>
            <Link
              href={appRoutes.party({
                campaign: campaignData,
                user,
              })}
            >
              <Button
                variant={searchParams?.tab === "party" ? "outline" : "ghost"}
              >
                Party
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {searchParams?.tab === "creatures" ? (
        <section>
          <CampaignCreatures
            campaign={campaignData}
            search={
              typeof searchParams?.search === "string"
                ? searchParams.search
                : undefined
            }
          />
        </section>
      ) : searchParams?.tab === "party" ? (
        <section>
          <CampaignParty />
        </section>
      ) : (
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
      )}
    </div>
  );
}

async function CampaignCreatures({
  campaign,
  search,
}: {
  campaign: { id: string };
  search?: string;
}) {
  const user = await LidndAuth.getUser();

  if (!user) {
    console.error("No session found, layout should have redirected");
    return redirect(appRoutes.login);
  }
  const onlyCampaignFilter = exists(
    db
      .select()
      .from(campaignCreatureLink)
      .where(
        and(
          eq(campaignCreatureLink.campaign_id, campaign.id),
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
    <div className="flex flex-col gap-4">
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
              <RemoveCreatureFromCampaign creature={c} campaign={campaign} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignParty() {
  return <PartyPage />;
}
