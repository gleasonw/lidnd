import type { assets, campaigns, creatures, party, plans, runs, sessions, RunParticipant } from './schema';

export type { CreatureKind, GameSystem, PlanMember, Reminder, RunParticipant } from './schema';
export type Campaign = typeof campaigns.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Creature = typeof creatures.$inferSelect;
export type PartyMember = typeof party.$inferSelect;
export type EncounterPlan = typeof plans.$inferSelect;
export type GameSession = typeof sessions.$inferSelect;
export type EncounterRun = typeof runs.$inferSelect;

export interface AppData {
  campaigns: Campaign[];
  assets: Asset[];
  creatures: Creature[];
  party: PartyMember[];
  plans: EncounterPlan[];
  sessions: GameSession[];
  runs: EncounterRun[];
}

export function newId(): string { return crypto.randomUUID(); }

export function snapshotParticipant(creature: Creature): RunParticipant {
  return {
    id: newId(), creatureId: creature.id, name: creature.name, kind: creature.kind,
    ev: creature.ev, cr: creature.cr, maxHp: creature.maxHp,
    statBlockAssetId: creature.statBlockAssetId,
    hp: creature.kind === 'hero' ? null : creature.maxHp,
    temporaryHp: 0, acted: false, initiative: null, effects: [],
  };
}

export function snapshotRun(plan: EncounterPlan, session: GameSession, creatures: Creature[], party: PartyMember[]): EncounterRun {
  const campaignHeroes = party.filter(member => member.campaignId === plan.campaignId)
    .map(member => creatures.find(creature => creature.id === member.creatureId))
    .filter((creature): creature is Creature => creature !== undefined);
  const roster = plan.roster.flatMap(member => {
    const creature = creatures.find(item => item.id === member.creatureId);
    return creature ? Array.from({ length: member.quantity }, () => creature) : [];
  });
  const participants: RunParticipant[] = [...campaignHeroes, ...roster].map(snapshotParticipant);
  return {
    id: newId(), planId: plan.id, sessionId: session.id, startedAt: new Date().toISOString(), endedAt: null,
    round: 1, malice: session.victories + campaignHeroes.length + 1,
    activeParticipantId: null, notes: plan.notes, participants, referenceAssetIds: [...plan.referenceAssetIds],
    reminders: plan.reminders.map(reminder => ({ ...reminder, dismissed: false })),
  };
}
