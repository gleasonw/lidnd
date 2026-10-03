// Draw Steel rules (spec §11.1–11.3). Pure functions shared by Convex
// functions and the client; no Convex or React imports.

export const MAX_HERO_LEVEL = 10;

/** EV per hero, `E(level)`, for hero levels 1–10. */
export function evPerHero(level: number) {
  if (!Number.isInteger(level) || level < 1 || level > MAX_HERO_LEVEL) {
    throw new Error(`Hero level must be 1–${MAX_HERO_LEVEL}`);
  }
  return 4 + level * 2;
}

export type RosterKind = "hero" | "standard" | "minion";
export type Side = "enemy" | "ally";

export type EvEntry = {
  kind: RosterKind;
  side: Side;
  /** Entered EV. For minions, the EV of a set of four. */
  ev: number;
  /** Planned squad size; only used for minions. */
  minionCount?: number;
  /** Minions of the same creature are bought together, four at a time. */
  creatureId?: string;
};

/** Squads of minions have at most eight members (Monsters, "Organized as Squads"). */
export const MAX_SQUAD_SIZE = 8;

/**
 * Total EV of the hostile roster. Heroes and allies cost nothing. Minions are
 * bought four at a time, so each minion type costs `ceil(total / 4)` sets,
 * however its minions are split into squads.
 */
export function totalEV(entries: EvEntry[]) {
  let total = 0;
  const minionsByCreature = new Map<string, { count: number; ev: number }>();
  entries.forEach((entry, i) => {
    if (entry.kind === "hero" || entry.side === "ally") return;
    if (entry.kind !== "minion") {
      total += entry.ev;
      return;
    }
    const key = entry.creatureId ?? `entry-${i}`;
    const current = minionsByCreature.get(key) ?? { count: 0, ev: entry.ev };
    current.count += entry.minionCount ?? 0;
    minionsByCreature.set(key, current);
  });
  for (const { count, ev } of minionsByCreature.values()) {
    total += Math.ceil(count / 4) * ev;
  }
  return total;
}

/**
 * An initiative group's EV. Aim for between one and two heroes' encounter
 * strength per group (Monsters, "Step 6: Build Initiative Groups").
 */
export function groupEV(members: EvEntry[]) {
  return totalEV(members);
}

export type Budget = {
  perHero: number;
  /** Encounter strength: heroes, allied NPCs, and victories. */
  strength: number;
  trivial: number;
  easy: number;
  standard: number;
  hard: number;
};

/**
 * Encounter budget (Monsters, Steps 3–4). Each ally fighting alongside the
 * heroes counts as a hero of the party's level, and every 2 average victories
 * add another hero. Returns null with zero heroes: show "add heroes".
 */
export function budget({
  level,
  heroCount,
  allyCount = 0,
  victories,
}: {
  level: number;
  heroCount: number;
  allyCount?: number;
  victories: number;
}): Budget | null {
  if (heroCount <= 0) return null;
  const perHero = evPerHero(level);
  const strength =
    perHero * (heroCount + allyCount + Math.floor(victories / 2));
  return {
    perHero,
    strength,
    trivial: strength - perHero,
    easy: strength,
    standard: strength + perHero,
    hard: strength + 3 * perHero,
  };
}

export type Difficulty = "trivial" | "easy" | "standard" | "hard" | "extreme";
export type TargetDifficulty = "easy" | "standard" | "hard";

/**
 * Trivial is less than ES minus one hero; easy is less than ES; standard is up
 * to ES plus one hero; hard is up to ES plus three heroes; above is extreme.
 */
export function difficulty(total: number, b: Budget): Difficulty {
  if (total < b.trivial) return "trivial";
  if (total < b.easy) return "easy";
  if (total <= b.standard) return "standard";
  if (total <= b.hard) return "hard";
  return "extreme";
}

export function targetEV(b: Budget, target: TargetDifficulty) {
  return b[target];
}

export function initialMalice(heroCount: number, victories: number) {
  return heroCount + victories + 1;
}

/**
 * Malice added at the start of round `round` (2 or later). Victories only
 * count toward the starting malice, not later rounds.
 */
export function roundMalice(heroCount: number, round: number) {
  return heroCount + round;
}

/**
 * A minion squad shares one Stamina pool: individual Stamina times squad size
 * (Monsters, "Shared Low Stamina"). Minions can't regain Stamina or gain
 * temporary Stamina.
 */
export function squadPool(count: number, staminaPerMinion: number) {
  return Math.max(0, count) * staminaPerMinion;
}

