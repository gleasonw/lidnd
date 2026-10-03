import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/Stepper";
import { toastError } from "@/lib/errors";
import { formatDuration, useNow } from "@/lib/time";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { StartSessionDialog } from "./StartSessionDialog";

/** The campaign's active session: elapsed time, victories, end. */
export function SessionBar({ campaign }: { campaign: Doc<"campaigns"> }) {
  const session = useQuery(api.sessions.active, { campaignId: campaign._id });
  const [startOpen, setStartOpen] = useState(false);
  if (session === undefined) return null;
  if (session === null) {
    return (
      <>
        <span className="text-sm text-muted-foreground">
          No session running
        </span>
        <Button size="sm" variant="outline" onClick={() => setStartOpen(true)}>
          Start session
        </Button>
        <StartSessionDialog
          campaign={campaign}
          open={startOpen}
          onOpenChange={setStartOpen}
        />
      </>
    );
  }
  return <ActiveSession campaign={campaign} session={session} />;
}

function ActiveSession({
  campaign,
  session,
}: {
  campaign: Doc<"campaigns">;
  session: Doc<"sessions">;
}) {
  const now = useNow(30_000);
  const update = useMutation(api.sessions.update).withOptimisticUpdate(
    (store, { victories }) => {
      const current = store.getQuery(api.sessions.active, {
        campaignId: campaign._id,
      });
      if (current && victories !== undefined) {
        store.setQuery(
          api.sessions.active,
          { campaignId: campaign._id },
          { ...current, victories },
        );
      }
    },
  );
  const end = useMutation(api.sessions.end);
  return (
    <div className="flex items-center gap-3 rounded-md border px-2 py-1 text-sm">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-green-600" aria-hidden />
        <Link
          to={`/campaigns/${campaign._id}/sessions/${session._id}`}
          className="font-medium hover:underline"
        >
          {session.name}
        </Link>
        <span className="text-muted-foreground">
          · {formatDuration(now - session.startedAt)}
        </span>
      </span>
      {campaign.system === "drawSteel" && (
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Victories</span>
          <Stepper
            size="sm"
            value={session.victories}
            min={0}
            max={99}
            label="victories"
            onChange={(victories) =>
              void update({ sessionId: session._id, victories }).catch(
                toastError,
              )
            }
          />
        </span>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-7"
        onClick={() => void end({ sessionId: session._id }).catch(toastError)}
      >
        End session
      </Button>
    </div>
  );
}
