"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { removeEncounter } from "@/app/[username]/actions";
import { Button } from "@/components/ui/button";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";

export function DeleteEncounterButton({
  encounter,
}: {
  encounter: { id: string };
}) {
  const [campaign] = useCampaign();
  const queryClient = useQueryClient();

  return (
    <LidndDialog
      title="Are you sure you want to permanently delete this encounter?"
      content={
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            queryClient.invalidateQueries();
            await removeEncounter({
              encounterId: encounter.id,
              campaignId: campaign.id,
              redirectToCampaign: true,
            });
          }}
        >
          <Button
            variant="destructive"
            className="w-full flex justify-center"
            type="submit"
          >
            <TrashIcon className="mr-2" />
            Delete
          </Button>
        </form>
      }
      trigger={
        <Button variant="ghost" className="text-gray-400">
          <TrashIcon />
          Delete
        </Button>
      }
    />
  );
}
