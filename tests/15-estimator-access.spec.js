const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot, settingsPage, changeLanguage } = require('../helpers/language');
const { expectBudgetPersisted } = require('../helpers/monthly-budget');
const { createExpense } = require('../helpers/expenses');
const { setOpeningBalance, reloadBalanceProject } = require('../helpers/balances');
const { addCurrency } = require('../helpers/currencies');
const { openSummary, expectSummaryCard } = require('../helpers/summary');
const { setThemePreference } = require('../helpers/settings');
const { estimatorTime, estimatorMonth, estimatorPassword, estimatorDialog, estimatorSwitch,
  estimatorPanel, authorization, expectEstimatorOnlyChanged, expectUnchanged,
  expectAuthorization, requestEstimator, submitPassword, expectRejected,
  unlockEstimator, disableEstimator } = require('../helpers/estimator-access');

const errorsByPage = new WeakMap();
async function prepareEmpty(page, context, app) {
  const errors = [];
  errorsByPage.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  const origin = new URL(app.url).origin;
  await page.clock.setFixedTime(new Date(estimatorTime));
  await context.addInitScript(value => {
    if (location.origin === value && localStorage.getItem('kash_services_online') === null)
      localStorage.setItem('kash_services_online', '0');
  }, origin);
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());
  await page.goto(app.url);
  expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
  expect(await authorization(page)).toBeNull();
  await createLanguageProject(page);
  const project = await projectSnapshot(page);
  expect(project.inicio).toBe(estimatorMonth);
  expect(project.enabledCurrencies).toEqual(['ARS']);
  expect(project.expenses).toEqual([]);
  expect(project.C).toEqual({});
  expect(project.displayOptions.estimator).toBe(false);
  await expectBudgetPersisted(page, project);
  page.setDefaultTimeout(5_000);
}

const test = base.extend({
  estimatorApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanEstimatorProject: [async ({ page, context, estimatorApp }, use, testInfo) => {
    const started = Date.now();
    await base.step('Inicio limpio: inglés, proyecto vacío y guías automáticas desactivadas desde F1',
      () => prepareEmpty(page, context, estimatorApp));
    await testInfo.attach('estimator-setup-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
      testTimeoutMs: testInfo.timeout, fixedTime: estimatorTime, freshProject: true,
    }), contentType: 'application/json' });
    await use();
  }, { auto: true, timeout: 60_000 }],
  sampleProject: [async ({ page, cleanEstimatorProject }, use, testInfo) => {
    const started = Date.now();
    await setOpeningBalance(page, 'ARS', '1000');
    await createExpense(page, { description: 'Café & Facturas!', amount: '25', paid: true,
      month: estimatorMonth, note: 'Nota propia <b>Save</b>' });
    await createExpense(page, { description: 'Pendiente de octubre', amount: '75', paid: false, month: estimatorMonth });
    await createExpense(page, { description: 'Previsto de noviembre', amount: '150', paid: false, month: '2026-11' });
    await openSummary(page, estimatorMonth);
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
    await testInfo.attach('estimator-data-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000, testTimeoutMs: testInfo.timeout,
    }), contentType: 'application/json' });
    await use(await projectSnapshot(page));
  }, { timeout: 60_000 }],
  usdProject: [async ({ page, sampleProject }, use, testInfo) => {
    const started = Date.now();
    await addCurrency(page, 'USD');
    await setOpeningBalance(page, 'USD', '100');
    await testInfo.attach('estimator-usd-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000, testTimeoutMs: testInfo.timeout,
    }), contentType: 'application/json' });
    await use(await projectSnapshot(page));
  }, { timeout: 60_000 }],
});

