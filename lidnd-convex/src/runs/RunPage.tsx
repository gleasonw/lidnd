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
import { Button } from "@/components/ui/button";
import { MarkdownNotes } from "@/components/Markdown";
import { Stepper } from "@/components/Stepper";
import { AdversaryPicker } from "@/creatures/AdversaryPicker";
import { toastError } from "@/lib/errors";
import {
  formatClock,
  formatDate,
  formatDuration,
  roundLabel,
  useNow,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ResetIcon,
} from "@radix-ui/react-icons";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import * as dnd5e from "../../rules/dnd5e";
import * as drawSteel from "../../rules/drawSteel";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ActedButton, ParticipantRow } from "./ParticipantRow";
import { TurnGroupDot } from "@/plans/TurnGroupColor";
import { RunData, RunParticipant } from "./types";
import { WhoGoesFirst } from "./WhoGoesFirst";
import {
  useAdjustMalice,
  useDismissReminder,
  useNextTurn,
  usePreviousTurn,
  useSetVictories,
  useToggleActed,
} from "./useRunMutations";

export function RunPage() {
  const { runId = "" } = useParams();
  const data = useQuery(api.runs.get, { runId });
  if (data === undefined) {
    return <LoadingState className="px-4 py-6" />;
  }
  if (data === null) {
    return (
      <div className="px-4 py-6">
        <p className="mb-2">This run doesn't exist or isn't yours.</p>
        <Link to="/" className="text-sm underline underline-offset-4">
          Back to campaigns
        </Link>
      </div>
    );
  }
  return <Run data={data} />;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

function Run({ data }: { data: RunData }) {
  const { run, campaign } = data;
  const readOnly = run.endedAt !== undefined;
  const [selectedId, setSelectedId] = useState<Id<"runParticipants"> | null>(
    null,
  );
  const undo = useMutation(api.runs.undo);
  const redo = useMutation(api.runs.redo);
  const nextTurn = useNextTurn();
  const previousTurn = usePreviousTurn();

  const doUndo = () =>
    void undo({ runId: run._id })
      .then((label) => label && toast(`Undid: ${label}`))
      .catch(toastError);
  const doRedo = () =>
    void redo({ runId: run._id })
      .then((label) => label && toast(`Redid: ${label}`))
      .catch(toastError);

  // Keyboard: Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y); in 5e, N and P move turns.
  const handlers = useRef({
    doUndo,
    doRedo,
    next: () => {},
    previous: () => {},
  });
  handlers.current = {
    doUndo,
    doRedo,
    next: () => void nextTurn({ runId: run._id }).catch(toastError),
    previous: () => void previousTurn({ runId: run._id }).catch(toastError),
  };
  const fiveEInCombat = campaign.system === "dnd5e" && run.round > 0;
  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handlers.current.doRedo();
        else handlers.current.doUndo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handlers.current.doRedo();
      } else if (!mod && fiveEInCombat && e.key.toLowerCase() === "n") {
        handlers.current.next();
      } else if (!mod && fiveEInCombat && e.key.toLowerCase() === "p") {
        handlers.current.previous();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, fiveEInCombat]);

  const selected =
    data.participants.find((p) => p._id === selectedId) ??
    data.participants.find((p) => p._id === run.currentParticipantId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar data={data} readOnly={readOnly} onUndo={doUndo} onRedo={doRedo} />
      {!readOnly && <ReminderBanner data={data} />}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(420px,5fr)_minmax(0,6fr)]">
        <div className="min-h-0 overflow-auto border-r">
          <ParticipantList
            data={data}
            readOnly={readOnly}
            selectedId={selected?._id}
            onSelect={setSelectedId}
          />
        </div>
        <div className="min-h-0 overflow-auto">
          <ReferencePane data={data} readOnly={readOnly} selected={selected} />
        </div>
      </div>
    </div>
  );
}

