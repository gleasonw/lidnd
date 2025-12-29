"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { EncounterCard } from "@/app/[username]/[campaign_slug]/EncounterCard";
import { EncountersSearchBar } from "@/app/[username]/[campaign_slug]/EncountersSearchBar";
import { GroupByTagToggle } from "@/app/[username]/[campaign_slug]/GroupByTagToggle";
import { api } from "@/trpc/react";
import { useSearchParams } from "next/navigation";
import * as R from "remeda";

export function Encounters() {
  const searchParams = useSearchParams();
  const [campaign] = useCampaign();
  const encounterSearch = searchParams.get("encounterSearch") || undefined;
  const { data: encounters } = api.getEncounters.useQuery({
    campaignId: campaign?.id || "",
    matchName: encounterSearch,
  });

  const groupByTag = searchParams.get("groupByTag") === "true";
  const encountersGroupedByTag = groupByTag
    ? R.pipe(
        encounters ?? [],
        R.flatMap((e) => e.tags.map((et) => ({ tag: et.tag, encounter: e }))),
        R.groupBy((et) => et.tag.id)
      )
    : [];

  const tagsWithEncounters = Object.entries(encountersGroupedByTag).map(
    ([tagId, tagGroup]) => {
      const firstTag = tagGroup[0].tag;
      return {
        ...firstTag,
        encounters: tagGroup.map((et) => et.encounter),
      };
    }
  );

  const encountersWithNoTag =
    encounters?.filter((e) => e.tags.length === 0) || [];

  return (
    <>
      <EncountersSearchBar search={encounterSearch} />
      <GroupByTagToggle />
      {groupByTag ? (
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
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {encounters?.map((encounter) => (
            <EncounterCard key={encounter.id} encounter={encounter} />
          ))}
        </div>
      )}
    </>
  );
}
