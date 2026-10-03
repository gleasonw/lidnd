import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/SegmentedControl";
import { toastError } from "@/lib/errors";
import { useMutation } from "convex/react";
import { ReactNode, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { GameSystem, SYSTEMS } from "../../convex/lib/systems";
import { Stepper } from "@/components/Stepper";

export function NewCampaignDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
        </DialogHeader>
        {/* Remount on open so the form starts fresh each time. */}
        {open && <NewCampaignForm />}
      </DialogContent>
    </Dialog>
  );
}

function NewCampaignForm() {
  const create = useMutation(api.campaigns.create);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [system, setSystem] = useState<GameSystem>("drawSteel");
  const [partyLevel, setPartyLevel] = useState(1);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        create({ name, system, partyLevel })
          .then((campaignId) => void navigate(`/campaigns/${campaignId}`))
          .catch((error) => {
            toastError(error);
            setPending(false);
          });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="campaign-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="campaign-name"
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span id="campaign-system" className="text-sm font-medium">
          Game system
        </span>
        <SegmentedControl
          name="system"
          aria-labelledby="campaign-system"
          value={system}
          options={(Object.keys(SYSTEMS) as GameSystem[]).map((key) => ({
            value: key,
            label: SYSTEMS[key].label,
          }))}
          onChange={(next) => {
            setSystem(next);
            setPartyLevel((level) => Math.min(level, SYSTEMS[next].maxLevel));
          }}
        />
        <p className="text-xs text-muted-foreground">
          Can't be changed after the campaign is created.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="campaign-level" className="text-sm font-medium">
          Party level
        </label>
        <Stepper
          id="campaign-level"
          value={partyLevel}
          max={SYSTEMS[system].maxLevel}
          onChange={setPartyLevel}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || name.trim() === ""}>
          Create campaign
        </Button>
      </DialogFooter>
    </form>
  );
}
