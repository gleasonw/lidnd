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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function ReminderInput() {
  const [encounter] = useEncounter();
  const { encounterById } = api.useUtils();
  const [alertAfterRound, setAlertAfterRound] = React.useState<string>("1");
  const [reminder, setReminder] = React.useState<string>("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { mutate: removeReminder } = api.removeEncounterReminder.useMutation({
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
        if (!reminder.trim()) return;
        addReminder({
          encounter_id: encounter.id,
          alert_after_round: coerceInt(alertAfterRound),
          reminder: reminder,
        });
        setAlertAfterRound("1");
        setReminder("");
        inputRef.current?.focus();
      }}
      className="flex bg-white flex-col rounded-lg"
    >
      <div className="flex gap-2 items-center">
        <Clock className="text-muted-foreground shrink-0" size={20} />
        <LidndTextInput
          ref={inputRef}
          placeholder="Reinforcements arrive..."
          value={reminder}
          onChange={(e) => setReminder(e.target.value)}
          className="flex-1 min-w-0"
        />
        <Select value={alertAfterRound} onValueChange={setAlertAfterRound}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All rounds</SelectItem>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map((n) => (
              <SelectItem key={n} value={n.toString()}>
                Round {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="icon"
          variant="outline"
          disabled={!reminder.trim()}
        >
          <Plus />
        </Button>
      </div>
      {encounter?.reminders && encounter.reminders.length > 0 && (
        <div>
          {encounter.reminders
            .slice()
            .sort((a, b) => a.alert_after_round - b.alert_after_round)
            .map((reminder) => (
              <div
                className="flex gap-3 items-center px-3 py-2 hover:bg-gray-50 group"
                key={reminder.id}
              >
                <Badge variant="secondary" className="shrink-0">
                  {reminder.alert_after_round === 0
                    ? "All"
                    : `R${reminder.alert_after_round}`}
                </Badge>
                <span className="flex-1 text-sm">{reminder.reminder}</span>
                <ButtonWithTooltip
                  text="Remove reminder"
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    removeReminder({
                      reminder_id: reminder.id,
                      encounter_id: encounter.id,
                    });
                  }}
                >
                  <X size={16} />
                </ButtonWithTooltip>
              </div>
            ))}
        </div>
      )}
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
