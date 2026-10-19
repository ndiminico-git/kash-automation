const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot, goTo, settingsPage, navigation } = require('../helpers/language');
const { expectBudgetPersisted, createBudgetService } = require('../helpers/monthly-budget');
const { createExpense, readSavedProject } = require('../helpers/expenses');
const { setOpeningBalance, reloadBalanceProject } = require('../helpers/balances');
const { addCurrency, optionCodes } = require('../helpers/currencies');
const { openSummary, summaryCard, expectSummaryCard } = require('../helpers/summary');
const { createInstallment, addOwnNote, openTracker } = require('../helpers/installments-notes');
const { configureDates, openNotices, notices, expectUnread } = require('../helpers/dates-notifications');
const { settingsTime, settingsMonth, visibleChoice, requiredSettingsTabs, outsideVisibility,
  expectOnlyVisibilityChanged, setVisibleChoice, setOnlinePreference, setThemePreference,
  expectSettingsSelection, expectChartsVisible } = require('../helpers/settings');

const errorsByPage = new WeakMap();
const test = base.extend({
  settingsApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanSettingsProject: [async ({ page, context, settingsApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    const origin = new URL(app.url).origin;
    await page.clock.setFixedTime(new Date(settingsTime));
    await context.addInitScript(value => {
      if (location.origin === value && localStorage.getItem('kash_services_online') === null) localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await base.step('Preparación: inicio limpio, idioma inglés y proyecto vacío mediante wizard', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
      await createLanguageProject(page);
      const project = await projectSnapshot(page);
      expect(project.inicio).toBe(settingsMonth);
      expect(project.expenses).toEqual([]);
      expect(project.C).toEqual({});
      expect(project.cu).toEqual([]);
      expect(project.rec).toEqual([]);
      expect(project.displayOptions).toMatchObject({ charts: false, reminders: false, estimator: false });
      await expectBudgetPersisted(page, project);
    });
    page.setDefaultTimeout(5_000);
    await testInfo.attach('settings-setup-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
      testTimeoutMs: testInfo.timeout, fixedTime: settingsTime, freshProject: true,
    }), contentType: 'application/json' });
    await use();
  }, { auto: true, timeout: 60_000 }],
  sampleProject: [async ({ page, cleanSettingsProject }, use, testInfo) => {
    const started = Date.now();
    await setOpeningBalance(page, 'ARS', '1000');
    await createExpense(page, { description: 'Pago & Café QA', amount: '25', paid: true, month: settingsMonth, note: 'Nota literal / Save' });
    await createExpense(page, { description: 'Gasto pendiente QA', amount: '75', paid: false, month: settingsMonth });
    await createInstallment(page, { description: 'Notebook QA', total: 3 });
    await addOwnNote(page, 'Texto propio & <b>Settings</b>');
    await openSummary(page, settingsMonth);
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
    await testInfo.attach('settings-data-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000, testTimeoutMs: testInfo.timeout,
    }), contentType: 'application/json' });
    await use(await projectSnapshot(page));
  }, { timeout: 60_000 }],
  usdProject: [async ({ page, sampleProject }, use, testInfo) => {
    const started = Date.now();
    await addCurrency(page, 'USD');
    await setOpeningBalance(page, 'USD', '100');
    await testInfo.attach('settings-usd-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000, testTimeoutMs: testInfo.timeout,
    }), contentType: 'application/json' });
    await use(await projectSnapshot(page));
  }, { timeout: 60_000 }],
  datedProject: [async ({ page, sampleProject }, use, testInfo) => {
    const started = Date.now(), service = await createBudgetService(page, 'Vencimiento QA');
    await configureDates(page, { service, due: { date: '2026-10-16' }, lead: 2 });
    expect((await projectSnapshot(page)).serviceNotifications).toHaveLength(1);
    await testInfo.attach('settings-dates-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000, testTimeoutMs: testInfo.timeout,
    }), contentType: 'application/json' });
    await use({ service, project: await projectSnapshot(page) });
  }, { timeout: 60_000 }],
});

