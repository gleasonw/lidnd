import { GameSystem } from "../../convex/lib/systems";

/** "EV" in Draw Steel, "CR" in 5e. */
export const challengeLabel = (system: GameSystem) =>
  system === "drawSteel" ? "EV" : "CR";

export function formatChallenge(system: GameSystem, value: number) {
  if (system === "drawSteel") return String(value);
  const fractions: Record<number, string> = {
    0.125: "1/8",
    0.25: "1/4",
    0.5: "1/2",
  };
  return fractions[value] ?? String(value);
}

/** Accepts "1/4" style CRs as well as numbers. */
export function parseChallenge(text: string) {
  const trimmed = text.trim();
  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(trimmed);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return trimmed === "" ? Number.NaN : Number(trimmed);
}