function TopBar({
  data,
  readOnly,
  onUndo,
  onRedo,
}: {
  data: RunData;
  readOnly: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const { run, campaign, session } = data;
  const now = useNow(1000);
  const adjustMalice = useAdjustMalice();
  const setVictories = useSetVictories();
  const nextRound = useMutation(api.runs.nextRound);
  const beginCombat = useMutation(api.runs.beginCombat);
  const nextTurn = useNextTurn();
  const previousTurn = usePreviousTurn();
  const [ending, setEnding] = useState(false);
  const isDrawSteel = campaign.system === "drawSteel";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2">
      <Link
        to={`/campaigns/${campaign._id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {campaign.name}
      </Link>
      <div className="flex items-baseline gap-2">
        <h1 className="text-base font-semibold">{run.name}</h1>
        <Link
          to={`/campaigns/${campaign._id}/plans/${run.planId}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          Plan
        </Link>
        <span className="text-xs text-muted-foreground">{session?.name}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold">
          {run.round === 0 ? "Initiative" : `Round ${run.round}`}
        </span>
        <span
          className="tabular-nums text-muted-foreground"
          title="Time in this run"
        >
          {readOnly
            ? `${formatDuration(run.endedAt! - run.startedAt)} · ended ${formatDate(run.endedAt!)}`
            : formatClock(now - run.startedAt)}
        </span>
      </div>
      {isDrawSteel && (
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="font-medium">Malice</span>
            {readOnly ? (
              <span className="tabular-nums">{run.malice}</span>
            ) : (
              <Stepper
                size="sm"
                value={run.malice}
                min={0}
                max={999}
                label="malice"
                onChange={(next) =>
                  void adjustMalice({
                    runId: run._id,
                    delta: next - run.malice,
                  }).catch(toastError)
                }
              />
            )}
          </span>
          {session && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Victories</span>
              {readOnly ? (
                <span className="tabular-nums">{session.victories}</span>
              ) : (
                <Stepper
                  size="sm"
                  value={session.victories}
                  min={0}
                  max={99}
                  label="victories"
                  onChange={(victories) =>
                    void setVictories({ runId: run._id, victories }).catch(
                      toastError,
                    )
                  }
                />
              )}
            </span>
          )}
        </div>
      )}
      {!readOnly && (
        <div className="ml-auto flex items-center gap-1.5">
          {isDrawSteel ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void nextRound({ runId: run._id }).catch(toastError)
              }
              title="Start the next round even if some haven't acted"
            >
              Next round
            </Button>
          ) : run.round === 0 ? (
            <Button
              size="sm"
              onClick={() =>
                void beginCombat({ runId: run._id }).catch(toastError)
              }
            >
              Begin combat
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void previousTurn({ runId: run._id }).catch(toastError)
                }
                title="Previous turn (P)"
              >
                <ArrowLeftIcon /> Prev
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  void nextTurn({ runId: run._id }).catch(toastError)
                }
                title="Next turn (N)"
              >
                Next turn <ArrowRightIcon />
              </Button>
            </>
          )}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <Button
            size="sm"
            variant="ghost"
            disabled={data.undoLabel === null}
            onClick={onUndo}
            title={
              data.undoLabel
                ? `Undo: ${data.undoLabel} (Ctrl+Z)`
                : "Nothing to undo"
            }
          >
            <ResetIcon /> Undo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={data.redoLabel === null}
            onClick={onRedo}
            title={
              data.redoLabel
                ? `Redo: ${data.redoLabel} (Ctrl+Shift+Z)`
                : "Nothing to redo"
            }
          >
            <ResetIcon className="-scale-x-100" /> Redo
          </Button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <Button size="sm" variant="outline" onClick={() => setEnding(true)}>
            End run
          </Button>
        </div>
      )}
      <EndRunDialog data={data} open={ending} onOpenChange={setEnding} />
    </div>
  );
}

function ReminderBanner({ data }: { data: RunData }) {
  const dismiss = useDismissReminder();
  const round = data.run.round;
  if (round === 0) return null;
  const due = data.reminders.filter(
    (r) => (r.round === 0 || r.round === round) && r.dismissedRound !== round,
  );
  if (due.length === 0) return null;
  return (
    <div
      className="flex flex-col gap-1 border-b bg-amber-50 px-4 py-1.5 dark:bg-amber-950/40"
      role="status"
    >
      {due.map((r) => (
        <div key={r._id} className="flex items-center gap-3 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide">
            Reminder · {roundLabel(r.round)}
          </span>
          <span className="flex-1">{r.text}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6"
            onClick={() =>
              void dismiss({ reminderId: r._id }).catch(toastError)
            }
          >
            Dismiss
          </Button>
        </div>
      ))}
    </div>
  );
}

