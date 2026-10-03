// HP rules shared by both systems. Player-character HP is never tracked.

export type Health = { hp: number; tempHp: number };

/** Temporary HP absorbs damage first; HP doesn't go below zero. */
export function applyDamage({ hp, tempHp }: Health, amount: number): Health {
  if (amount <= 0) return { hp, tempHp };
  const absorbed = Math.min(tempHp, amount);
  return {
    hp: Math.max(0, hp - (amount - absorbed)),
    tempHp: tempHp - absorbed,
  };
}

export function applyHealing(hp: number, maxHp: number, amount: number) {
  if (amount <= 0) return hp;
  return Math.min(maxHp, hp + amount);
}

/**
 * Gaining temporary Stamina while you have some gives you the greater amount,
 * not the sum (Heroes, "Temporary Stamina").
 */
export function gainTemporary(current: number, amount: number) {
  return Math.max(current, amount);
}

export type TrackedParticipant = {
  kind: "hero" | "standard" | "minion";
  /** For minion squads, the shared Stamina pool. */
  hp: number;
  /** For minion squads, Stamina per minion. */
  maxHp: number;
};

/** Director-controlled creatures die at 0 Stamina. Hero HP isn't tracked. */
export function isDefeated(p: Pick<TrackedParticipant, "kind" | "hp">) {
  if (p.kind === "hero") return false;
  return p.hp <= 0;
}

/**
 * Winded: Stamina at or below half the maximum (Heroes, "Winded"). Minion
 * squads can't be winded.
 */
export function isWinded(p: TrackedParticipant) {
  if (p.kind !== "standard") return false;
  return p.hp > 0 && p.hp <= Math.floor(p.maxHp / 2);
}
