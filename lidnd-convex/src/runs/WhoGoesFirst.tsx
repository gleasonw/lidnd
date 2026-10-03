import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/errors";
import { useState } from "react";
import * as drawSteel from "../../rules/drawSteel";
import { RunData } from "./types";
import { useSetFirstSide } from "./useRunMutations";

const rollD10 = () => Math.floor(Math.random() * 10) + 1;

/**
 * Start-of-combat prompt (Heroes, "Determine Who Goes First"): roll a d10,
 * or enter a physical roll, then pick the side that acts first every round.
 */
export function WhoGoesFirst({
  data,
  onCancel,
}: {
  data: RunData;
  /** Shown when changing an earlier choice. */
  onCancel?: () => void;
}) {
  const setFirstSide = useSetFirstSide();
  const [roll, setRoll] = useState<number | null>(
    data.run.firstSideRoll ?? null,
  );
  const chooser = roll === null ? null : drawSteel.whoChoosesFirstSide(roll);

  const choose = (side: drawSteel.CombatSide) => {
    setFirstSide({ runId: data.run._id, side, roll: roll ?? undefined }).catch(
      toastError,
    );
    onCancel?.();
  };

  return (
    <section
      aria-labelledby="first-side-heading"
      className="m-3 flex flex-col gap-3 rounded-lg border-2 border-primary/60 p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="first-side-heading" className="text-sm font-semibold">
            Who goes first?
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            If one side is entirely surprised, the other side goes first.
            Otherwise roll a d10: on 6 or higher the players choose; on 1–5 the
            Director chooses. That side goes first every round.
          </p>
        </div>
        {onCancel && (
          <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => setRoll(rollD10())}>
          {roll === null ? "Roll d10" : "Reroll"}
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          or enter a roll
          <input
            type="number"
            min={1}
            max={10}
            value={roll ?? ""}
            aria-label="d10 roll"
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              setRoll(n >= 1 && n <= 10 ? n : null);
            }}
            className="h-7 w-12 rounded-md border border-input bg-transparent text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
        </label>
        {roll !== null && (
          <p className="flex items-baseline gap-2" role="status">
            <span className="text-2xl font-bold tabular-nums">{roll}</span>
            <span className="text-sm">
              {chooser === "players"
                ? "The players choose which side goes first."
                : "The Director chooses which side goes first."}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => choose("heroes")}>
          Heroes go first
        </Button>
        <Button size="sm" onClick={() => choose("enemies")}>
          Enemies go first
        </Button>
        {roll === null && (
          <span className="text-xs text-muted-foreground">
            No roll needed if a side is surprised.
          </span>
        )}
      </div>
    </section>
  );
}