/** One minion dies each time the pool drops by one minion's Stamina. */
export function minionsAlive(pool: number, staminaPerMinion: number) {
  if (pool <= 0) return 0;
  return Math.ceil(pool / Math.max(1, staminaPerMinion));
}

/**
 * Damage to a squad's pool. A single-target hit takes its full damage from the
 * pool, so it can drop several minions. An area effect damages only the
 * minions in the area, each by at most one minion's Stamina, so it can't kill
 * minions outside the area (Monsters, "Minions and Area Effects").
 */
export function damageSquad({
  pool,
  staminaPerMinion,
  damage,
  minionsInArea,
}: {
  pool: number;
  staminaPerMinion: number;
  damage: number;
  /** Set for area effects: how many of the squad's minions are in the area. */
  minionsInArea?: number;
}) {
  if (damage <= 0) return pool;
  const loss =
    minionsInArea === undefined
      ? damage
      : Math.max(0, minionsInArea) * Math.min(damage, staminaPerMinion);
  return Math.max(0, pool - loss);
}

export type ActedParticipant = {
  id: string;
  acted: boolean;
  turnGroupId?: string;
  /** Defeated participants don't hold up the round. */
  defeated: boolean;
};
export type ActedGroup = { id: string; acted: boolean };

/** A member of an initiative group uses its group's marker. */
export function hasActed(p: ActedParticipant, groups: ActedGroup[]) {
  const group = p.turnGroupId && groups.find((g) => g.id === p.turnGroupId);
  return group ? group.acted : p.acted;
}

export function allActed(
  participants: ActedParticipant[],
  groups: ActedGroup[],
) {
  const remaining = participants.filter((p) => !p.defeated);
  return remaining.length > 0 && remaining.every((p) => hasActed(p, groups));
}

// Who goes first and whose turn it is (Heroes, Chapter 10: "Combat Round").

export type CombatSide = "heroes" | "enemies";

/**
 * Unless one side is entirely surprised, roll a d10: on 6 or higher the
 * players choose which side goes first; otherwise the Director chooses.
 */
export function whoChoosesFirstSide(d10: number): "players" | "director" {
  return d10 >= 6 ? "players" : "director";
}

/**
 * One turn on the battlefield: a hero, an ally, a lone adversary, or a whole
 * initiative group (the Director takes one group's turn at a time).
 */
export type TurnUnit = { side: CombatSide; acted: boolean; defeated: boolean };

export function turnUnits(
  participants: {
    kind: RosterKind;
    side: Side;
    acted: boolean;
    defeated: boolean;
    turnGroupId?: string;
  }[],
  groups: ActedGroup[],
): TurnUnit[] {
  const sideOf = (p: { kind: RosterKind; side: Side }): CombatSide =>
    p.kind === "hero" || p.side === "ally" ? "heroes" : "enemies";
  const units: TurnUnit[] = [];
  const byGroup = new Map<string, typeof participants>();
  for (const p of participants) {
    const group = p.turnGroupId && groups.find((g) => g.id === p.turnGroupId);
    if (!group) {
      units.push({ side: sideOf(p), acted: p.acted, defeated: p.defeated });
      continue;
    }
    byGroup.set(group.id, [...(byGroup.get(group.id) ?? []), p]);
  }
  for (const [groupId, members] of byGroup) {
    const group = groups.find((g) => g.id === groupId)!;
    units.push({
      side: members.every((m) => sideOf(m) === "heroes") ? "heroes" : "enemies",
      acted: group.acted,
      defeated: members.every((m) => m.defeated),
    });
  }
  return units;
}

/**
 * Which side is up next. Sides alternate starting with the side that goes
 * first (the same side every round); once one side has no one left to act,
 * the other side's remaining creatures act one after another. Counting turns
 * taken, rather than tracking order, copes with markers set out of order.
 * Returns null when everyone has acted.
 */
export function sideUp(
  units: TurnUnit[],
  firstSide: CombatSide,
): CombatSide | null {
  const live = units.filter((u) => !u.defeated || u.acted);
  const acted = (side: CombatSide) =>
    live.filter((u) => u.side === side && u.acted).length;
  const waiting = (side: CombatSide) =>
    live.some((u) => u.side === side && !u.acted);
  const other: CombatSide = firstSide === "heroes" ? "enemies" : "heroes";
  const preferred = acted(firstSide) <= acted(other) ? firstSide : other;
  const fallback = preferred === firstSide ? other : firstSide;
  if (waiting(preferred)) return preferred;
  if (waiting(fallback)) return fallback;
  return null;
}
