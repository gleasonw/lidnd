import { LoadingState } from "@/components/LoadingState";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineText } from "@/components/InlineText";
import { MarkdownNotes } from "@/components/Markdown";
import { toastError } from "@/lib/errors";
import { formatDate, formatDuration } from "@/lib/time";
import { DotsHorizontalIcon, PlayIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import { DifficultyPanel } from "./DifficultyPanel";
import { PlanImages } from "./PlanImages";
import { Reminders } from "./Reminders";
import { Roster } from "./Roster";
import { TagEditor } from "./TagEditor";
import { TurnGroups } from "./TurnGroups";
import { PlanData } from "./types";
import { useStartRun } from "./useStartRun";

export function PlanPage() {
  const { planId = "" } = useParams();
  const data = useQuery(api.plans.get, { planId });
  if (data === undefined) {
    return <LoadingState />;
  }
  if (data === null) {
    return (
      <div>
        <p className="mb-2">This encounter doesn't exist.</p>
        <Link to=".." className="text-sm underline underline-offset-4">
          Back to encounters
        </Link>
      </div>
    );
  }
  return <Plan data={data} />;
}

function Plan({ data }: { data: PlanData }) {
  const { plan, campaign } = data;
  const update = useMutation(api.plans.update).withOptimisticUpdate(
    (store, { planId, ...fields }) => {
      const current = store.getQuery(api.plans.get, { planId });
      if (!current) return;
      const defined = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined),
      );
      store.setQuery(
        api.plans.get,
        { planId },
        {
          ...current,
          plan: { ...current.plan, ...defined },
        },
      );
    },
  );
  const { startRun, dialog } = useStartRun(
    campaign,
    data.activeSession !== null,
  );
  const [deleting, setDeleting] = useState(false);
  const unfinished = data.runs.find((r) => r.endedAt === undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          to=".."
          relative="path"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Encounters
        </Link>
        <InlineText
          value={plan.name}
          label="Encounter name"
          className="text-lg font-semibold"
          onSave={(name) =>
            void update({ planId: plan._id, name }).catch(toastError)
          }
        />
        <TagEditor data={data} />
        <div className="ml-auto flex items-center gap-2">
          {unfinished ? (
            <Button asChild>
              <Link to={`/campaigns/${campaign._id}/runs/${unfinished._id}`}>
                <PlayIcon /> Resume run
              </Link>
            </Button>
          ) : (
            <Button onClick={() => startRun(plan._id)}>
              <PlayIcon /> Run encounter
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Encounter actions"
              >
                <DotsHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleting(true)}
              >
                Delete encounter…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <DifficultyPanel
            data={data}
            onTargetChange={(targetDifficulty) =>
              void update({ planId: plan._id, targetDifficulty }).catch(
                toastError,
              )
            }
          />
          <Roster data={data} />
          {campaign.system === "drawSteel" && <TurnGroups data={data} />}
          <Reminders data={data} />
          <RunHistory data={data} />
        </div>
        <div className="flex flex-col gap-5">
          <section aria-labelledby="notes-heading">
            <h3 id="notes-heading" className="mb-1 text-sm font-semibold">
              Notes
            </h3>
            <MarkdownNotes
              value={plan.notes}
              onSave={(notes) =>
                void update({ planId: plan._id, notes }).catch(toastError)
              }
            />
          </section>
          <PlanImages data={data} />
        </div>
      </div>
      {dialog}
      <DeletePlanDialog
        data={data}
        open={deleting}
        onOpenChange={setDeleting}
      />
    </div>
  );
}

function RunHistory({ data }: { data: PlanData }) {
  return (
    <section aria-labelledby="history-heading" className="flex flex-col gap-2">
      <h3 id="history-heading" className="text-sm font-semibold">
        Run history
      </h3>
      {data.runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not run yet.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {data.runs.map((run) => (
            <li key={run._id}>
              <Link
                to={`/campaigns/${data.campaign._id}/runs/${run._id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 hover:bg-accent"
              >
                <span>{formatDate(run.startedAt)}</span>
                <span className="text-muted-foreground">{run.sessionName}</span>
                {run.victoriesAwarded !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    +{run.victoriesAwarded}{" "}
                    {run.victoriesAwarded === 1 ? "Victory" : "Victories"} per
                    hero
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {run.endedAt === undefined
                    ? "In progress"
                    : `${formatDuration(run.endedAt - run.startedAt)} · ${run.round} round${run.round === 1 ? "" : "s"}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeletePlanDialog({
  data,
  open,
  onOpenChange,
}: {
  data: PlanData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const remove = useMutation(api.plans.remove);
  const navigate = useNavigate();
  const hasRuns = data.runs.length > 0;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {hasRuns
              ? `“${data.plan.name}” can't be deleted`
              : `Delete “${data.plan.name}”?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasRuns
              ? `It has ${data.runs.length} run${data.runs.length === 1 ? "" : "s"} in its history, which would lose their encounter.`
              : "Its roster, notes, images, and reminders are deleted. This can't be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{hasRuns ? "Close" : "Cancel"}</AlertDialogCancel>
          {!hasRuns && (
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                remove({ planId: data.plan._id })
                  .then(() => navigate(`/campaigns/${data.campaign._id}`))
                  .catch(toastError);
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
