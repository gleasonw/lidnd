import { app, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { LocalDatabase } from './database';
import { AssetStore } from './assets';

const here = dirname(fileURLToPath(import.meta.url));
const id = z.string().uuid();
const text = z.string().trim().min(1);
const system = z.enum(['drawsteel', 'dnd5e']);
const kind = z.enum(['hero', 'adversary', 'ally']);
const campaign = z.object({ id, name: text, system, partyLevel: z.number().int().min(1).max(20), createdAt: z.string() });
const creature = z.object({ id, name: text, system, kind, campaignId: id.nullable(), ev: z.number().nonnegative().nullable(), cr: z.string().nullable(), maxHp: z.number().int().nonnegative().nullable(), iconAssetId: id.nullable(), statBlockAssetId: id.nullable(), createdAt: z.string() });
const plan = z.object({ id, campaignId: id, name: text, targetDifficulty: z.enum(['easy', 'standard', 'hard']), notes: z.string(), tags: z.array(text), roster: z.array(z.object({ id, creatureId: id, quantity: z.number().int().positive() })), reminders: z.array(z.object({ id, text, round: z.number().int().positive().nullable() })), referenceAssetIds: z.array(id), createdAt: z.string(), updatedAt: z.string() });
const session = z.object({ id, campaignId: id, name: text, startedAt: z.string(), endedAt: z.string().nullable(), victories: z.number().int().nonnegative() });
const run = z.object({ id, planId: id, sessionId: id, startedAt: z.string(), endedAt: z.string().nullable(), round: z.number().int().positive(), malice: z.number().int().nonnegative(), activeParticipantId: id.nullable(), notes: z.string(), participants: z.array(z.object({ id, creatureId: id.nullable(), name: text, kind, ev: z.number().nullable(), cr: z.string().nullable(), maxHp: z.number().int().nonnegative().nullable(), statBlockAssetId: id.nullable(), hp: z.number().int().nonnegative().nullable(), temporaryHp: z.number().int().nonnegative(), acted: z.boolean(), initiative: z.number().nullable(), effects: z.array(z.object({ id, name: text, duration: z.string(), saveEndsDc: z.number().int().nonnegative().nullable() })) })), reminders: z.array(z.object({ id, text, round: z.number().int().positive().nullable(), dismissed: z.boolean() })), referenceAssetIds: z.array(id) });

let database: LocalDatabase;
let assetStore: AssetStore;

async function createWindow() {
  const window = new BrowserWindow({
    width: 1280, height: 820, minWidth: 880, minHeight: 600,
    webPreferences: { preload: join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  if (process.env.LIDND_DEV_URL) await window.loadURL(process.env.LIDND_DEV_URL);
  else await window.loadFile(join(here, 'renderer/index.html'));
}

app.whenReady().then(async () => {
  database = await LocalDatabase.open(app.getPath('userData'), join(here, 'drizzle'));
  assetStore = new AssetStore(join(app.getPath('userData'), 'assets'), database);
  ipcMain.handle('data:load', () => database.load());
  ipcMain.handle('campaign:save', (_event, value) => database.saveCampaign(campaign.parse(value)));
  ipcMain.handle('creature:save', (_event, value) => database.saveCreature(creature.parse(value)));
  ipcMain.handle('party:set', (_event, campaignId, creatureId, present) => database.setPartyMember(id.parse(campaignId), id.parse(creatureId), z.boolean().parse(present)));
  ipcMain.handle('plan:save', (_event, value) => database.savePlan(plan.parse(value)));
  ipcMain.handle('plan:delete', (_event, value) => database.deletePlan(id.parse(value)));
  ipcMain.handle('session:save', (_event, value) => database.saveSession(session.parse(value)));
  ipcMain.handle('run:save', (_event, value) => database.saveRun(run.parse(value)));
  ipcMain.handle('asset:import', (_event, name, mimeType, base64) => assetStore.import(z.string().min(1).max(256).parse(name), z.string().parse(mimeType), z.string().parse(base64)));
  ipcMain.handle('asset:read', (_event, assetId) => assetStore.read(id.parse(assetId)));
  await createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow(); });
}).catch(error => { console.error(error); app.quit(); });

app.on('before-quit', () => { if (database) void database.close(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
