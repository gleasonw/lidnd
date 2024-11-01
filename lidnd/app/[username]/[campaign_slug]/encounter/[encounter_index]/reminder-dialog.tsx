"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import { api } from "@/trpc/react";
import { observer } from "mobx-react-lite";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";

export const ReminderDialog = observer(function ReminderDialog() {
  const {
    shouldShowReminders,
    hideReminders,
    remindersToDisplay: reminders,
  } = useEncounterUIStore();

  const id = useEncounterId();

  const { data: encounter } = api.encounterById.useQuery(id);

  return (
    <Dialog
      open={shouldShowReminders}
      onOpenChange={(isOpen) => !isOpen && hideReminders()}
    >
      <DialogContent className="max-w-3xl h-[500px] overflow-auto flex flex-col gap-5">
        <DialogHeader className="text-xl">
          <DialogTitle>
            Reminders for Round {encounter?.current_round}
          </DialogTitle>
        </DialogHeader>
        {reminders.map(({ reminder, id }) => (
          <div key={id} className="flex flex-col gap-3">
            {reminder}
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
});
