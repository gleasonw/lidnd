import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { toastError } from "@/lib/errors";
import { formatDate } from "@/lib/time";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";

export function DeleteCreatureDialog({
  creature,
  onOpenChange,
}: {
  creature: Doc<"creatures"> | null;
  onOpenChange: (open: boolean) => void;
}) {
  const usage = useQuery(
    api.creatures.getUsage,
    creature ? { creatureId: creature._id } : "skip",
  );
  const remove = useMutation(api.creatures.remove);
  const inRuns = usage !== undefined && usage.runs.length > 0;

  return (
    <AlertDialog open={creature !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {inRuns
              ? `${creature?.name} can't be deleted`
              : `Delete ${creature?.name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {usage === undefined ? (
                "Checking where it's used…"
              ) : inRuns ? (
                <>
                  <p>It's part of the history of these runs:</p>
                  <ul className="mt-2 list-disc pl-5">
                    {usage.runs.map((run) => (
                      <li key={run._id}>
                        {run.name} · {formatDate(run.startedAt)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : usage.planCount > 0 ? (
                `It will be removed from ${usage.planCount} encounter${usage.planCount === 1 ? "" : "s"}. This can't be undone.`
              ) : (
                "This can't be undone."
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{inRuns ? "Close" : "Cancel"}</AlertDialogCancel>
          {!inRuns && (
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={usage === undefined}
              onClick={() => {
                if (creature) {
                  remove({ creatureId: creature._id }).catch(toastError);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
