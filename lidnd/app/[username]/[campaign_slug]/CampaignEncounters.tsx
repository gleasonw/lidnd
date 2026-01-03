"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { EncounterCard } from "@/app/[username]/[campaign_slug]/EncounterCard";
import { EncountersSearchBar } from "@/app/[username]/[campaign_slug]/EncountersSearchBar";
import { api } from "@/trpc/react";
import { EncounterUtils } from "@/utils/encounters";
import { useSearchParams } from "next/navigation";
import type { EncountersInCampaign } from "@/server/sdk/encounters";

export function CampaignEncounters({
  encountersInCampaign,
}: {
  encountersInCampaign: EncountersInCampaign;
}) {
  const [campaign] = useCampaign();
  const searchParams = useSearchParams();
  const encounterSearch = searchParams.get("encounterSearch") || undefined;
  const { data: encounters } = api.encountersInCampaign.useQuery(
    {
      campaign: { id: campaign.id },
      search: encounterSearch,
    },
    { placeholderData: encountersInCampaign }
  );

  if (!encounters) {
    return <div>Loading encounters...</div>;
  }

  const encountersGroupedByTag =
    EncounterUtils.groupEncountersByTag(encounters);

  const tagsWithEncounters = Object.entries(encountersGroupedByTag).map(
    ([_, tagGroup]) => {
      const firstTag = tagGroup[0]?.tag;
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
    </>
  );
}