test.use({ storageState: { cookies: [], origins: [] }, timezoneId: 'America/Argentina/Buenos_Aires' });
test.describe('15 · Estimador protegido · KA$H v0.677', () => {
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', { body: JSON.stringify(errors), contentType: 'application/json' });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const diagnostic = await page.evaluate(() => ({
        url: location.href, language: document.documentElement.lang,
        authorization: localStorage.getItem('kash_private_estimator'),
        enabledAttribute: document.body.hasAttribute('data-kash-estimator-enabled'),
        project: typeof window.KASHGetProjectJson === 'function' ? JSON.parse(window.KASHGetProjectJson()) : null,
        dialogVisible: !!document.querySelector('#kashEstimatorDialog'),
        error: document.querySelector('#kashEstimatorError')?.textContent,
        passwordType: document.querySelector('#kashEstimatorPassword')?.type,
        panelCount: document.querySelectorAll('.marketPanel').length,
      })).catch(error => ({ diagnosticError: error.message }));
      await testInfo.attach('estimator-diagnostic', { body: JSON.stringify(diagnostic, null, 2), contentType: 'application/json' });
    }
  });

  test('TC-167 [P] Inicio limpio mantiene estimador oculto y ofrece activación protegida sin alterar el proyecto', async ({ page }) => {
    const before = await projectSnapshot(page);
    await expectAuthorization(page, false);
    await expect(estimatorPanel(page)).toHaveCount(0);
    await settingsPage(page, 'features', 'summary');
    await expect(estimatorSwitch(page)).not.toBeChecked();
    await expect(page.locator('.kashEstimatorLockNote')).toHaveText('Password required to enable on this device.');
    await requestEstimator(page);
    await expect(estimatorDialog(page)).toHaveAttribute('aria-labelledby', 'kashEstimatorTitle');
    await expect(page.locator('#kashEstimatorTitle')).toHaveText('Enable exchange estimator');
    await expect(page.locator('#kashEstimatorPassword')).toHaveAttribute('type', 'password');
    await expect(page.locator('#kashEstimatorPassword')).toHaveAttribute('autocomplete', 'off');
    await expectUnchanged(page, before);
  });

  test('TC-168 [N] Cancelar y Escape descartan el intento y el borrador sin autorizar ni guardar cambios', async ({ page }) => {
    const before = await projectSnapshot(page);
    await requestEstimator(page);
    await page.locator('#kashEstimatorPassword').fill('Borrador no enviado');
    await page.locator('#kashEstimatorCancel').click();
    await expect(estimatorDialog(page)).toHaveCount(0);
    await requestEstimator(page);
    await expect(page.locator('#kashEstimatorPassword')).toHaveValue('');
    await page.locator('#kashEstimatorPassword').fill('Otro borrador');
    await page.keyboard.press('Escape');
    await expect(estimatorDialog(page)).toHaveCount(0);
    await expectAuthorization(page, false);
    await expectUnchanged(page, before);
    await openSummary(page, estimatorMonth);
    await expect(estimatorPanel(page)).toHaveCount(0);
  });

  test('TC-169 [N] Contraseña vacía usa validación obligatoria sin desbloquear ni mostrar éxito', async ({ page }) => {
    const before = await projectSnapshot(page);
    await requestEstimator(page);
    await expect(page.locator('#kashEstimatorPassword')).toHaveAttribute('required', '');
    await page.locator('#kashEstimatorUnlock').click();
    await expect(estimatorDialog(page)).toBeVisible();
    expect(await page.locator('#kashEstimatorPassword').evaluate(input => input.validity.valueMissing)).toBe(true);
    await expect(page.locator('#kashEstimatorPassword')).toBeFocused();
    await expect(page.locator('#kashEstimatorError')).toBeEmpty();
    await expect(page.locator('#kashEstimatorUnlock')).toBeEnabled();
    await expectAuthorization(page, false);
    await expectUnchanged(page, before);
  });

  test('TC-170 [N] Claves incorrectas, mayúsculas y espacios no equivalen a la contraseña exacta', async ({ page }) => {
    const before = await projectSnapshot(page);
    await requestEstimator(page);
    for (const value of ['Incorrecta!123', estimatorPassword.toLowerCase(), ` ${estimatorPassword}`, `${estimatorPassword} `]) {
      await submitPassword(page, value);
      await expectRejected(page, before);
    }
    await page.locator('#kashEstimatorCancel').click();
    await openSummary(page, estimatorMonth);
    await expect(estimatorPanel(page)).toHaveCount(0);
    await expectUnchanged(page, before);
  });

  test('TC-171 [P] Contraseña correcta muestra estimador de noviembre y conserva saldos, gastos y notas', async ({ page, usdProject: before }) => {
    await unlockEstimator(page);
    await openSummary(page, estimatorMonth);
    await expect(estimatorPanel(page)).toBeVisible();
    await expect(estimatorPanel(page).locator('.marketHead b')).toContainText('November 2026');
    await expect(page.locator('#estimatorARS')).toHaveText('ARS 150');
    await expect(page.locator('#estimatorUSD')).toHaveText('—');
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
    await expectSummaryCard(page, 'USD', 'USD 100', 'USD 100');
    await expectEstimatorOnlyChanged(page, before, true);
  });

  test('TC-172 [R] Reintentar tras rechazo permite activar con Enter sin duplicar diálogo ni registros', async ({ page, usdProject: before }) => {
    await requestEstimator(page);
    await submitPassword(page, 'No es la clave', { enter: true });
    await expectRejected(page, before);
    await expect(estimatorDialog(page)).toHaveCount(1);
    await submitPassword(page, estimatorPassword, { enter: true });
    await expect(estimatorDialog(page)).toHaveCount(0);
    await expectAuthorization(page, true);
    await expect(estimatorSwitch(page)).toBeChecked();
    await openSummary(page, estimatorMonth);
    await expect(estimatorPanel(page)).toHaveCount(1);
    await expect(estimatorPanel(page)).toBeVisible();
    await expectEstimatorOnlyChanged(page, before, true);
  });

  test('TC-173 [R] Desactivar oculta el panel, revoca autorización y exige contraseña para volver a habilitar', async ({ page, usdProject: before }) => {
    await unlockEstimator(page);
    const disabled = await disableEstimator(page);
    await openSummary(page, estimatorMonth);
    await expect(estimatorPanel(page)).toHaveCount(0);
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
    await requestEstimator(page);
    await submitPassword(page, 'Acceso anterior revocado');
    await expectRejected(page, disabled);
    await page.locator('#kashEstimatorCancel').click();
    await unlockEstimator(page);
    await openSummary(page, estimatorMonth);
    await expect(estimatorPanel(page)).toBeVisible();
    await expectEstimatorOnlyChanged(page, before, true);
  });

  test('TC-174 [R] Recargar conserva activación y datos; tras desactivar la recarga no restaura el acceso', async ({ page, usdProject }) => {
    const enabled = await unlockEstimator(page);
    await openSummary(page, estimatorMonth);
    await reloadBalanceProject(page, enabled);
    await expectAuthorization(page, true);
    await openSummary(page, estimatorMonth);
    await expect(estimatorPanel(page)).toBeVisible();
    await expect(page.locator('#estimatorARS')).toHaveText('ARS 150');
    const disabled = await disableEstimator(page);
    await reloadBalanceProject(page, disabled);
    await expectAuthorization(page, false);
    await openSummary(page, estimatorMonth);
    await expect(estimatorPanel(page)).toHaveCount(0);
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
    await expectSummaryCard(page, 'USD', 'USD 100', 'USD 100');
    await requestEstimator(page);
    await expect(page.locator('#kashEstimatorPassword')).toHaveValue('');
  });

  test('TC-175 [E] Autorizar con ARS no agrega USD; el panel aparece al incorporar la moneda requerida', async ({ page, sampleProject: before }) => {
    await unlockEstimator(page);
    await openSummary(page, estimatorMonth);
    await expect(estimatorPanel(page)).toHaveCount(0);
    expect((await projectSnapshot(page)).enabledCurrencies).toEqual(['ARS']);
    await expectEstimatorOnlyChanged(page, before, true);
    await addCurrency(page, 'USD');
    const afterCurrency = await projectSnapshot(page);
    await openSummary(page, estimatorMonth);
    await expect(estimatorPanel(page)).toBeVisible();
    await expect(page.locator('#estimatorARS')).toHaveText('ARS 150');
    await expectAuthorization(page, true);
    expect(afterCurrency.expenses).toEqual(before.expenses);
    expect(afterCurrency.fx).toEqual(before.fx);
    await expectUnchanged(page, afterCurrency);
  });

  test('TC-176 [R] Importar proyecto habilitado en contexto limpio no transfiere autorización y diálogo respeta idioma y teclado', async ({ page, browser, estimatorApp, usdProject }) => {
    await unlockEstimator(page);
    const exported = await projectSnapshot(page);
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] },
      locale: 'en-US', timezoneId: 'America/Argentina/Buenos_Aires',
      viewport: { width: 1920, height: 1080 }, serviceWorkers: 'block' });
    const other = await context.newPage();
    try {
      await prepareEmpty(other, context, estimatorApp);
      // Archivo en memoria seleccionado por el input real de importación, sin invocar hostEvent.
      await other.locator('#kash-browser-open').setInputFiles({ name: 'QA-estimator.kash',
        mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
      await expect(other.locator('.kashActiveCurrencyCards>[data-estimate-currency]')).toHaveCount(2);
      const imported = await projectSnapshot(other);
      const { nid: oldCounter, ...expected } = exported;
      const { nid: newCounter, ...actual } = imported;
      expect(actual).toEqual(expected);
      expect(newCounter).toBeGreaterThanOrEqual(oldCounter);
      expect(imported.displayOptions.estimator).toBe(true);
      await expectAuthorization(other, false);
      await expect(estimatorPanel(other)).toHaveCount(0);
      // Importar carga la copia en memoria; guardar por UI persiste antes de comparar.
      await other.locator('#nav [onclick="saveProject(false)"]').click();
      await expectBudgetPersisted(other, imported);
      await changeLanguage(other, 'es');
      await setThemePreference(other, 'dark');
      await requestEstimator(other);
      await expect(other.locator('#kashEstimatorTitle')).toHaveText('Activar estimador de cambio');
      await expect(other.locator('#kashEstimatorCancel')).toHaveText('Cancelar');
      await other.keyboard.press('Shift+Tab');
      await expect(other.locator('#kashEstimatorUnlock')).toBeFocused();
      await other.keyboard.press('Tab');
      await expect(other.locator('#kashEstimatorPassword')).toBeFocused();
      await submitPassword(other, 'Clave incorrecta');
      await expectRejected(other, imported, 'es');
      await other.locator('#kashEstimatorCancel').click();
      await unlockEstimator(other, { enter: true });
      await openSummary(other, estimatorMonth);
      await expect(estimatorPanel(other)).toBeVisible();
      await expect(other.locator('#estimatorARS')).toHaveText('ARS 150');
      await expectSummaryCard(other, 'ARS', 'ARS 975', 'ARS 900');
      expect(errorsByPage.get(other)).toEqual([]);
      await expectAuthorization(page, true);
      await expectUnchanged(page, exported);
    } finally { await context.close(); }
  });
});
