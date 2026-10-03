import { SegmentedControl } from "@/components/SegmentedControl";
import { formatChallenge } from "@/lib/systems";
import { cn } from "@/lib/utils";
import * as drawSteel from "../../rules/drawSteel";
import { PlanData } from "./types";

const LABELS: Record<drawSteel.Difficulty, string> = {
  trivial: "Trivial",
  easy: "Easy",
  standard: "Standard",
  hard: "Hard",
  extreme: "Extreme",
};

export function DifficultyPanel({
  data,
  onTargetChange,
}: {
  data: PlanData;
  onTargetChange: (target: drawSteel.TargetDifficulty) => void;
}) {
  const { campaign, participants, plan } = data;
  if (campaign.system === "dnd5e") {
    const totalCr = participants
      .filter((p) => p.creature.kind !== "hero" && p.side === "enemy")
      .reduce((sum, p) => sum + p.creature.challenge, 0);
    return (
      <section
        aria-labelledby="difficulty-heading"
        className="rounded-lg border p-3"
      >
        <h3 id="difficulty-heading" className="text-sm font-semibold">
          Difficulty
        </h3>
        <p className="mt-1 text-sm">
          Total adversary CR {formatChallenge("dnd5e", totalCr)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          D&D 2024 encounter difficulty isn't defined yet, so there's no label
          or budget.
        </p>
      </section>
    );
  }

  const heroes = participants.filter((p) => p.creature.kind === "hero").length;
  // Allied NPCs fighting alongside the heroes count as heroes for ES.
  const allies = participants.filter(
    (p) => p.creature.kind !== "hero" && p.side === "ally",
  ).length;
  const victories = data.activeSession?.victories ?? 0;
  const total = drawSteel.totalEV(
    participants.map((p) => ({
      kind: p.creature.kind,
      side: p.side,
      ev: p.creature.challenge,
      minionCount: p.minionCount,
      creatureId: p.creatureId,
    })),
  );
  const budget = drawSteel.budget({
    level: campaign.partyLevel,
    heroCount: heroes,
    allyCount: allies,
    victories,
  });

  return (
    <section
      aria-labelledby="difficulty-heading"
      className="rounded-lg border p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="difficulty-heading" className="text-sm font-semibold">
          Difficulty
        </h3>
        <SegmentedControl
          name="target"
          aria-labelledby="difficulty-heading"
          value={plan.targetDifficulty}
          options={[
            { value: "easy", label: "Easy" },
            { value: "standard", label: "Standard" },
            { value: "hard", label: "Hard" },
          ]}
          onChange={onTargetChange}
        />
      </div>
      {budget === null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Add heroes to the roster to see difficulty.
        </p>
      ) : (
        <Budget
          total={total}
          budget={budget}
          target={plan.targetDifficulty}
          heroes={heroes}
          allies={allies}
          victories={victories}
          hasSession={data.activeSession !== null}
        />
      )}
    </section>
  );
}

function Budget({
  total,
  budget,
  target,
  heroes,
  allies,
  victories,
  hasSession,
}: {
  total: number;
  budget: drawSteel.Budget;
  target: drawSteel.TargetDifficulty;
  heroes: number;
  allies: number;
  victories: number;
  hasSession: boolean;
}) {
  const current = drawSteel.difficulty(total, budget);
  const goal = drawSteel.targetEV(budget, target);
  const remaining = goal - total;
  const max = Math.max(budget.hard + budget.perHero, total);
  const pct = (n: number) => `${Math.min(100, (n / max) * 100)}%`;
  const markers = [
    { at: budget.easy, label: "Easy" },
    { at: budget.standard, label: "Std" },
    { at: budget.hard, label: "Hard" },
  ];

  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
        <span className="text-base font-semibold">{LABELS[current]}</span>
        <span className="tabular-nums">
          {total} EV of {goal} target
        </span>
        <span
          className={cn(
            "tabular-nums",
            remaining < 0
              ? "font-medium text-destructive"
              : "text-muted-foreground",
          )}
        >
          {remaining >= 0 ? `${remaining} EV left` : `${-remaining} EV over`}
        </span>
      </p>
      <div className="relative h-2 rounded-full bg-muted" aria-hidden>
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: pct(total) }}
        />
        {markers.map((m) => (
          <div
            key={m.label}
            className="absolute -top-0.5 h-3 w-px bg-foreground/60"
            style={{ left: pct(m.at) }}
          />
        ))}
      </div>
      <div
        className="relative h-3 text-[10px] text-muted-foreground"
        aria-hidden
      >
        {markers.map((m) => (
          <span
            key={m.label}
            className="absolute -translate-x-1/2"
            style={{ left: pct(m.at) }}
          >
            {m.label} {m.at}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        ES {budget.strength}: {heroes} hero{heroes === 1 ? "" : "es"}
        {allies > 0 && ` + ${allies} all${allies === 1 ? "y" : "ies"}`}
        {victories > 0 && ` + ${victories} victories`} · {budget.perHero} EV per
        hero
        {!hasSession && " · victories count once a session is running"}
      </p>
    </div>
  );
}
