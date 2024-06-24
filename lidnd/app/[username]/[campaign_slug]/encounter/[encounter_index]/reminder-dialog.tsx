"use client";

import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useBattleUIStore } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/battle-ui";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import { api } from "@/trpc/react";
import { observer } from "mobx-react-lite";

export const ReminderDialog = observer(function ReminderDialog() {
  const {
    shouldShowReminders,
    hideReminders,
    remindersToDisplay: reminders,
  } = useBattleUIStore();

  const id = useEncounterId();

  const { data: encounter } = api.encounterById.useQuery(id);

  return (
    <Dialog
      open={shouldShowReminders}
      onOpenChange={(isOpen) => !isOpen && hideReminders()}
    >
      <DialogContent className="max-w-3xl h-[500px] overflow-auto flex flex-col gap-5">
        <DialogHeader className="text-xl">
          Reminders for Round {encounter?.current_round}
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
