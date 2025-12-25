"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { useUser } from "@/app/[username]/user-provider";
import { appRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { CreateEncounterForm } from "@/encounters/campaign-encounters-overview";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

export function CreateEncounterButton({
  gameSessionId,
}: {
  gameSessionId: string;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [campaign] = useCampaign();
  const user = useUser();
  const router = useRouter();
  return (
    <LidndDialog
      isOpen={dialogOpen}
      onClose={() => setDialogOpen(false)}
      title="Create New Encounter"
      trigger={
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Encounter
        </Button>
      }
      content={
        <CreateEncounterForm
          afterCreate={(e) => {
            setDialogOpen(false);
            router.push(appRoutes.encounter({ campaign, encounter: e, user }));
          }}
          gameSessionId={gameSessionId}
          buttonExtra={
            <Button
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                setDialogOpen(false);
              }}
            >
              Cancel
            </Button>
          }
        />
      }
    />
  );
}
