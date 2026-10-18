const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot, goTo } = require('../helpers/language');
const { expectBudgetPersisted } = require('../helpers/monthly-budget');
const { setOpeningBalance, reloadBalanceProject } = require('../helpers/balances');
const { addCurrency } = require('../helpers/currencies');
const { createExpense, readSavedProject, expenseRows, expenseRow,
  beginExpenseEdit, fillExpense, saveButton } = require('../helpers/expenses');
const { createExchange } = require('../helpers/currency-exchange');
const { createInstallment, addOwnNote } = require('../helpers/installments-notes');
const { openSummary, expectSummaryCard } = require('../helpers/summary');
const { persistenceTime, persistenceMonth, undoButton, redoButton, savePrompt,
  requestSwitch, openFileChooser, chooseProjectFile, importProject, newEmptyProject,
  historyStep, expectExactProject, expectRestoredProject, expectStoredUnchanged,
  saveBrowserProject } = require('../helpers/project-persistence');

const errorsByPage = new WeakMap();
async function attachTiming(testInfo, name, started, extra = {}) {
  await testInfo.attach(`persistence-${name}-timing`, { body: JSON.stringify({
    setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
    testTimeoutMs: testInfo.timeout, ...extra,
  }), contentType: 'application/json' });
}

const test = base.extend({
  persistenceApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanPersistenceProject: [async ({ page, context, persistenceApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    const origin = new URL(app.url).origin;
    await page.clock.setFixedTime(new Date(persistenceTime));
    await context.addInitScript(value => {
      if (location.origin === value && localStorage.getItem('kash_services_online') === null)
        localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await base.step('Inicio limpio: idioma inglés, wizard vacío y guías desactivadas desde F1', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
      await createLanguageProject(page);
      const project = await projectSnapshot(page);
      expect(project.inicio).toBe(persistenceMonth);
      expect(project.expenses).toEqual([]);
      expect(project.C).toEqual({});
      expect(project.recConfig).toEqual({});
      await expectExactProject(page, project);
    });
    page.setDefaultTimeout(5_000);
    await attachTiming(testInfo, 'setup', started, { freshProject: true, fixedTime: persistenceTime });
    await use();
  }, { auto: true, timeout: 60_000 }],
  openingProject: [async ({ page, cleanPersistenceProject }, use, testInfo) => {
    const started = Date.now();
    await setOpeningBalance(page, 'ARS', '1000');
    await attachTiming(testInfo, 'opening', started);
    await use(await projectSnapshot(page));
  }, { timeout: 60_000 }],
  sampleProject: [async ({ page, openingProject }, use, testInfo) => {
    const started = Date.now();
    await createExpense(page, { description: 'Café & Facturas! <b>QA</b>', amount: '25', paid: true,
      note: 'Nota propia — Save / Guardar', month: persistenceMonth });
    await createExpense(page, { description: 'Pendiente ARS', amount: '75', paid: false, month: persistenceMonth });
    await openSummary(page, persistenceMonth);
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
    await attachTiming(testInfo, 'data', started);
    await use(await projectSnapshot(page));
  }, { timeout: 60_000 }],
  mixedProject: [async ({ page, sampleProject }, use, testInfo) => {
    const started = Date.now();
    await addCurrency(page, 'USD');
    await setOpeningBalance(page, 'USD', '100');
    await createExpense(page, { currency: 'USD', description: 'Compra USD', amount: '10.25', paid: true,
      month: persistenceMonth, note: 'USD no convertido' });
    await createExchange(page, { from: 'USD', to: 'ARS', amount: '5', rate: '10', fee: '0.5',
      month: persistenceMonth, note: 'Cambio & comisión' });
    await createInstallment(page, { description: 'Notebook QA', total: 3 });
    await addOwnNote(page, 'Recordatorio propio & <b>literal</b>');
    await openSummary(page, persistenceMonth);
    await expectSummaryCard(page, 'ARS', 'ARS 1,025', 'ARS 950');
    await expectSummaryCard(page, 'USD', 'USD 84.25', 'USD 84.25');
    await attachTiming(testInfo, 'mixed', started);
    await use(await projectSnapshot(page));
  }, { timeout: 60_000 }],
  twoProjects: [async ({ page, mixedProject: first }, use, testInfo) => {
    const started = Date.now();
    await newEmptyProject(page, 'Proyecto B — Café & Ahorros');
    await setOpeningBalance(page, 'ARS', '2000');
    await createExpense(page, { description: 'Sólo proyecto B', amount: '20', paid: true,
      month: persistenceMonth, note: 'No mezclar con A' });
    await createExpense(page, { description: 'Pendiente B', amount: '30', paid: false, month: persistenceMonth });
    await attachTiming(testInfo, 'second-project', started);
    await use({ first, second: await projectSnapshot(page) });
  }, { timeout: 60_000 }],
});

test.use({ storageState: { cookies: [], origins: [] }, timezoneId: 'America/Argentina/Buenos_Aires' });
test.describe('16 · Guardado, proyectos y deshacer · KA$H v0.677', () => {
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', { body: JSON.stringify(errors), contentType: 'application/json' });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const diagnostic = await page.evaluate(() => {
        let stored;
        try { stored = JSON.parse(localStorage.getItem('kash') || 'null'); } catch { stored = 'invalid JSON'; }
        return { url: location.href, project: typeof window.KASHGetProjectJson === 'function'
          ? JSON.parse(window.KASHGetProjectJson()) : null, stored,
          dirty: window.KASHHasUnsavedChanges?.(), status: document.querySelector('#st')?.textContent,
          modal: document.querySelector('#darkModal')?.innerText,
          wizard: document.querySelector('#kashLearning')?.dataset.kind,
          undoDisabled: document.querySelector('#nav [onclick="undoChange()"]')?.disabled,
          redoDisabled: document.querySelector('#nav [onclick="redoChange()"]')?.disabled };
      }).catch(error => ({ diagnosticError: error.message }));
      await testInfo.attach('persistence-diagnostic', { body: JSON.stringify(diagnostic, null, 2), contentType: 'application/json' });
    }
  });

  test('TC-177 [P] Autoguardado, Guardar y Guardar como conservan el proyecto completo en la sesión web', async ({ page, mixedProject: before }) => {
    const stored = await readSavedProject(page);
    expect(stored).toEqual(before);
    expect(JSON.parse(JSON.stringify(before))).toEqual(before);
    for (const as of [false, true, false]) {
      await saveBrowserProject(page, as);
      await expectExactProject(page, before);
    }
    expect(before.expenses).toHaveLength(3);
    expect(before.fx).toHaveLength(1);
    expect(before.cu).toHaveLength(1);
    expect(before.rec).toHaveLength(1);
    await openSummary(page, persistenceMonth);
    await expectSummaryCard(page, 'ARS', 'ARS 1,025', 'ARS 950');
    await expectSummaryCard(page, 'USD', 'USD 84.25', 'USD 84.25');
    await expectExactProject(page, before);
  });

  test('TC-178 [R] Recargar reanuda el proyecto con monedas, pagos, notas, cuotas y divisas sin datos agregados', async ({ page, mixedProject: before }) => {
    const after = await reloadBalanceProject(page, before);
    await expect(page.locator('#kashLanguageDialog')).toHaveCount(0);
    await expect(page.locator('#kashLearning')).toHaveCount(0);
    expect(after.recConfig).toEqual({});
    expect(after.recMonthly).toEqual({});
    await openSummary(page, persistenceMonth);
    await expectSummaryCard(page, 'ARS', 'ARS 1,025', 'ARS 950');
    await expectSummaryCard(page, 'USD', 'USD 84.25', 'USD 84.25');
    await goTo(page, 'gastos');
    await expect(expenseRows(page, 'ARS')).toHaveCount(2);
    await expect(expenseRows(page, 'USD')).toHaveCount(1);
    await expect(expenseRow(page, 'ARS', before.expenses[0].c).locator('.noteCell')).toHaveText(before.expenses[0].n);
    await expect(expenseRow(page, 'ARS', before.expenses[0].c).locator('.expensePaidCell input')).toBeChecked();
    // La carga normaliza nid en memoria; Guardar persiste ese contador sin tocar los registros.
    await saveBrowserProject(page);
    await expectExactProject(page, after);
  });

  test('TC-179 [P] Abrir el mismo proyecto como JSON y KASH conserva IDs y no duplica registros', async ({ page, mixedProject: before }) => {
    for (const name of ['QA — Café & Ahorros.json', 'QA-reabierto.kash']) {
      const imported = await importProject(page, before, name);
      expect(imported.expenses.map(item => item.id)).toEqual(before.expenses.map(item => item.id));
      expect(imported.expenses).toHaveLength(3);
      await expectSummaryCard(page, 'ARS', 'ARS 1,025', 'ARS 950');
      await expectSummaryCard(page, 'USD', 'USD 84.25', 'USD 84.25');
      await expectExactProject(page, imported);
    }
  });

  test('TC-180 [N] Archivos corruptos, esquema inválido y extensión no permitida no reemplazan el proyecto', async ({ page, sampleProject: before }) => {
    const invalidFiles = [
      { name: 'truncado.kash', content: '{"rub":[', error: /Could not open file/ },
      { name: 'array.json', content: '[]', error: /valid KASH project/ },
      { name: 'sin-servicios.kash', content: '{"inicio":"2026-10"}', error: /valid KASH project/ },
      { name: 'sin-inicio.json', content: '{"rub":[]}', error: /valid KASH project/ },
      { name: 'no-proyecto.txt', content: before, error: /valid .kash or .json/ },
    ];
    for (const file of invalidFiles) {
      await chooseProjectFile(page, file);
      await expect(page.locator('#darkModal .darkModalTitle')).toHaveText('Could not open project');
      await expect(page.locator('#darkModal .darkModalText')).toContainText(file.error);
      await expectExactProject(page, before);
      await expect(undoButton(page)).toBeEnabled();
      await page.locator('#darkOk').click();
      await expect(page.locator('#darkModal')).toHaveCount(0);
    }
    await openSummary(page, persistenceMonth);
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
  });

  test('TC-181 [N] Cancelar el selector de archivo conserva proyecto, sesión e historial', async ({ page, sampleProject: before }) => {
    const chooser = await openFileChooser(page);
    await chooser.setFiles([]);
    await expect(page.locator('#kash-browser-open')).toHaveValue('');
    await expect(page.locator('#darkModal')).toHaveCount(0);
    await expect(page.locator('#kashLearning')).toHaveCount(0);
    await expectExactProject(page, before);
    await expect(undoButton(page)).toBeEnabled();
    await expect(redoButton(page)).toBeDisabled();
    await openSummary(page, persistenceMonth);
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 900');
  });

  test('TC-182 [N] Cancelar o Escape en cambios pendientes impide Nuevo y Abrir sin perder datos', async ({ page, sampleProject: before }) => {
    for (const [action, mode] of [['new', 'button'], ['new', 'Escape'], ['open', 'button'], ['open', 'Escape']]) {
      await requestSwitch(page, action);
      if (mode === 'Escape') await page.keyboard.press('Escape');
      else await page.locator('#darkCancel').click();
      await expect(savePrompt(page)).toHaveCount(0);
      await expect(page.locator('#kashLearning')).toHaveCount(0);
      await expectExactProject(page, before);
      await expect(undoButton(page)).toBeEnabled();
    }
    await goTo(page, 'gastos');
    await expect(expenseRows(page)).toHaveCount(2);
  });

  test('TC-183 [R] Nuevo tras descartar crea proyecto vacío sin heredar monedas, saldos, registros ni deshacer', async ({ page, mixedProject: before }) => {
    const after = await newEmptyProject(page, 'Nuevo — Café & Ahorros <b>QA</b>');
    expect(after.name).not.toBe(before.name);
    expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBe('en');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kash_learning_v1')).auto)).toBe(false);
    await expectSummaryCard(page, 'ARS', 'ARS 0', 'ARS 0');
    await page.locator('#v h2').first().click();
    await page.keyboard.press('Control+z');
    await expectExactProject(page, after);
    await expect(redoButton(page)).toBeDisabled();
    await reloadBalanceProject(page, after);
    await expectSummaryCard(page, 'ARS', 'ARS 0', 'ARS 0');
  });

  test('TC-184 [R] Alternar proyectos A y B abre cada copia completa y reinicia el historial sin mezclar datos', async ({ page, twoProjects: { first, second } }) => {
    const firstOpened = await importProject(page, first, 'Proyecto-A.kash');
    await expectSummaryCard(page, 'ARS', 'ARS 1,025', 'ARS 950');
    await expectSummaryCard(page, 'USD', 'USD 84.25', 'USD 84.25');
    const secondOpened = await importProject(page, second, 'Proyecto-B.json');
    expect(secondOpened.enabledCurrencies).toEqual(['ARS']);
    expect(secondOpened.fx).toEqual([]);
    expect(secondOpened.cu).toEqual([]);
    expect(secondOpened.rec).toEqual([]);
    expect(secondOpened.expenses.map(item => item.c)).toEqual(['Sólo proyecto B', 'Pendiente B']);
    await expectSummaryCard(page, 'ARS', 'ARS 1,980', 'ARS 1,950');
    await page.locator('#v h2').first().click();
    await page.keyboard.press('Control+z');
    await expectExactProject(page, secondOpened);
    await expect(redoButton(page)).toBeDisabled();
    const firstAgain = await importProject(page, firstOpened, 'Proyecto-A-otra-vez.kash');
    expect(firstAgain.expenses).toEqual(first.expenses);
    await reloadBalanceProject(page, firstAgain);
    await expectSummaryCard(page, 'ARS', 'ARS 1,025', 'ARS 950');
    await expectSummaryCard(page, 'USD', 'USD 84.25', 'USD 84.25');
  });

  test('TC-185 [R] Deshacer y rehacer creación y edición restaura cada estado completo, pagos y saldos', async ({ page, openingProject: initial }) => {
    const first = await createExpense(page, { description: 'Paso A', amount: '25', paid: true, month: persistenceMonth });
    const state1 = await projectSnapshot(page);
    const second = await createExpense(page, { description: 'Paso B', amount: '75', paid: false,
      note: 'Nota original B', month: persistenceMonth });
    const state2 = await projectSnapshot(page);
    await beginExpenseEdit(page, 'ARS', second.c);
    await fillExpense(page, { description: 'Paso B editado', amount: '125', paid: true,
      note: 'Nota editada & Café', month: persistenceMonth });
    await saveButton(page).click();
    const state3 = await projectSnapshot(page);
    expect(state3.expenses).toEqual([first, { ...second, c: 'Paso B editado', a: 125, paid: true, n: 'Nota editada & Café' }]);
    await expectBudgetPersisted(page, state3);
    const stages = [
      ['undo', state2, 'ARS 975', 'ARS 900'], ['undo', state1, 'ARS 975', 'ARS 975'],
      ['undo', initial, 'ARS 1,000', 'ARS 1,000'],
      ['redo', state1, 'ARS 975', 'ARS 975'], ['redo', state2, 'ARS 975', 'ARS 900'],
      ['redo', state3, 'ARS 850', 'ARS 850'],
    ];
    for (const [kind, expected, calculated, projected] of stages) {
      await historyStep(page, kind, expected);
      await openSummary(page, persistenceMonth);
      await expectSummaryCard(page, 'ARS', calculated, projected);
    }
    await expect(redoButton(page)).toBeDisabled();
    const final = await expectRestoredProject(page, state3);
    await reloadBalanceProject(page, final);
    await expectSummaryCard(page, 'ARS', 'ARS 850', 'ARS 850');
  });

  test('TC-186 [E] Atajos deshacen y rehacen; una acción nueva invalida rehacer y editar texto no deshace el proyecto', async ({ page, openingProject }) => {
    await createExpense(page, { description: 'A conservado', amount: '10', paid: true, month: persistenceMonth });
    const stateA = await projectSnapshot(page);
    await createExpense(page, { description: 'B descartable', amount: '20', paid: false, month: persistenceMonth });
    const stateB = await projectSnapshot(page);
    await historyStep(page, 'undo', stateA, 'Control+z');
    await historyStep(page, 'redo', stateB, 'Control+Shift+z');
    await historyStep(page, 'undo', stateA, 'Control+z');
    await historyStep(page, 'redo', stateB, 'Control+y');
    await historyStep(page, 'undo', stateA, 'Control+z');
    await createExpense(page, { description: 'C nueva rama', amount: '5', paid: true, month: persistenceMonth });
    const branch = await projectSnapshot(page);
    expect(branch.expenses.map(item => item.c)).toEqual(['A conservado', 'C nueva rama']);
    await expect(redoButton(page)).toBeDisabled();
    await openSummary(page, persistenceMonth);
    await expectSummaryCard(page, 'ARS', 'ARS 985', 'ARS 985');
    await page.locator('#v h2').first().click();
    await page.keyboard.press('Control+y');
    await expectExactProject(page, branch);
    await goTo(page, 'gastos');
    await page.locator('#ec_ARS').fill('Borrador no registrado');
    await page.locator('#ec_ARS').press('End');
    await page.keyboard.type(' temporal');
    await page.locator('#ec_ARS').press('Control+z');
    await expectExactProject(page, branch);
    await expectStoredUnchanged(page, branch);
    await expect(expenseRows(page)).toHaveCount(2);
    await expect(redoButton(page)).toBeDisabled();
  });
});
