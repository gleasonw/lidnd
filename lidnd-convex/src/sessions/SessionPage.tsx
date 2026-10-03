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
import { InlineText } from "@/components/InlineText";
import { Stepper } from "@/components/Stepper";
import { toastError } from "@/lib/errors";
import { formatDate, formatDuration, useNow } from "@/lib/time";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../convex/_generated/api";

export function SessionPage() {
  const { sessionId = "", campaignId } = useParams();
  const data = useQuery(api.sessions.get, { sessionId });
  const update = useMutation(api.sessions.update);
  const end = useMutation(api.sessions.end);
  const remove = useMutation(api.sessions.remove);
  const navigate = useNavigate();
  const now = useNow(30_000);
  const [deleting, setDeleting] = useState(false);

  if (data === undefined)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (data === null) return <p>This session doesn't exist.</p>;
  const { session, campaign, runs } = data;
  const active = session.endedAt === undefined;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Link
        to=".."
        relative="path"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Sessions
      </Link>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <InlineText
          value={session.name}
          label="Session name"
          className="text-lg font-semibold"
          onSave={(name) =>
            void update({ sessionId: session._id, name }).catch(toastError)
          }
        />
        <span className="text-sm text-muted-foreground">
          {formatDate(session.startedAt)} ·{" "}
          {active
            ? `in progress, ${formatDuration(now - session.startedAt)}`
            : formatDuration(session.endedAt! - session.startedAt)}
        </span>
        <div className="ml-auto flex gap-2">
          {active && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void end({ sessionId: session._id }).catch(toastError)
              }
            >
              End session
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setDeleting(true)}>
            Delete…
          </Button>
        </div>
      </div>
      {campaign.system === "drawSteel" && (
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="victories" className="text-muted-foreground">
            Victories
          </label>
          <Stepper
            id="victories"
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
        </div>
      )}
      <section>
        <h3 className="mb-2 text-sm font-semibold">Encounter runs</h3>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No encounters run in this session.
          </p>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {runs.map((run) => (
              <li key={run._id}>
                <Link
                  to={`/campaigns/${campaignId}/runs/${run._id}`}
                  className="flex items-center gap-3 px-3 py-1.5 hover:bg-accent"
                >
                  <span className="font-medium">{run.name}</span>
                  <span className="text-muted-foreground">
                    {formatDate(run.startedAt)}
                  </span>
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
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {runs.length > 0
                ? `“${session.name}” can't be deleted`
                : `Delete “${session.name}”?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {runs.length > 0
                ? "Encounters were run in this session, and their history depends on it."
                : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {runs.length > 0 ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {runs.length === 0 && (
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={() =>
                  void remove({ sessionId: session._id })
                    .then(() => navigate(`/campaigns/${campaignId}/sessions`))
                    .catch(toastError)
                }
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
