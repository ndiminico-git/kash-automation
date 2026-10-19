const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('./app-server');
const { createLanguageProject, projectSnapshot } = require('./language');
const { expectBudgetPersisted } = require('./monthly-budget');

// New v0.689 coverage also starts from a fresh browser context and the real wizard.
const test = base.extend({
  startTime: ['2026-10-15T12:00:00-03:00', { option: true }],
  upgradeApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  emptyUpgradeProject: [async ({ page, context, upgradeApp: app, startTime }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date(startTime));
    const origin = new URL(app.url).origin;
    await context.addInitScript(value => {
      if (location.origin === value && localStorage.getItem('kash_services_online') === null)
        localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await page.goto(app.url);
    expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
    await createLanguageProject(page);
    const project = await projectSnapshot(page);
    expect(project.expenses).toEqual([]);
    expect(project.recConfig).toEqual({});
    await expectBudgetPersisted(page, project);
    await use();
    expect(errors, 'No errores JavaScript durante el caso').toEqual([]);
  }, { auto: true, timeout: 60_000 }],
});

module.exports = { test, expect };
