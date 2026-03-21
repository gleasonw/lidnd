"use client";

import { useState } from "react";
import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { EncounterCard } from "@/app/[username]/[campaign_slug]/EncounterCard";
import { EncountersSearchBar } from "@/app/[username]/[campaign_slug]/EncountersSearchBar";
import { api } from "@/trpc/react";
import { useSearchParams } from "next/navigation";
import type { EncountersInCampaign } from "@/server/sdk/encounters";
import { EncounterTagFilter } from "@/app/[username]/[campaign_slug]/TagSelect";
import { CreateEncounterButton } from "@/app/[username]/[campaign_slug]/CreateEncounterButton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { GameSession } from "@/server/db/schema";

//TODO: use the "filtered tag id" in the server prefetch
// add a link to the filtered encounters in the tag label, alongside one to delete the tag

export function CampaignEncounters({
  encountersInCampaign,
  activeSession,
}: {
  encountersInCampaign: EncountersInCampaign;
  activeSession: GameSession | null;
}) {
  const [showFinishedEncounters, setShowFinishedEncounters] = useState(false);
  const [campaign] = useCampaign();
  const searchParams = useSearchParams();
  const encounterSearch = searchParams.get("encounterSearch") || undefined;
  const filteredTagId = searchParams.get("tagId") || undefined;
  const { data: encounters } = api.encountersInCampaign.useQuery(
    {
      campaign: { id: campaign.id },
      search: encounterSearch,
      tagId: filteredTagId,
    },
    { placeholderData: encountersInCampaign }
  );

  if (!encounters) {
    return <div>Loading encounters...</div>;
  }

  // Group encounters by status
  const activeEncounters = encounters.filter(
    (e) => e.started_at && !e.ended_at
  );
  const finishedEncounters = encounters.filter((e) => e.ended_at);
  const otherEncounters = encounters.filter(
    (e) => !e.started_at && !e.ended_at
  );

  return (
    <>
      <div className="flex w-full gap-3 items-center flex-wrap">
        <CreateEncounterButton />
        <EncountersSearchBar search={encounterSearch} />
        <div className="w-52">
          <EncounterTagFilter />
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {activeEncounters.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeEncounters.map((encounter) => (
                <EncounterCard
                  key={encounter.id}
                  encounter={{
                    ...encounter,
                    average_victories: activeSession?.victory_count ?? 0,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {otherEncounters.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {otherEncounters.map((encounter) => (
                <EncounterCard
                  key={encounter.id}
                  encounter={{
                    ...encounter,
                    average_victories: activeSession?.victory_count ?? 0,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {finishedEncounters.length > 0 && (
          <Collapsible
            open={showFinishedEncounters}
            onOpenChange={setShowFinishedEncounters}
            className="flex flex-col gap-4"
          >
            <CollapsibleTrigger className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <span>Finished encounters ({finishedEncounters.length})</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showFinishedEncounters ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {finishedEncounters.map((encounter) => (
                  <EncounterCard
                    key={encounter.id}
                    encounter={{
                      ...encounter,
                      average_victories: activeSession?.victory_count ?? 0,
                    }}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {encounters.length === 0 && (
          <p className="text-muted-foreground">
            No encounters found. Create your first encounter to get started.
          </p>
        )}
      </div>
    </>
  );
}