test.use({ storageState: { cookies: [], origins: [] }, timezoneId: 'America/Argentina/Buenos_Aires' });
test.describe('14 · Ajustes y funciones visibles · KA$H v0.690', () => {
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', { body: JSON.stringify(errors), contentType: 'application/json' });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const diagnostic = await page.evaluate(() => {
        let persisted = null, preferences = null;
        try {
          persisted = JSON.parse(localStorage.getItem('kash') || 'null');
          preferences = Object.fromEntries(['kash_services_online', 'kash_ui_theme', 'kash_language', 'kash_learning_v1'].map(key => [key, localStorage.getItem(key)]));
        } catch {}
        return { url: location.href, project: typeof window.KASHGetProjectJson === 'function'
          ? JSON.parse(window.KASHGetProjectJson()) : null, persisted, preferences,
          settingsPage: document.querySelector('.kashSettingsShell')?.dataset.page,
          switches: [...document.querySelectorAll('input[role="switch"]')].map(el => ({ id: el.id, choice: el.dataset.displayChoice, checked: el.checked, disabled: el.disabled })),
          modal: document.querySelector('#darkModal,#kashLearning,#kashEstimatorDialog')?.innerText };
      }).catch(error => ({ diagnosticError: error.message }));
      await testInfo.attach('settings-diagnostic', { body: JSON.stringify(diagnostic, null, 2), contentType: 'application/json' });
    }
  });

  test('TC-157 [P] Secciones y subsecciones navegan con selección accesible y teclado sin modificar el proyecto', async ({ page }) => {
    const before = await projectSnapshot(page);
    for (const [section, tabs] of Object.entries(requiredSettingsTabs)) {
      for (const tab of tabs) {
        await settingsPage(page, section, tab);
        await expectSettingsSelection(page, section, tab);
        await expect(page.locator('#ks_settings_content')).toBeVisible();
      }
    }
    await expect(page.locator('.kashSettingsNav [data-settings-section]')).toHaveCount(6);
    await settingsPage(page, 'money', 'currencies');
    for (const [key, tab] of [['ArrowRight', 'balances'], ['End', 'adjustments'], ['ArrowRight', 'currencies'], ['ArrowLeft', 'adjustments'], ['Home', 'currencies']]) {
      await page.keyboard.press(key);
      await expectSettingsSelection(page, 'money', tab);
      await expect(page.locator(`[data-settings-tab="${tab}"]`)).toBeFocused();
    }
    expect(await projectSnapshot(page)).toEqual(before);
    await expectBudgetPersisted(page, before);
  });

  test('TC-158 [R] Ocultar Cuotas conserva sus registros y mantiene disponibles las secciones principales, guardado y ayuda', async ({ page, sampleProject: before }) => {
    await settingsPage(page, 'features', 'modules');
    await expect(page.locator('.kashSettingsContent [data-display-choice]')).toHaveCount(1);
    await expect(visibleChoice(page, 'quotas')).toBeVisible();
    await expect(page.locator('.kashSettingsFixed')).toHaveCount(6);
    await setVisibleChoice(page, 'quotas', false);
    await expect(page.locator('#nav [data-kash-quota-nav]')).toBeHidden();
    for (const section of ['res', 'grid', 'gastos', 'fx', 'set']) {
      await expect(page.locator('#nav').getByRole('button', { name: navigation.en[section], exact: true })).toBeVisible();
      await goTo(page, section);
      await expect(page.locator('#v h2').first()).toHaveText(navigation.en[section]);
    }
    await expect(page.locator('#nav [onclick="saveProject(false)"]')).toBeVisible();
    await expect(page.locator('#nav [onclick="saveProject(true)"]')).toBeVisible();
    await expect(page.locator('#nav [onclick="undoChange()"]')).toBeVisible();
    await page.keyboard.press('F1');
    await expect(page.locator('#kashLearning[data-kind="help"]')).toBeVisible();
    await page.locator('[data-learn="help-close"]').click();
    await setVisibleChoice(page, 'quotas', true);
    await openTracker(page);
    await expect(page.locator('.cuotaNameCell')).toHaveText('Notebook QA');
    await expect(page.locator('.ownrem>span').first()).toHaveText('Texto propio & <b>Settings</b>');
    await expectOnlyVisibilityChanged(page, before);
  });

  test('TC-159 [R] Gráficos se ocultan y restauran con deshacer y rehacer sin alterar importes ni registros', async ({ page, sampleProject: before }) => {
    await setVisibleChoice(page, 'charts', true);
    await openSummary(page, settingsMonth);
    await expectChartsVisible(page, true);
    await expect(page.locator('.donutCenterValue')).toHaveText('100');
    await setVisibleChoice(page, 'charts', false);
    await openSummary(page, settingsMonth);
    await expectChartsVisible(page, false);
    await page.locator('#nav [onclick="undoChange()"]') .click();
    await expectChartsVisible(page, true);
    expect((await projectSnapshot(page)).displayOptions.charts).toBe(true);
    await page.locator('#nav [onclick="redoChange()"]') .click();
    await expectChartsVisible(page, false);
    expect((await projectSnapshot(page)).displayOptions.charts).toBe(false);
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
    // Restaurar historia normaliza nid en esta versión; los IDs existentes deben seguir exactos.
    await expectOnlyVisibilityChanged(page, before, { allowCounter: true });
  });

  test('TC-160 [N] Cotizador requiere dos monedas y su switch controla visibilidad sin registrar cambios de divisas', async ({ page, sampleProject }) => {
    await settingsPage(page, 'features', 'summary');
    const beforeCurrency = await projectSnapshot(page);
    await expect(visibleChoice(page, 'converter')).toBeDisabled();
    await expect(visibleChoice(page, 'converter').locator('xpath=ancestor::label')).toContainText('Requires two active currencies');
    // Playwright no debe hacer clic en un control deshabilitado: ese estado es la validación negativa.
    expect(await projectSnapshot(page)).toEqual(beforeCurrency);
    await addCurrency(page, 'USD');
    const before = await projectSnapshot(page);
    await setOnlinePreference(page, true);
    await setVisibleChoice(page, 'converter', false);
    await openSummary(page, settingsMonth);
    await expect(page.locator('.quickConverter')).toHaveCount(0);
    await setVisibleChoice(page, 'converter', true);
    await openSummary(page, settingsMonth);
    await expect(page.locator('.quickConverter')).toBeVisible();
    expect(await optionCodes(page.locator('#convFrom'))).toEqual(['ARS', 'USD']);
    expect(await optionCodes(page.locator('#convTo'))).toEqual(['ARS', 'USD']);
    await page.locator('#convAmount').fill('10');
    await page.locator('#convFrom').selectOption('USD');
    await page.locator('#convTo').selectOption('ARS');
    const after = await expectOnlyVisibilityChanged(page, before);
    expect(after.fx).toEqual([]);
    expect(after.expenses).toEqual(sampleProject.expenses);
  });

  test('TC-161 [R] Variación mensual cambia sólo la presentación y conserva saldo, remanente y movimientos', async ({ page, sampleProject: before }) => {
    await setVisibleChoice(page, 'variation', true);
    await openSummary(page, settingsMonth);
    const badge = summaryCard(page, 'ARS').locator('.holdingVariation');
    await expect(badge).toBeVisible();
    const originalText = await badge.innerText();
    await setVisibleChoice(page, 'variation', false);
    await openSummary(page, settingsMonth);
    await expect(badge).toBeHidden();
    await expect(page.locator('body')).toHaveClass(/kashNoVariation/);
    await expect(page.locator('.holdingsCard')).toBeVisible();
    await expect(page.locator('.movementsCard')).toBeVisible();
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
    await setVisibleChoice(page, 'variation', true);
    await openSummary(page, settingsMonth);
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(originalText);
    await expectOnlyVisibilityChanged(page, before);
  });

  test('TC-162 [R] Ocultar avisos conserva fechas e historial leído y restaurarlos no crea notificaciones duplicadas', async ({ page, datedProject }) => {
    await setVisibleChoice(page, 'reminders', true);
    await expectUnread(page, 1);
    await openNotices(page);
    await expect(notices(page)).toHaveCount(1);
    await page.locator('[onclick="readAllServiceNotices()"]') .click();
    await expectUnread(page, 0);
    await page.keyboard.press('Escape');
    const before = await projectSnapshot(page);
    await setVisibleChoice(page, 'reminders', false);
    await expect(page.locator('#serviceBell')).toHaveCount(0);
    await openSummary(page, settingsMonth);
    await expect(page.locator('#serviceNotificationPanel')).toHaveCount(0);
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
    await setVisibleChoice(page, 'reminders', true);
    await openNotices(page);
    await expect(notices(page)).toHaveCount(1);
    await expectUnread(page, 0);
    const after = await expectOnlyVisibilityChanged(page, before);
    expect(after.serviceDates).toEqual(datedProject.project.serviceDates);
    expect(after.serviceNotifications).toEqual(before.serviceNotifications);
    expect(after.serviceNotifications[0].read).toBe(true);
  });

  test('TC-163 [R] Conexión es una preferencia local y respeta el switch del cotizador sin bloquear datos offline', async ({ page, usdProject: before }) => {
    await setVisibleChoice(page, 'converter', true);
    await setOnlinePreference(page, false);
    await openSummary(page, settingsMonth);
    await expect(page.locator('.quickConverter')).toHaveCount(0);
    await setOnlinePreference(page, true);
    await openSummary(page, settingsMonth);
    await expect(page.locator('.quickConverter')).toBeVisible();
    await setVisibleChoice(page, 'converter', false);
    await openSummary(page, settingsMonth);
    await expect(page.locator('.quickConverter')).toHaveCount(0);
    const projectWithConverterOff = await projectSnapshot(page);
    await setOnlinePreference(page, false);
    await goTo(page, 'gastos');
    await expect(page.locator('#ec_ARS')).toBeEditable();
    await expect(page.locator('#ea_ARS')).toBeEditable();
    await expect(page.locator('.expenseSection[data-expense-currency="ARS"] tr[data-expense-index]')).toHaveCount(2);
    expect(await projectSnapshot(page)).toEqual(projectWithConverterOff);
    await setOnlinePreference(page, true);
    expect(await projectSnapshot(page)).toEqual(projectWithConverterOff);
    const after = await expectOnlyVisibilityChanged(page, before);
    expect(Object.prototype.hasOwnProperty.call(after, 'kash_services_online')).toBe(false);
  });

  test('TC-164 [P] Tema claro y oscuro se aplican al instante, se guardan en esta PC y no modifican el proyecto', async ({ page, sampleProject: before }) => {
    for (const theme of ['light', 'dark', 'light']) {
      await setThemePreference(page, theme);
      expect(await page.locator('[data-settings-theme-select] option').evaluateAll(xs => xs.map(x => x.value))).toEqual(['light', 'dark', 'system']);
      await expect(page.locator('.kashThemeSelect')).toHaveValue(theme);
    }
    expect(await projectSnapshot(page)).toEqual(before);
    await reloadBalanceProject(page, before);
    await expect(page.locator('html')).toHaveAttribute('data-kash-theme', 'light');
    await settingsPage(page, 'appearance', 'theme');
    await expect(page.locator('[data-settings-theme-select]')).toHaveValue('light');
    await openSummary(page, settingsMonth);
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
  });

  test('TC-165 [R] Preferencia de guías, manual y recorrido de Ajustes funcionan sin insertar datos de ejemplo', async ({ page }) => {
    const before = await projectSnapshot(page);
    await settingsPage(page, 'help', 'guides');
    await expect(page.locator('#ks_guides')).not.toBeChecked();
    await page.locator('#ks_guides').locator('..').click();
    await expect(page.locator('#ks_guides')).toBeChecked();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kash_learning_v1')).auto)).toBe(true);
    await page.keyboard.press('F1');
    await expect(page.locator('#kashLearning[data-kind="help"]')).toBeVisible();
    await expect(page.locator('#learnAuto')).toBeChecked();
    await page.locator('#learnAuto').uncheck();
    await page.locator('[data-learn="help-close"]').click();
    await settingsPage(page, 'help', 'guides');
    await expect(page.locator('#ks_guides')).not.toBeChecked();
    await settingsPage(page, 'help', 'manual');
    const topic = page.locator('[data-settings-help-topic]').first();
    const topicId = await topic.getAttribute('data-settings-help-topic'), title = await topic.innerText();
    await topic.click();
    await expect(page.locator('#kashLearning[data-kind="help"]')).toBeVisible();
    await expect(page.locator(`[data-help-topic="${topicId}"]`)).toHaveClass(/learnPrimary/);
    await expect(page.locator('.learnHelpArticle')).toContainText(title);
    await page.locator('[data-learn="help-close"]').click();
    await settingsPage(page, 'help', 'guides');
    await page.locator('[onclick="startKashGuide(\'set\')"]').click();
    await expect(page.locator('#kashLearning[data-kind="tour"]')).toBeVisible();
    await page.locator('[data-learn="tour-close"]').click();
    await expect(page.locator('#kashLearning')).toHaveCount(0);
    expect(await projectSnapshot(page)).toEqual(before);
    await expectBudgetPersisted(page, before);
    await reloadBalanceProject(page, before);
    await settingsPage(page, 'help', 'guides');
    await expect(page.locator('#ks_guides')).not.toBeChecked();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kash_learning_v1')).auto)).toBe(false);
  });

  test('TC-166 [R] Recargar conserva funciones del proyecto y preferencias locales con gastos, cuotas, notas y dos monedas intactos', async ({ page, usdProject: before }) => {
    const choices = { charts: true, converter: false, variation: false, reminders: true, quotas: false };
    for (const [key, on] of Object.entries(choices)) await setVisibleChoice(page, key, on);
    await setOnlinePreference(page, true);
    await setThemePreference(page, 'light');
    const configured = await expectOnlyVisibilityChanged(page, before);
    expect(configured.displayOptions).toMatchObject(choices);
    expect(configured.displayOptions.estimator).toBe(false);
    const afterReload = await reloadBalanceProject(page, configured);
    await openSummary(page, settingsMonth);
    await expectChartsVisible(page, true);
    await expect(page.locator('.quickConverter')).toHaveCount(0);
    await expect(summaryCard(page, 'ARS').locator('.holdingVariation')).toBeHidden();
    await expect(page.locator('#serviceBell')).toBeVisible();
    await expectUnread(page, 0);
    await expect(page.locator('#nav [data-kash-quota-nav]')).toBeHidden();
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
    await expectSummaryCard(page, 'USD', 'USD 100', 'USD 100');
    for (const [key, on] of Object.entries(choices)) {
      await settingsPage(page, 'features', key === 'quotas' ? 'modules' : 'summary');
      await expect(visibleChoice(page, key)).toBeChecked({ checked: on });
    }
    await settingsPage(page, 'features', 'internet');
    await expect(page.locator('#ks_online')).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-kash-theme', 'light');
    expect(await projectSnapshot(page)).toEqual(afterReload);
    expect(afterReload.expenses).toEqual(before.expenses);
    expect(afterReload.cu).toEqual(before.cu);
    expect(afterReload.rec).toEqual(before.rec);
    // La normalización del contador de la próxima ID no modifica los registros existentes.
    await expect.poll(async () => {
      const stored = await readSavedProject(page);
      if (!stored) return null;
      const { nid, ...data } = stored;
      return data;
    }).toEqual((({ nid, ...data }) => data)(afterReload));
  });
});