function ParticipantList({
  data,
  readOnly,
  selectedId,
  onSelect,
}: {
  data: RunData;
  readOnly: boolean;
  selectedId: Id<"runParticipants"> | undefined;
  onSelect: (id: Id<"runParticipants">) => void;
}) {
  const { campaign, run, participants } = data;
  const [choosingSide, setChoosingSide] = useState(false);
  // Set below for Draw Steel once a side is up; quiets the other side's buttons.
  let quietSide: "heroes" | "enemies" | null = null;
  const row = (p: RunParticipant, showActed = true) => (
    <ParticipantRow
      key={p._id}
      data={data}
      participant={p}
      readOnly={readOnly}
      showActed={showActed}
      quietActed={
        quietSide !== null &&
        (p.kind === "hero" || p.side === "ally" ? "heroes" : "enemies") ===
          quietSide
      }
      isCurrent={
        campaign.system === "dnd5e" && run.currentParticipantId === p._id
      }
      selected={selectedId === p._id}
      onSelect={() => onSelect(p._id)}
    />
  );

  if (campaign.system === "dnd5e") {
    // Keep roster order while initiative is being entered, so rows don't
    // jump around; sort once combat begins.
    const ordered =
      run.round === 0
        ? participants
        : dnd5e.initiativeOrder(
            participants.map((p) => ({
              ...p,
              id: p._id as string,
              createdAt: p._creationTime,
            })),
          );
    return (
      <div className="flex flex-col">
        {run.round === 0 && !readOnly && (
          <p className="border-b bg-accent/50 px-3 py-2 text-sm">
            Enter each initiative (Enter moves to the next box), then{" "}
            <strong>Begin combat</strong> to sort the order.
          </p>
        )}
        <ul className="divide-y">{ordered.map((p) => row(p))}</ul>
        {!readOnly && <AddToRun data={data} />}
        {!readOnly && (
          <p className="px-3 pb-3 text-xs text-muted-foreground">
            Keys: N next turn · P previous · Ctrl+Z undo · Ctrl+Shift+Z redo
          </p>
        )}
      </div>
    );
  }

  // Draw Steel: the heroes' side (heroes, allies) then the enemies' side
  // (initiative groups, then adversaries acting alone).
  const heroes = participants.filter((p) => p.kind === "hero");
  const allies = participants.filter(
    (p) => p.kind !== "hero" && p.side === "ally" && !p.turnGroupId,
  );
  const solo = participants.filter(
    (p) => p.kind !== "hero" && p.side === "enemy" && !p.turnGroupId,
  );
  const units = drawSteel.turnUnits(
    participants,
    data.turnGroups.map((g) => ({ id: g._id, acted: g.acted })),
  );
  const firstSide = run.firstSide;
  const up = firstSide ? drawSteel.sideUp(units, firstSide) : null;
  if (up && !readOnly) quietSide = up === "heroes" ? "enemies" : "heroes";
  const upLabel = (side: drawSteel.CombatSide) =>
    !readOnly && up === side ? "Up now" : undefined;

  return (
    <div className="flex flex-col">
      {!readOnly && (choosingSide || (!firstSide && run.round === 1)) ? (
        <WhoGoesFirst
          data={data}
          onCancel={firstSide ? () => setChoosingSide(false) : undefined}
        />
      ) : (
        <TurnStatus
          units={units}
          up={up}
          firstSide={firstSide}
          readOnly={readOnly}
          onChange={() => setChoosingSide(true)}
        />
      )}
      <Section title={`Heroes (${heroes.length})`} badge={upLabel("heroes")}>
        <ul className="divide-y">{heroes.map((p) => row(p))}</ul>
      </Section>
      {allies.length > 0 && (
        <Section title="Allies" badge={upLabel("heroes")}>
          <ul className="divide-y">{allies.map((p) => row(p))}</ul>
        </Section>
      )}
      {data.turnGroups.map((group) => {
        const members = participants.filter((p) => p.turnGroupId === group._id);
        if (members.length === 0) return null;
        return (
          <GroupSection
            key={group._id}
            group={group}
            memberId={members[0]._id}
            readOnly={readOnly}
            quiet={quietSide === "enemies"}
            badge={group.acted ? undefined : upLabel("enemies")}
          >
            <ul className="divide-y">{members.map((p) => row(p, false))}</ul>
          </GroupSection>
        );
      })}
      {solo.length > 0 && (
        <Section title="Adversaries" badge={upLabel("enemies")}>
          <ul className="divide-y">{solo.map((p) => row(p))}</ul>
        </Section>
      )}
      {!readOnly && <AddToRun data={data} />}
      {!readOnly && (
        <p className="px-3 pb-3 text-xs text-muted-foreground">
          Keys: Ctrl+Z undo · Ctrl+Shift+Z redo · Enter in an HP box applies
          damage
        </p>
      )}
    </div>
  );
}

