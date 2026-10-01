import { jsonb, integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';

export type GameSystem = 'drawsteel' | 'dnd5e';
export type CreatureKind = 'hero' | 'adversary' | 'ally';
export interface PlanMember { id: string; creatureId: string; quantity: number }
export interface Reminder { id: string; text: string; round: number | null }
export interface RunParticipant {
  id: string; creatureId: string | null; name: string; kind: CreatureKind;
  ev: number | null; cr: string | null; maxHp: number | null;
  statBlockAssetId: string | null;
  hp: number | null; temporaryHp: number; acted: boolean; initiative: number | null;
  effects: Array<{ id: string; name: string; duration: string; saveEndsDc: number | null }>;
}

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  mimeType: text('mime_type').notNull(),
  createdAt: text('created_at').notNull(),
});

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  system: text('system').$type<GameSystem>().notNull(),
  partyLevel: integer('party_level').notNull(),
  createdAt: text('created_at').notNull(),
});

export const creatures = pgTable('creatures', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  system: text('system').$type<GameSystem>().notNull(),
  kind: text('kind').$type<CreatureKind>().notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
  ev: integer('ev'),
  cr: text('cr'),
  maxHp: integer('max_hp'),
  iconAssetId: uuid('icon_asset_id').references(() => assets.id),
  statBlockAssetId: uuid('stat_block_asset_id').references(() => assets.id),
  createdAt: text('created_at').notNull(),
});

export const party = pgTable('party', {
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  creatureId: uuid('creature_id').notNull().references(() => creatures.id, { onDelete: 'cascade' }),
}, table => [primaryKey({ columns: [table.campaignId, table.creatureId] })]);

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  targetDifficulty: text('target_difficulty').$type<'easy' | 'standard' | 'hard'>().notNull(),
  notes: text('notes').notNull(),
  tags: jsonb('tags').$type<string[]>().notNull(),
  roster: jsonb('roster').$type<PlanMember[]>().notNull(),
  reminders: jsonb('reminders').$type<Reminder[]>().notNull(),
  referenceAssetIds: jsonb('reference_asset_ids').$type<string[]>().notNull().default([]),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  victories: integer('victories').notNull(),
});

export const runs = pgTable('runs', {
  id: uuid('id').primaryKey(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'restrict' }),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'restrict' }),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  round: integer('round').notNull(),
  malice: integer('malice').notNull(),
  activeParticipantId: uuid('active_participant_id'),
  notes: text('notes').notNull(),
  participants: jsonb('participants').$type<RunParticipant[]>().notNull(),
  reminders: jsonb('reminders').$type<Array<Reminder & { dismissed: boolean }>>().notNull(),
  referenceAssetIds: jsonb('reference_asset_ids').$type<string[]>().notNull().default([]),
});