// Cobertura incorporada para v0.689; los IDs anteriores conservan su significado.
const { test: upgradeTest } = require('../helpers/upgrade-fixture');
upgradeTest.describe('14 · Apariencia nueva · KA$H v0.690', () => {
  upgradeTest.setTimeout(60_000);
  upgradeTest('TC-196 [R] Sistema sigue al SO y una elección manual ignora los cambios del SO', async ({ page }) => {
    const before = await projectSnapshot(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await setThemePreference(page, 'system');
    await expect(page.locator('html')).toHaveAttribute('data-kash-theme', 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-kash-theme', 'dark');
    await expect(page.locator('[data-settings-theme-select]')).toHaveValue('system');
    await setThemePreference(page, 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-kash-theme', 'light');
    expect(await projectSnapshot(page)).toEqual(before);
  });
  upgradeTest('TC-197 [P] Tema en panel contraído permite teclado, selección y Escape con foco restaurado', async ({ page }) => {
    const before = await projectSnapshot(page);
    await page.locator('[onclick="toggleNav()"]').click();
    const button = page.locator('.kashThemeCompactButton');
    await expect(button).toBeVisible();
    await button.focus();
    await page.keyboard.press('Enter');
    const menu = page.locator('#kashThemeMenu');
    await expect(menu).toHaveAttribute('role', 'menu');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Home');
    await expect(menu.locator('[data-kash-theme-mode="light"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveCount(0);
    await expect(button).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('data-kash-theme', 'light');
    await button.press('Enter');
    await expect(menu.locator('[data-kash-theme-mode="light"]')).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('End');
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
    await expect(menu).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-kash-theme-mode', 'light');
    expect(await projectSnapshot(page)).toEqual(before);
    await expectBudgetPersisted(page, before);
  });
});
