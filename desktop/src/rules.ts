import type { Creature, EncounterPlan } from './domain';

const evPerHero = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

export function drawSteelBudget(level: number, heroCount: number, victories: number) {
  if (!Number.isInteger(level) || level < 1 || level > 10) throw new Error('Draw Steel level must be 1–10');
  if (heroCount < 0 || victories < 0) throw new Error('Hero count and victories cannot be negative');
  if (heroCount === 0) return null;
  const perHero = evPerHero[level - 1];
  const base = perHero * (heroCount + Math.floor(victories / 2));
  return { trivial: base - perHero, easy: base, standard: base + perHero, hard: base + 3 * perHero };
}

export function drawSteelPlanDifficulty(plan: EncounterPlan, creatures: Creature[], level: number, heroCount: number, victories: number) {
  const budget = drawSteelBudget(level, heroCount, victories);
  const totalEv = plan.roster.reduce((total, member) => {
    const creature = creatures.find(item => item.id === member.creatureId);
    return total + (creature?.kind === 'adversary' ? (creature.ev ?? 0) * member.quantity : 0);
  }, 0);
  if (!budget) return { totalEv, label: 'Add heroes', remaining: null };
  const label = totalEv <= budget.trivial ? 'Trivial'
    : totalEv < budget.easy ? 'Easy'
      : totalEv <= budget.standard ? 'Standard'
        : totalEv <= budget.hard ? 'Hard' : 'Deadly';
  return { totalEv, label, remaining: budget[plan.targetDifficulty] - totalEv };
}

export function nextDrawSteelRound(round: number, malice: number, heroCount: number, victories: number) {
  const nextRound = round + 1;
  return { round: nextRound, malice: malice + heroCount + victories + nextRound };
}
