import { useState } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import type { Creature } from "@/server/api/router";
import {
  useAddExistingCreatureAsParticipant,
  useEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { Switch } from "@/components/ui/switch";
import { LidndLabel } from "@/components/ui/LidndLabel";
import { EncounterUtils } from "@/utils/encounters";
import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { SortAsc, SortDesc } from "lucide-react";
import { crLabel } from "@/utils/campaigns";

export function ExistingCreatureAdd() {
  const [search, setSearch] = useState("");
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const [inCampaign, setInCampaign] = useState(true);
  const [inCrBudget, setInCrBudget] = useState<boolean>(true);
  const [sortCr, setSortCr] = useState<"asc" | "desc">("desc");

  const creaturesQuery = api.getUserCreatures.useQuery(
    {
      name: search,
      campaignId: inCampaign ? campaign.id : undefined,
      maxCR: inCrBudget
        ? EncounterUtils.remainingCr(encounter, campaign)
        : undefined,
      crSortOrder: sortCr,
    },
    {
      placeholderData: (prev) => prev,
    }
  );

  const addMonster = useAddExistingCreatureAsParticipant({
    id: encounter.id,
    campaign_id: campaign.id,
  });

  const creaturesToDisplay = creaturesQuery.data ?? [];

  function handleAdd(creature: Creature) {
    if (addMonster.isPending) return;

    addMonster
      .mutateAsync({
        encounter_id: encounter.id,
        creature_id: creature.id,
        hp: creature.max_hp ?? 1,
      })
      .then(() => {
        setSearch("");
      })
      .catch(console.error);
  }
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search adversaries`}
          className="h-9 text-sm"
        />
        <ButtonWithTooltip
          text={"Sort by CR"}
          variant="ghost"
          size="icon"
          className="ml-2 h-9 w-9 p-0"
          onClick={() => {
            setSortCr(sortCr === "asc" ? "desc" : "asc");
          }}
        >
          {sortCr === "desc" ? <SortDesc /> : <SortAsc />}
        </ButtonWithTooltip>
      </div>

      <LidndLabel label="In campaign" className="flex gap-2 items-center">
        <Switch
          className="order-first"
          id={`quick-add-${encounter.id}`}
          checked={inCampaign}
          onCheckedChange={setInCampaign}
          aria-label={inCampaign ? "In campaign" : "Any"}
        />
      </LidndLabel>
      <LidndLabel label="In CR budget" className="flex gap-2 items-center">
        <Switch
          className="order-first"
          id={`quick-add-${encounter.id}`}
          checked={inCrBudget}
          onCheckedChange={setInCrBudget}
          aria-label={inCrBudget ? "In CR budget" : "Any"}
        />
      </LidndLabel>

      <div className="space-y-1 overflow-y-auto">
        {creaturesToDisplay.map((creature) => (
          <button
            key={creature.id}
            type="button"
            onClick={() => handleAdd(creature)}
            className="flex w-full items-center justify-between rounded-sm border border-transparent px-3 py-2 text-left text-sm transition hover:border-border hover:bg-muted/60"
            disabled={addMonster.isPending}
          >
            <div className="flex flex-col truncate">
              <span className="truncate font-medium">{creature.name}</span>
              <div className="flex gap-2">
                <span className="text-xs text-muted-foreground flex gap-2">
                  <span>{crLabel(campaign)}</span>
                  <span>{creature.challenge_rating ?? "?"}</span>
                </span>
                <span className="text-xs text-muted-foreground flex gap-2">
                  {creature.type === "minion_monster" ? "Minion" : null}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {addMonster.error ? (
        <p className="text-xs font-medium text-destructive">
          {addMonster.error.message}
        </p>
      ) : null}
    </div>
  );
}
