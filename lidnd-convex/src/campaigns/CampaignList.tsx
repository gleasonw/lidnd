import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import { SYSTEMS } from "../../convex/lib/systems";
import { NewCampaignDialog } from "./NewCampaignDialog";

export function CampaignList() {
  const campaigns = useQuery(api.campaigns.list);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Campaigns</h1>
        {campaigns !== undefined && campaigns.length > 0 && (
          <NewCampaignDialog>
            <Button size="sm">
              <PlusIcon className="mr-1" /> New campaign
            </Button>
          </NewCampaignDialog>
        )}
      </div>
      {campaigns === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
          <p className="text-sm text-muted-foreground">
            No campaigns yet. A campaign holds your party, adversaries,
            encounter plans, and sessions for one game system.
          </p>
          <NewCampaignDialog>
            <Button size="sm">
              <PlusIcon className="mr-1" /> Create your first campaign
            </Button>
          </NewCampaignDialog>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {campaigns.map((campaign) => (
            <li key={campaign._id}>
              <Link
                to={`/campaigns/${campaign._id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="font-medium">{campaign.name}</span>
                <span className="text-sm text-muted-foreground">
                  {SYSTEMS[campaign.system].label} · Level {campaign.partyLevel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
