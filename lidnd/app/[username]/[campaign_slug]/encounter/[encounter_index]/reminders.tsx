import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { useEncounter } from "@/encounters/[encounter_index]/hooks";
import { api } from "@/trpc/react";
import { EncounterUtils } from "@/utils/encounters";
import { Clock, Plus, X } from "lucide-react";
import { observer } from "mobx-react-lite";
import React from "react";

export function ReminderInput() {
  const [encounter] = useEncounter();
  const { encounterById } = api.useUtils();
  const [alertAfterRound, setAlertAfterRound] = React.useState<string>("");
  const [reminder, setReminder] = React.useState<string>("");
  const { mutate: removeReminder } = api.removeEncounterReminder.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(encounter.id);
    },
    onMutate: async ({ reminder_id }) => {
      await encounterById.cancel(encounter.id);
      const previousEncounter = encounterById.getData(encounter.id);
      encounterById.setData(encounter.id, (old) => {
        if (!old) {
          return;
        }
        return EncounterUtils.removeReminder(reminder_id, old);
      });
      return previousEncounter;
    },
  });
  const { mutate: addReminder } = api.addEncounterReminder.useMutation({
    onSettled: async () => {
      return await encounterById.invalidate(encounter.id);
    },
    onMutate: async (newReminder) => {
      await encounterById.cancel(encounter.id);
      const previousEncounter = encounterById.getData(encounter.id);
      encounterById.setData(encounter.id, (old) => {
        if (!old) {
          return;
        }
        return EncounterUtils.addReminder(
          {
            id: Math.random().toString(),
            reminder: newReminder.reminder ?? "",
            ...newReminder,
          },
          old
        );
      });
      return previousEncounter;
    },
  });

  if (!encounter) {
    return null;
  }

  function coerceInt(value: string | undefined) {
    if (!value) {
      return 0;
    }
    const int = parseInt(value);
    if (isNaN(int)) {
      return 0;
    }
    return int;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addReminder({
          encounter_id: encounter.id,
          alert_after_round: coerceInt(alertAfterRound),
          reminder: reminder,
        });
        setAlertAfterRound("");
        setReminder("");
      }}
      className="flex flex-col gap-3 rounded-lg"
    >
      <section className="flex gap-3 p-3 items-end flex-wrap">
        <label>
          <div className="flex gap-2 items-center opacity-60">
            <Clock />
            Remind
          </div>

          <LidndTextInput
            variant="ghost"
            placeholder="Reinforcements..."
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          />
        </label>

        <label>
          <div className="flex gap-2 items-center opacity-60">
            on round (0 = all)
          </div>
          <LidndTextInput
            type="number"
            variant="ghost"
            placeholder="1"
            className="w-24"
            value={alertAfterRound}
            onChange={(e) =>
              setAlertAfterRound(coerceInt(e.target.value).toString())
            }
          />
        </label>

        <Button type="submit" variant="outline">
          Add
          <Plus />
        </Button>
      </section>
      {encounter?.reminders
        .slice()
        .sort((a, b) => a.alert_after_round - b.alert_after_round)
        .map((reminder) => (
          <div
            className="flex gap-1 shadow-md border items-center p-3"
            key={reminder.id}
          >
            <span className="flex-grow">{reminder.reminder}</span>
            <span>after round {reminder.alert_after_round}</span>
            <ButtonWithTooltip
              text="Remove reminder"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                removeReminder({
                  reminder_id: reminder.id,
                  encounter_id: encounter.id,
                });
              }}
            >
              <X />
            </ButtonWithTooltip>
          </div>
        ))}
    </form>
  );
}

export const Reminders = observer(function Reminders() {
  const [encounter] = useEncounter();
  const { setReminderViewed, userDismissedReminder } = useEncounterUIStore();
  const toDisplay = EncounterUtils.postRoundReminders(encounter);
  if (!toDisplay || toDisplay.length === 0) {
    return null;
  }

  return (
    <Dialog
      open={!userDismissedReminder}
      onOpenChange={(isOpen) => {
        console.log(isOpen);
        !isOpen && setReminderViewed();
      }}
    >
      <DialogOverlay />
      <DialogContent
        className="max-w-3xl h-[500px] overflow-auto flex flex-col gap-5"
        aria-describedby={undefined}
      >
        <DialogHeader className="text-xl">
          <DialogTitle>
            Reminders for Round {encounter?.current_round}
          </DialogTitle>
        </DialogHeader>
        {toDisplay.map(({ reminder, id }) => (
          <div key={id} className="flex flex-col gap-3">
            {reminder}
          </div>
        ))}
      </DialogContent>
      <DialogOverlay />
    </Dialog>
  );
});
