import { toastError } from "@/lib/errors";
import { StartSessionDialog } from "@/sessions/StartSessionDialog";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";

/**
 * Starts a run of a plan and opens it. Without an active session, asks the GM
 * to start one first. Render `dialog` somewhere in the tree.
 */
export function useStartRun(campaign: Doc<"campaigns">, hasSession: boolean) {
  const start = useMutation(api.runs.start);
  const navigate = useNavigate();
  const [pendingPlan, setPendingPlan] = useState<Id<"plans"> | null>(null);

  const run = (planId: Id<"plans">) =>
    start({ planId })
      .then((runId) => navigate(`/campaigns/${campaign._id}/runs/${runId}`))
      .catch(toastError);

  const startRun = (planId: Id<"plans">) => {
    if (hasSession) void run(planId);
    else setPendingPlan(planId);
  };

  const dialog = (
    <StartSessionDialog
      campaign={campaign}
      open={pendingPlan !== null}
      onOpenChange={(open) => !open && setPendingPlan(null)}
      description="Every run belongs to a session. Start one, then the encounter begins."
      onStarted={() => {
        if (pendingPlan) void run(pendingPlan);
        setPendingPlan(null);
      }}
    />
  );
  return { startRun, dialog };
}
