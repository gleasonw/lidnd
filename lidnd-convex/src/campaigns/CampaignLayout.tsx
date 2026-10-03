import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineText } from "@/components/InlineText";
import { Stepper } from "@/components/Stepper";
import { toastError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { SessionBar } from "@/sessions/SessionBar";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { SYSTEMS } from "../../convex/lib/systems";

/** Loads the campaign from the URL; renders "not found" or `children`. */
export function CampaignGate({
  children,
}: {
  children: (campaign: Doc<"campaigns">) => React.ReactNode;
}) {
  const { campaignId = "" } = useParams();
  const campaign = useQuery(api.campaigns.get, { campaignId });
  if (campaign === undefined) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (campaign === null) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <p className="mb-2">This campaign doesn't exist or isn't yours.</p>
        <Link to="/" className="text-sm underline underline-offset-4">
          Back to campaigns
        </Link>
      </div>
    );
  }
  return <>{children(campaign)}</>;
}

export function CampaignLayout() {
  return (
    <CampaignGate>
      {(campaign) => <Campaign campaign={campaign} />}
    </CampaignGate>
  );
}

const tabs = [
  { to: "", label: "Encounters", end: true },
  { to: "party", label: "Party" },
  { to: "adversaries", label: "Adversaries" },
  { to: "sessions", label: "Sessions" },
];

function Campaign({ campaign }: { campaign: Doc<"campaigns"> }) {
  const update = useMutation(api.campaigns.update).withOptimisticUpdate(
    (store, { campaignId, name, partyLevel }) => {
      const current = store.getQuery(api.campaigns.get, { campaignId });
      if (!current) return;
      store.setQuery(
        api.campaigns.get,
        { campaignId },
        {
          ...current,
          ...(name !== undefined && { name }),
          ...(partyLevel !== undefined && { partyLevel }),
        },
      );
    },
  );
  const unfinished = useQuery(api.runs.listUnfinished, {
    campaignId: campaign._id,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const campaignId = campaign._id;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-3">
          <InlineText
            value={campaign.name}
            label="Campaign name"
            className="text-xl font-semibold"
            onSave={(name) =>
              void update({ campaignId, name }).catch(toastError)
            }
          />
          <span className="text-sm text-muted-foreground">
            {SYSTEMS[campaign.system].label}
          </span>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="party-level" className="text-muted-foreground">
              Party level
            </label>
            <Stepper
              id="party-level"
              size="sm"
              value={campaign.partyLevel}
              max={SYSTEMS[campaign.system].maxLevel}
              onChange={(partyLevel) =>
                void update({ campaignId, partyLevel }).catch(toastError)
              }
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <SessionBar campaign={campaign} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Campaign actions"
                >
                  <DotsHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  Delete campaign…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav
          aria-label="Campaign sections"
          className="mx-auto flex w-full max-w-6xl gap-1 px-4 pt-2"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {unfinished && unfinished.length > 0 && (
        <div className="border-b bg-accent/50">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-2 text-sm">
            <span className="font-medium">In progress:</span>
            {unfinished.map((run) => (
              <Link
                key={run._id}
                to={`/campaigns/${campaignId}/runs/${run._id}`}
                className="underline underline-offset-4"
              >
                Resume {run.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-6xl px-4 py-4">
        <Outlet context={campaign} />
      </div>
      <DeleteCampaignDialog
        campaign={campaign}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

function DeleteCampaignDialog({
  campaign,
  open,
  onOpenChange,
}: {
  campaign: Doc<"campaigns">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const remove = useMutation(api.campaigns.remove);
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete “{campaign.name}”?</DialogTitle>
          <DialogDescription>
            Its party, encounters, sessions, and campaign-only adversaries are
            deleted too. This can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              remove({ campaignId: campaign._id })
                .then(() => navigate("/"))
                .catch((error) => {
                  onOpenChange(false);
                  toastError(error);
                });
            }}
          >
            Delete campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
