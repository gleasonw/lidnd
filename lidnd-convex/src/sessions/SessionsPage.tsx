import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/campaigns/useCampaign";
import { formatDate, formatDuration } from "@/lib/time";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import { StartSessionDialog } from "./StartSessionDialog";

export function SessionsPage() {
  const campaign = useCampaign();
  const sessions = useQuery(api.sessions.list, { campaignId: campaign._id });
  const [startOpen, setStartOpen] = useState(false);
  const hasActive = sessions?.some((s) => s.endedAt === undefined);

  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sessions</h2>
        {sessions && !hasActive && (
          <Button size="sm" onClick={() => setStartOpen(true)}>
            Start session
          </Button>
        )}
      </div>
      {sessions === undefined ? (
        <LoadingState />
      ) : sessions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No sessions yet. Start one when you sit down to play; encounters you
          run are recorded in it.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {sessions.map((s) => (
            <li key={s._id}>
              <Link
                to={s._id}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="font-medium">{s.name}</span>
                {s.endedAt === undefined && (
                  <span className="rounded-full border border-green-600 px-2 text-xs text-green-700 dark:text-green-400">
                    In progress
                  </span>
                )}
                <span className="text-muted-foreground">
                  {formatDate(s.startedAt)}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {s.endedAt !== undefined &&
                    `${formatDuration(s.endedAt - s.startedAt)} · `}
                  {s.runCount} run{s.runCount === 1 ? "" : "s"}
                  {campaign.system === "drawSteel" &&
                    ` · ${s.victories} victories`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <StartSessionDialog
        campaign={campaign}
        open={startOpen}
        onOpenChange={setStartOpen}
      />
    </div>
  );
}