/** Whose turn it is. A prompt only: any creature can still be marked. */
function TurnStatus({
  units,
  up,
  firstSide,
  readOnly,
  onChange,
}: {
  units: drawSteel.TurnUnit[];
  up: drawSteel.CombatSide | null;
  firstSide: drawSteel.CombatSide | undefined;
  readOnly: boolean;
  onChange: () => void;
}) {
  if (readOnly) {
    return (
      <p className="border-b px-3 py-1.5 text-xs text-muted-foreground">
        Final state when the run ended.
      </p>
    );
  }
  const left = (side: drawSteel.CombatSide) =>
    units.filter((u) => u.side === side && !u.acted && !u.defeated).length;
  const heroesLeft = left("heroes");
  const enemiesLeft = left("enemies");
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-3 py-2 text-sm">
      {up === null ? (
        <span className="font-semibold">Everyone has acted.</span>
      ) : (
        <span className="font-semibold">
          {up === "heroes" ? "Heroes' turn" : "Enemies' turn"}
          <span className="font-normal text-muted-foreground">
            {up === "heroes"
              ? " — the players pick who acts"
              : " — the Director picks who acts"}
          </span>
        </span>
      )}
      <span className="text-xs text-muted-foreground">
        Left this round: {heroesLeft} heroes&apos; side · {enemiesLeft}{" "}
        enemies&apos; side
        {firstSide &&
          ` · ${firstSide === "heroes" ? "heroes" : "enemies"} go first each round`}
      </span>
      {firstSide && (
        <button
          type="button"
          onClick={onChange}
          className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Change who goes first
        </button>
      )}
    </div>
  );
}

function UpBadge({ label }: { label: string | undefined }) {
  if (!label) return null;
  return (
    <span className="ml-auto rounded bg-primary px-1.5 py-px text-[11px] font-semibold normal-case tracking-normal text-primary-foreground">
      ▶ {label}
    </span>
  );
}

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b">
      <h2 className="flex items-center bg-muted/50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
        <UpBadge label={badge} />
      </h2>
      {children}
    </section>
  );
}

// Toggling any member toggles the group's shared marker.
function GroupSection({
  group,
  memberId,
  readOnly,
  quiet,
  badge,
  children,
}: {
  group: RunData["turnGroups"][number];
  memberId: Id<"runParticipants">;
  readOnly: boolean;
  quiet?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const toggleActed = useToggleActed();
  return (
    <section className={cn("border-b", group.acted && "opacity-80")}>
      <h2 className="flex items-center gap-2 bg-muted/50 px-2 py-1">
        <ActedButton
          quiet={quiet}
          acted={group.acted}
          name={group.name}
          disabled={readOnly}
          onClick={() =>
            void toggleActed({ participantId: memberId }).catch(toastError)
          }
        />
        <TurnGroupDot color={group.color} />
        <span className="text-xs font-medium uppercase tracking-wide">
          {group.name}
        </span>
        <span className="text-xs text-muted-foreground">acts together</span>
        <UpBadge label={badge} />
      </h2>
      {children}
    </section>
  );
}

function AddToRun({ data }: { data: RunData }) {
  const add = useMutation(api.runs.addParticipant);
  const creatures = useQuery(api.creatures.listForCampaign, {
    campaignId: data.campaign._id,
  });
  const missingHeroes = (creatures?.heroes ?? []).filter(
    (h) => !data.participants.some((p) => p.creatureId === h._id),
  );
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-3">
      <AdversaryPicker
        campaign={data.campaign}
        label="Add to this run"
        onPick={(creatureId) =>
          void add({ runId: data.run._id, creatureId }).catch(toastError)
        }
      />
      {missingHeroes.map((h) => (
        <Button
          key={h._id}
          size="sm"
          variant="ghost"
          className="border border-dashed"
          onClick={() =>
            void add({ runId: data.run._id, creatureId: h._id }).catch(
              toastError,
            )
          }
        >
          + {h.name}
        </Button>
      ))}
      <span className="text-xs text-muted-foreground">
        Changes here don't affect the plan.
      </span>
    </div>
  );
}

