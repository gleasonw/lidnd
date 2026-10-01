import { _electron as electron } from 'playwright-core';

const app = await electron.launch({ args: ['.'], cwd: process.cwd() });
try {
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await window.screenshot({ path: '/tmp/lidnd-desktop-before.png' });
  console.log(await window.title());
  console.log((await window.locator('body').innerText()).slice(0, 1000));
  const campaign = window.locator('.sidebar-list button').first();
  if (await campaign.count()) {
    await campaign.click();
    await window.screenshot({ path: '/tmp/lidnd-desktop-campaign-before.png' });
    await window.getByRole('button', { name: 'New plan' }).click();
    await window.screenshot({ path: '/tmp/lidnd-desktop-plan-before.png' });
  }
} finally {
  await app.close();
}
