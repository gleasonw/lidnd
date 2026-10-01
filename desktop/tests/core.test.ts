import { afterEach, expect, test } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDatabase } from '../electron/database';
import { snapshotRun, type Campaign, type Creature, type EncounterPlan, type GameSession } from '../src/domain';
import { applyDamage, applyHealing, drawSteelPlanDifficulty, markDrawSteelActed, nextDrawSteelRound } from '../src/rules';

const paths: string[] = [];
afterEach(async () => { await Promise.all(paths.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

test('Drizzle migrates a fresh PGlite database and retains plans and run snapshots across restart', async () => {
  const path = await mkdtemp(join(tmpdir(), 'lidnd-desktop-'));
  paths.push(path);
  const migrations = join(process.cwd(), 'drizzle');
  const campaign: Campaign = { id: crypto.randomUUID(), name: 'Test campaign', system: 'drawsteel', partyLevel: 2, createdAt: new Date().toISOString() };
  const hero: Creature = { id: crypto.randomUUID(), name: 'Hero', system: 'drawsteel', kind: 'hero', campaignId: null, ev: null, cr: null, maxHp: null, iconAssetId: null, statBlockAssetId: null, createdAt: campaign.createdAt };
  const foe: Creature = { id: crypto.randomUUID(), name: 'Goblin', system: 'drawsteel', kind: 'adversary', campaignId: null, ev: 4, cr: null, maxHp: 10, iconAssetId: null, statBlockAssetId: null, createdAt: campaign.createdAt };
  const plan: EncounterPlan = { id: crypto.randomUUID(), campaignId: campaign.id, name: 'Ambush', targetDifficulty: 'standard', notes: 'First note', tags: ['road'], roster: [{ id: crypto.randomUUID(), creatureId: foe.id, quantity: 2 }], reminders: [{ id: crypto.randomUUID(), text: 'Check light', round: 1 }], referenceAssetIds: [], createdAt: campaign.createdAt, updatedAt: campaign.createdAt };
  const session: GameSession = { id: crypto.randomUUID(), campaignId: campaign.id, name: 'Session 1', startedAt: campaign.createdAt, endedAt: null, victories: 1 };

  let db = await LocalDatabase.open(path, migrations);
  await db.saveCampaign(campaign);
  await db.saveCreature(hero);
  await db.saveCreature(foe);
  await db.setPartyMember(campaign.id, hero.id, true);
  await db.savePlan(plan);
  await db.saveSession(session);
  const run = snapshotRun(plan, session, [hero, foe], [{ campaignId: campaign.id, creatureId: hero.id }]);
  await db.saveRun(run);
  await db.saveCreature({ ...foe, name: 'Changed goblin', maxHp: 20 });
  await db.savePlan({ ...plan, notes: 'Changed plan' });
  await db.close();

  db = await LocalDatabase.open(path, migrations);
  const loaded = await db.load();
  expect(loaded.plans[0].notes).toBe('Changed plan');
  expect(loaded.runs[0].notes).toBe('First note');
  expect(loaded.runs[0].participants.filter(item => item.name === 'Goblin')).toHaveLength(2);
  expect(loaded.runs[0].participants.find(item => item.name === 'Goblin')?.maxHp).toBe(10);
  expect(loaded.runs[0].participants.find(item => item.kind === 'hero')?.hp).toBeNull();
  await db.close();
});

test('Draw Steel budget boundaries and later-round malice include victories', () => {
  const plan: EncounterPlan = { id: crypto.randomUUID(), campaignId: crypto.randomUUID(), name: 'Fight', targetDifficulty: 'standard', notes: '', tags: [], roster: [{ id: crypto.randomUUID(), creatureId: 'foe', quantity: 2 }], reminders: [], referenceAssetIds: [], createdAt: '', updatedAt: '' };
  const foe: Creature = { id: 'foe', name: 'Foe', system: 'drawsteel', kind: 'adversary', campaignId: null, ev: 6, cr: null, maxHp: 10, iconAssetId: null, statBlockAssetId: null, createdAt: '' };
  expect(drawSteelPlanDifficulty(plan, [foe], 1, 2, 0)).toEqual({ totalEv: 12, label: 'Standard', remaining: 6 });
  expect(drawSteelPlanDifficulty(plan, [foe], 1, 0, 0).label).toBe('Add heroes');
  expect(nextDrawSteelRound(1, 5, 2, 3)).toEqual({ round: 2, malice: 12 });
});

test('damage spends temporary HP first and healing stops at maximum HP', () => {
  const participant = { id: crypto.randomUUID(), creatureId: null, name: 'Foe', kind: 'adversary' as const, ev: 1, cr: null, maxHp: 10, statBlockAssetId: null, hp: 8, temporaryHp: 3, acted: false, initiative: null, effects: [] };
  expect(applyDamage(participant, 5)).toMatchObject({ hp: 6, temporaryHp: 0 });
  expect(applyHealing(participant, 50)).toMatchObject({ hp: 10, temporaryHp: 3 });
  expect(applyDamage(participant, -2)).toBe(participant);
});

test('marking the last Draw Steel participant advances once and resets reminders', () => {
  const run = { id: crypto.randomUUID(), planId: crypto.randomUUID(), sessionId: crypto.randomUUID(), startedAt: '', endedAt: null, round: 1, malice: 4, activeParticipantId: null, notes: '', referenceAssetIds: [], participants: [
    { id: 'hero', creatureId: null, name: 'Hero', kind: 'hero' as const, ev: null, cr: null, maxHp: null, statBlockAssetId: null, hp: null, temporaryHp: 0, acted: true, initiative: null, effects: [] },
    { id: 'foe', creatureId: null, name: 'Foe', kind: 'adversary' as const, ev: 2, cr: null, maxHp: 10, statBlockAssetId: null, hp: 10, temporaryHp: 0, acted: false, initiative: null, effects: [] },
  ], reminders: [{ id: 'reminder', text: 'Smoke', round: null, dismissed: true }] };
  const next = markDrawSteelActed(run, 'foe', true, 1, 2);
  expect(next.round).toBe(2);
  expect(next.malice).toBe(9);
  expect(next.participants.every(item => !item.acted)).toBe(true);
  expect(next.reminders[0].dismissed).toBe(false);
  expect(markDrawSteelActed(run, 'foe', false, 1, 2).round).toBe(1);
});