function ReferencePane({
  data,
  readOnly,
  selected,
}: {
  data: RunData;
  readOnly: boolean;
  selected: RunParticipant | undefined;
}) {
  const updateNotes = useMutation(api.runs.updateNotes);
  // One stat block per creature, with the selected participant's first.
  const statBlocks = [
    ...new Map(
      data.participants
        .filter((p) => p.statBlockUrl)
        .map((p) => [
          p.creatureId,
          {
            name: p.name.replace(/ \d+$/, ""),
            url: p.statBlockUrl!,
            creatureId: p.creatureId,
          },
        ]),
    ).values(),
  ].sort((a, b) =>
    a.creatureId === selected?.creatureId
      ? -1
      : b.creatureId === selected?.creatureId
        ? 1
        : 0,
  );
  const planStatBlocks = data.images.filter((i) => i.kind === "statBlock");
  const references = data.images.filter((i) => i.kind === "reference");

  return (
    <div className="flex flex-col gap-4 p-4">
      <section aria-labelledby="run-notes-heading">
        <h2 id="run-notes-heading" className="mb-1 text-sm font-semibold">
          Notes
          {!readOnly && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              edits apply to this run only
            </span>
          )}
        </h2>
        <MarkdownNotes
          value={data.run.notes}
          readOnly={readOnly}
          onSave={(notes) =>
            void updateNotes({ runId: data.run._id, notes }).catch(toastError)
          }
        />
      </section>
      {(statBlocks.length > 0 || planStatBlocks.length > 0) && (
        <section aria-labelledby="statblocks-heading">
          <h2 id="statblocks-heading" className="mb-2 text-sm font-semibold">
            Stat blocks
          </h2>
          <div className="columns-2 gap-3 [&>*]:mb-3 2xl:columns-3">
            {statBlocks.map((s) => (
              <figure
                key={s.creatureId}
                className={cn(
                  "break-inside-avoid rounded-md border",
                  s.creatureId === selected?.creatureId &&
                    "ring-2 ring-primary",
                )}
              >
                <figcaption className="px-2 py-1 text-xs font-medium">
                  {s.name}
                </figcaption>
                <img
                  src={s.url}
                  alt={`${s.name} stat block`}
                  className="w-full"
                />
              </figure>
            ))}
            {planStatBlocks.map((i) =>
              i.url ? (
                <figure
                  key={i._id}
                  className="break-inside-avoid rounded-md border"
                >
                  <img
                    src={i.url}
                    alt="Stat block"
                    className="w-full rounded-md"
                  />
                </figure>
              ) : null,
            )}
          </div>
        </section>
      )}
      {references.length > 0 && (
        <section aria-labelledby="refs-heading">
          <h2 id="refs-heading" className="mb-2 text-sm font-semibold">
            Reference images
          </h2>
          <div className="columns-2 gap-3 [&>*]:mb-3">
            {references.map((i) =>
              i.url ? (
                <a
                  key={i._id}
                  href={i.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-inside-avoid"
                >
                  <img
                    src={i.url}
                    alt="Reference"
                    className="w-full rounded-md border"
                  />
                </a>
              ) : null,
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function EndRunDialog({
  data,
  open,
  onOpenChange,
}: {
  data: RunData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const end = useMutation(api.runs.end);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End this run?</AlertDialogTitle>
          <AlertDialogDescription>
            The final state is kept in the encounter's history, and the plan
            stays ready to run again. Undo history is cleared.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep running</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void end({ runId: data.run._id }).catch(toastError)}
          >
            End run
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
