import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { AppData, Asset, Campaign, Creature, EncounterPlan, EncounterRun, GameSession } from '../src/domain';
import { assets, campaigns, creatures, party, plans, runs, sessions } from '../src/schema';

export class LocalDatabase {
  private readonly orm;
  private constructor(private readonly client: PGlite) { this.orm = drizzle({ client }); }

  static async open(userData: string, migrationsFolder: string): Promise<LocalDatabase> {
    const dataDir = join(userData, 'pglite');
    await mkdir(dataDir, { recursive: true });
    const client = await PGlite.create(dataDir);
    const store = new LocalDatabase(client);
    await migrate(store.orm, { migrationsFolder });
    return store;
  }

  async load(): Promise<AppData> {
    const [assetRows, campaignRows, creatureRows, partyRows, planRows, sessionRows, runRows] = await Promise.all([
      this.orm.select().from(assets), this.orm.select().from(campaigns), this.orm.select().from(creatures), this.orm.select().from(party),
      this.orm.select().from(plans), this.orm.select().from(sessions), this.orm.select().from(runs),
    ]);
    return { assets: assetRows, campaigns: campaignRows, creatures: creatureRows, party: partyRows, plans: planRows, sessions: sessionRows, runs: runRows };
  }

  async saveAsset(item: Asset): Promise<void> { await this.orm.insert(assets).values(item); }
  async getAsset(id: string): Promise<Asset | undefined> { return (await this.orm.select().from(assets).where(eq(assets.id, id)))[0]; }

  async saveCampaign(item: Campaign): Promise<void> {
    await this.orm.insert(campaigns).values(item).onConflictDoUpdate({ target: campaigns.id, set: { name: item.name, system: item.system, partyLevel: item.partyLevel } });
  }
  async saveCreature(item: Creature): Promise<void> {
    await this.orm.insert(creatures).values(item).onConflictDoUpdate({ target: creatures.id, set: { name: item.name, kind: item.kind, campaignId: item.campaignId, ev: item.ev, cr: item.cr, maxHp: item.maxHp, iconAssetId: item.iconAssetId, statBlockAssetId: item.statBlockAssetId } });
  }
  async savePlan(item: EncounterPlan): Promise<void> {
    await this.orm.insert(plans).values(item).onConflictDoUpdate({ target: plans.id, set: { name: item.name, targetDifficulty: item.targetDifficulty, notes: item.notes, tags: item.tags, roster: item.roster, reminders: item.reminders, referenceAssetIds: item.referenceAssetIds, updatedAt: item.updatedAt } });
  }
  async saveSession(item: GameSession): Promise<void> {
    await this.orm.insert(sessions).values(item).onConflictDoUpdate({ target: sessions.id, set: { name: item.name, endedAt: item.endedAt, victories: item.victories } });
  }
  async saveRun(item: EncounterRun): Promise<void> {
    await this.orm.insert(runs).values(item).onConflictDoUpdate({ target: runs.id, set: { endedAt: item.endedAt, round: item.round, malice: item.malice, activeParticipantId: item.activeParticipantId, notes: item.notes, participants: item.participants, reminders: item.reminders, referenceAssetIds: item.referenceAssetIds } });
  }

  async setPartyMember(campaignId: string, creatureId: string, present: boolean): Promise<void> {
    if (present) await this.orm.insert(party).values({ campaignId, creatureId }).onConflictDoNothing();
    else await this.orm.delete(party).where(and(eq(party.campaignId, campaignId), eq(party.creatureId, creatureId)));
  }

  async deletePlan(id: string): Promise<void> { await this.orm.delete(plans).where(eq(plans.id, id)); }
  async close(): Promise<void> { await this.client.close(); }
}
