import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toastError } from "@/lib/errors";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { RunParticipant } from "./types";

export function EffectPopover({
  participant,
  withSaveDc,
}: {
  participant: RunParticipant;
  withSaveDc: boolean;
}) {
  const add = useMutation(api.runs.addEffect);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [saveDc, setSaveDc] = useState("");

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setName("");
          setDuration("");
          setSaveDc("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-full border border-dashed px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          + Effect
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const dc = saveDc.trim() === "" ? undefined : Number(saveDc);
            setOpen(false);
            add({
              participantId: participant._id,
              name,
              duration,
              saveDc: withSaveDc ? dc : undefined,
            }).catch(toastError);
          }}
        >
          <p className="text-sm font-medium">Effect on {participant.name}</p>
          <Input
            autoFocus
            aria-label="Effect name"
            placeholder="Name, e.g. Slowed"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8"
          />
          <Input
            aria-label="Duration note"
            placeholder="Duration, e.g. save ends, EoT"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="h-8"
          />
          {withSaveDc && (
            <Input
              aria-label="Save DC"
              placeholder="Save DC (optional)"
              type="number"
              value={saveDc}
              onChange={(e) => setSaveDc(e.target.value)}
              className="h-8"
            />
          )}
          <Button size="sm" type="submit" disabled={name.trim() === ""}>
            Add effect
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
