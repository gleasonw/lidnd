"use client";

import {
  useCampaign,
  useHotkey,
  useServerAction,
} from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { createEncounter } from "@/app/[username]/actions";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export function CreateEncounterButton() {
  const [campaign] = useCampaign();
  const [isPending, create] = useServerAction(createEncounter);
  useHotkey("e", () => {
    create({ campaign_id: campaign.id });
  });
  return (
    <Button
      type="submit"
      disabled={isPending}
      onClick={() => create({ campaign_id: campaign.id })}
    >
      Create Encounter
      <Kbd>E</Kbd>
    </Button>
  );
}
