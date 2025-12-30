"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { createEncounter } from "@/app/[username]/actions";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";

export function CreateEncounterButton() {
  const [campaign] = useCampaign();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  return (
    <form
      className="w-full flex items-center justify-center"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await createEncounter({ campaign_id: campaign.id });
          queryClient.invalidateQueries();
        });
      }}
    >
      <Button className="w-56" type="submit" disabled={isPending}>
        Create Encounter
      </Button>
    </form>
  );
}
