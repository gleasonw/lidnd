import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastError } from "@/lib/errors";
import { roundLabel } from "@/lib/time";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { PlanData } from "./types";

export function Reminders({ data }: { data: PlanData }) {
  const add = useMutation(api.plans.addReminder);
  const remove = useMutation(api.plans.removeReminder);
  const [text, setText] = useState("");
  const [round, setRound] = useState("1");
  const every = round === "every";

  return (
    <section
      aria-labelledby="reminders-heading"
      className="flex flex-col gap-2"
    >
      <h3 id="reminders-heading" className="text-sm font-semibold">
        Reminders
      </h3>
      {data.reminders.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {data.reminders.map((r) => (
            <li key={r._id} className="flex items-start gap-2">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">
                {roundLabel(r.round)}
              </span>
              <span className="flex-1">{r.text}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground"
                aria-label={`Delete reminder: ${r.text}`}
                onClick={() =>
                  void remove({ reminderId: r._id }).catch(toastError)
                }
              >
                <Cross2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add({
            planId: data.plan._id,
            text,
            round: every ? 0 : Number.parseInt(round, 10),
          })
            .then(() => setText(""))
            .catch(toastError);
        }}
      >
        <select
          aria-label="When to remind"
          value={round}
          onChange={(e) => setRound(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="every">Every round</option>
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Round {i + 1}
            </option>
          ))}
        </select>
        <Input
          aria-label="Reminder text"
          placeholder="e.g. Reinforcements arrive"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-8"
        />
        <Button
          size="sm"
          variant="outline"
          type="submit"
          disabled={text.trim() === ""}
        >
          Add
        </Button>
      </form>
    </section>
  );
}
