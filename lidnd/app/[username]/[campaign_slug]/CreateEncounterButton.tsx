"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { createEncounter } from "@/app/[username]/actions";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";

export function CreateEncounterButton() {
  const [campaign] = useCampaign();
  const [isPending, startTransition] = useTransition();
  return (
    <form
      className="w-full flex items-center justify-center"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => createEncounter({ campaign_id: campaign.id }));
      }}
    >
      <Button className="w-56" type="submit" disabled={isPending}>
        Create Encounter
      </Button>
    </form>
  );
}
