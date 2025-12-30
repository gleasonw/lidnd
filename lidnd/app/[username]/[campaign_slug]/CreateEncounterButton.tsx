"use client";

import {
  useCampaign,
  useHotkey,
} from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { createEncounter } from "@/app/[username]/actions";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Plus } from "lucide-react";
import { useTransition } from "react";

export function CreateEncounterButton() {
  const [campaign] = useCampaign();
  const [isPending, startTransition] = useTransition();
  useHotkey("e", () => {
    startTransition(() => createEncounter({ campaign_id: campaign.id }));
  });
  return (
    <form
      className="w-full flex items-center justify-center"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <Button
        className="w-56"
        type="submit"
        disabled={isPending}
        onSubmit={() =>
          startTransition(() => createEncounter({ campaign_id: campaign.id }))
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Encounter
        <Kbd>E</Kbd>
      </Button>
    </form>
  );
}
