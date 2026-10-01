import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron } from 'playwright-core';

const dataDir = await mkdtemp(join(tmpdir(), 'lidnd-walkthrough-'));
const statBlockPath = join(dataDir, 'warden-stat-block.png');
await writeFile(statBlockPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==', 'base64'));
let app;

async function open() {
  const instance = await electron.launch({ args: ['.', `--user-data-dir=${dataDir}`], cwd: process.cwd() });
  const window = await instance.firstWindow();
  await window.getByRole('status').waitFor();
  return { instance, window };
}

try {
  ({ instance: app } = await open());
  let window = await app.firstWindow();
  const actualDataDir = await app.evaluate(({ app }) => app.getPath('userData'));
  assert.equal(await realpath(actualDataDir), await realpath(dataDir), 'Smoke test must use isolated local data');

  await window.getByPlaceholder('Campaign name').fill('The Ash Road');
  await window.getByRole('button', { name: 'Create campaign' }).click();
  await window.getByRole('heading', { name: 'The Ash Road' }).waitFor();
  await window.screenshot({ path: '/tmp/lidnd-ux-campaign.png' });

  await window.getByRole('button', { name: 'No active session' }).click();
  await window.getByRole('textbox', { name: 'Session name' }).fill('Night at the bridge');
  await window.getByRole('button', { name: 'Start session' }).click();
  await window.getByRole('button', { name: /Night at the bridge/ }).waitFor();
  await window.screenshot({ path: '/tmp/lidnd-ux-session.png' });

  await window.getByRole('tab', { name: 'Plans' }).click();
  await window.getByRole('button', { name: 'New plan' }).click();
  await window.getByPlaceholder('Encounter name').fill('The Toll Keepers');
  await window.getByRole('textbox', { name: 'Encounter notes in Markdown' }).fill('The bridge is guarded at dusk.');
  await window.waitForFunction(async () => (await window.lidnd.load()).plans[0]?.notes === 'The bridge is guarded at dusk.');
  await window.getByRole('button', { name: 'Start new run' }).click();
  await window.getByRole('heading', { name: 'Participants' }).waitFor();
  await window.screenshot({ path: '/tmp/lidnd-ux-run.png' });

  await window.getByRole('button', { name: 'Add participant' }).click();
  await window.screenshot({ path: '/tmp/lidnd-ux-add-participant.png' });
  const form = window.getByRole('heading', { name: 'New creature' }).locator('..');
  await form.getByRole('textbox', { name: 'Name' }).fill('Bridge Warden');
  await form.getByRole('spinbutton', { name: 'EV' }).fill('3');
  await form.getByRole('spinbutton', { name: 'Maximum HP' }).fill('12');
  await form.getByLabel('Choose Stat block').setInputFiles(statBlockPath);
  await form.getByRole('button', { name: 'Attach image' }).click();
  await form.getByRole('img', { name: 'Creature stat block preview' }).waitFor();
  await form.getByRole('button', { name: 'Create & add to run' }).click();
  await window.getByText('Bridge Warden').first().waitFor();
  await window.screenshot({ path: '/tmp/lidnd-ux-creature.png' });

  const state = await window.evaluate(() => window.lidnd.load());
  assert.equal(state.campaigns.length, 1);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.plans.length, 1);
  assert.equal(state.plans[0].roster.length, 0, 'Live additions must not change the plan');
  assert.equal(state.runs[0].participants[0].name, 'Bridge Warden');
  assert.equal(state.runs[0].participants[0].hp, 12);
  assert.ok(state.creatures[0].statBlockAssetId);
  assert.equal(state.runs[0].participants[0].statBlockAssetId, state.creatures[0].statBlockAssetId);

  await window.getByRole('button', { name: 'Plan', exact: false }).click();
  await window.getByRole('tab', { name: 'Creatures' }).click();
  await window.getByRole('button', { name: '+ New', exact: true }).click();
  const heroForm = window.getByRole('heading', { name: 'New creature' }).locator('..');
  await heroForm.getByRole('textbox', { name: 'Name' }).fill('Mira');
  await heroForm.getByRole('combobox', { name: 'Role' }).selectOption('hero');
  await heroForm.getByRole('button', { name: 'Save creature' }).click();
  await window.getByRole('tab', { name: 'Party' }).click();
  await window.getByRole('combobox', { name: 'Add hero to party' }).selectOption({ label: 'Mira' });
  await window.waitForFunction(async () => (await window.lidnd.load()).party.length === 1);
  await window.getByRole('heading', { name: 'The Ash Road' }).waitFor();
  await window.screenshot({ path: '/tmp/lidnd-ux-party.png' });
  const withHero = await window.evaluate(() => window.lidnd.load());
  assert.equal(withHero.party.length, 1);
  assert.equal(withHero.creatures.find(item => item.name === 'Mira')?.maxHp, null);
  await app.close();
  app = undefined;

  ({ instance: app } = await open());
  window = await app.firstWindow();
  await window.getByRole('tab', { name: 'Plans' }).click();
  await window.getByRole('button', { name: /The Toll Keepers/ }).click();
  await window.getByRole('button', { name: /In progress/ }).click();
  await window.getByText('Bridge Warden').first().waitFor();
  const restored = await window.evaluate(() => window.lidnd.load());
  assert.equal(restored.party.length, 1);
  assert.ok((await window.evaluate(id => window.lidnd.readAsset(id), restored.creatures.find(item => item.name === 'Bridge Warden').statBlockAssetId)).startsWith('data:image/png;base64,'));
  console.log('Walkthrough passed: campaign → session → run → creature with stat block; hero → party; state survives restart.');
} finally {
  if (app) await app.close();
  await rm(dataDir, { recursive: true, force: true });
}
