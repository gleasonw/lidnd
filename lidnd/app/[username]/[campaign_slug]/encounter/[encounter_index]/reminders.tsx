import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEncounter } from "@/encounters/[encounter_index]/hooks";
import { EncounterUtils } from "@/utils/encounters";
import { DialogOverlay } from "@radix-ui/react-dialog";

export function Reminders() {
  const [encounter] = useEncounter();
  const toDisplay = EncounterUtils.postRoundReminders(encounter);
  if (!toDisplay || toDisplay.length === 0) {
    return null;
  }

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-3xl h-[500px] overflow-auto flex flex-col gap-5">
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
}
