import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/Stepper";
import { toastError } from "@/lib/errors";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";

export function StartSessionDialog({
  campaign,
  open,
  onOpenChange,
  onStarted,
  description,
}: {
  campaign: Doc<"campaigns">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted?: (sessionId: Id<"sessions">) => void;
  description?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Start a session</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {open && (
          <StartSessionForm
            campaign={campaign}
            onStarted={(id) => {
              onOpenChange(false);
              onStarted?.(id);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StartSessionForm({
  campaign,
  onStarted,
}: {
  campaign: Doc<"campaigns">;
  onStarted: (sessionId: Id<"sessions">) => void;
}) {
  const defaults = useQuery(api.sessions.startDefaults, {
    campaignId: campaign._id,
  });
  if (defaults === undefined) return null;
  return <Form campaign={campaign} defaults={defaults} onStarted={onStarted} />;
}

function Form({
  campaign,
  defaults,
  onStarted,
}: {
  campaign: Doc<"campaigns">;
  defaults: { name: string; victories: number };
  onStarted: (sessionId: Id<"sessions">) => void;
}) {
  const start = useMutation(api.sessions.start);
  const [name, setName] = useState(defaults.name);
  const [victories, setVictories] = useState(defaults.victories);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setPending(true);
        start({ campaignId: campaign._id, name, victories })
          .then(onStarted)
          .catch((error) => {
            toastError(error);
            setPending(false);
          });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="session-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
      </div>
      {campaign.system === "drawSteel" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="session-victories" className="text-sm font-medium">
            Victories
          </label>
          <Stepper
            id="session-victories"
            value={victories}
            min={0}
            max={99}
            label="victories"
            onChange={setVictories}
          />
          <p className="text-xs text-muted-foreground">
            Carried over from the previous session.
          </p>
        </div>
      )}
      <DialogFooter>
        <Button type="submit" disabled={pending || name.trim() === ""}>
          Start session
        </Button>
      </DialogFooter>
    </form>
  );
}
