const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot } = require('../helpers/language');
const { addCurrency } = require('../helpers/currencies');
const { createExpense, openExpenses, expenseSection, saveButton, expectMonthlyTotals } = require('../helpers/expenses');
const {
  setMonthlyRepeat, createRecurringExpense, selectOccurrence, beginRecurringEdit,
  editRecurringExpense, markOccurrencePaid, openStopRecurrence, setRecurrenceStopMonth,
  expectRecurrenceEntries, expectRecurringStatePersisted, expectRecurringProjectUnchanged,
  expectStableRecurringReload,
} = require('../helpers/recurring-expenses');

const errorsByPage = new WeakMap();
const test = base.extend({
  recurringApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanRecurringProject: [async ({ page, context, recurringApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    const origin = new URL(app.url).origin;
    await context.addInitScript(value => {
      if (location.origin === value) localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await base.step('Preparación: primer inicio limpio, idioma y bienvenida por UI', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
      await createLanguageProject(page);
      await openExpenses(page);
      const project = await projectSnapshot(page);
      expect(project.expenses).toEqual([]);
      expect(project.expenseRecurrences).toEqual([]);
      await expectRecurringStatePersisted(page, project);
    });
    page.setDefaultTimeout(5_000);
    await testInfo.attach('recurring-expenses-setup-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, freshProject: true }), contentType: 'application/json',
    });
    await use();
  }, { auto: true, timeout: 60_000 }],
});

// Fechas del año de prueba, independientes del mes en que se ejecute la suite.
// Las expectativas enumeran meses concretos; no se invoca el generador de la app.
async function testYear(page) { return (await page.locator('#ef_ARS').inputValue()).slice(0, 4); }
const entry = (f, c, { m = 'ARS', a = 10.25, n = 'Nota de la serie', paid = false,
  generated = true, edited = false } = {}) => ({
  f, m, c, a, n, paid, recurrenceGenerated: generated, recurrenceEdited: edited,
});
const occurrence = (project, seriesId, month) => project.expenses.find(e => e.recurrenceId === seriesId && e.f === month);

test.use({ storageState: { cookies: [], origins: [] } });
test.describe('06 · Gastos recurrentes · KA$H v0.690', () => {
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', {
      body: JSON.stringify(errors), contentType: 'application/json',
    });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const state = await page.evaluate(() => ({
        project: typeof window.KASHGetProjectJson === 'function' ? JSON.parse(window.KASHGetProjectJson()) : null,
        persisted: JSON.parse(localStorage.getItem('kash') || 'null'),
        filters: Object.fromEntries(['expenseSearch', 'expensePeriodFilter', 'expenseCurrencyFilter']
          .map(id => [id, document.getElementById(id)?.value ?? null])),
        stopMonth: document.getElementById('recurrenceStopMonth')?.value,
        modal: document.getElementById('kashFeatureModal')?.textContent
          ?? document.getElementById('darkModal')?.textContent ?? null,
      }));
      await testInfo.attach('recurring-expenses-diagnostic', {
        body: JSON.stringify(state, null, 2), contentType: 'application/json',
      });
    }
  });

  test('TC-065 [P] Repetición desactivada crea sólo el gasto elegido sin series ni meses futuros', async ({ page }) => {
    const year = await testYear(page);
    await expect(page.locator('#erepeat_ARS')).not.toBeChecked();
    await expect(page.locator('#erepeat_options_ARS')).toBeHidden();
    await setMonthlyRepeat(page, 'ARS', true);
    await expect(page.locator('#erepeat_options_ARS')).toBeVisible();
    await setMonthlyRepeat(page, 'ARS', false);
    const original = await createExpense(page, { description: 'Gasto único', amount: '10.25', month: `${year}-10` });
    const project = await projectSnapshot(page);
    expect(project.expenseRecurrences).toEqual([]);
    expect(project.expenses).toEqual([original]);
    expect(original.recurrenceId).toBeUndefined();
    await expectRecurringStatePersisted(page, project);
    for (const month of [`${year}-11`, `${year}-12`]) {
      await expectMonthlyTotals(page, { month, expenses: 'ARS 0' });
    }
  });

  test('TC-066 [P] Crear copias pendientes hasta diciembre aunque el gasto inicial esté pagado', async ({ page }) => {
    const year = await testYear(page), c = 'Café & suscripción <b>mensual</b>', n = 'Nota de la serie';
    const { source, series } = await createRecurringExpense(page, {
      description: c, amount: '10.25', note: n, paid: true, month: `${year}-10`,
    });
    await expectRecurrenceEntries(page, series.id, [
      entry(`${year}-10`, c, { paid: true, generated: false }),
      entry(`${year}-11`, c), entry(`${year}-12`, c),
    ]);
    const project = await projectSnapshot(page);
    expect(project.expenseRecurrences).toHaveLength(1);
    expect(series).toMatchObject({ c, a: 10.25, n, stopFrom: null, skipped: [] });
    expect(occurrence(project, series.id, `${year}-10`).id).toBe(source.id);
    for (const month of [`${year}-10`, `${year}-11`, `${year}-12`]) {
      const row = await selectOccurrence(page, occurrence(project, series.id, month));
      await expect(row.locator('.expenseConceptText')).toHaveText(c);
      await expect(row.locator('.expenseConceptText b')).toHaveCount(0);
      await expect(row.locator('.expenseRecurringBadge')).toHaveText('↻ Recurring');
      await expect(row.locator('.noteCell')).toHaveText(n);
      if (month === `${year}-10`) await expect(row.locator('.expensePaidCell input')).toBeChecked();
      else await expect(row.locator('.expensePaidCell input')).not.toBeChecked();
      await expectMonthlyTotals(page, { month, expenses: 'ARS 10.25' });
    }
  });

  test('TC-067 [B] Iniciar en diciembre respeta el límite anual y separa series ARS y USD idénticas', async ({ page }) => {
    const year = await testYear(page), c = 'Mismo servicio', month = `${year}-12`;
    await addCurrency(page, 'USD');
    const ars = await createRecurringExpense(page, { description: c, amount: '10.25', note: 'Nota de la serie', month });
    const usd = await createRecurringExpense(page, { currency: 'USD', description: c, amount: '10.25', note: 'Nota de la serie', month });
    expect(ars.series.id).not.toBe(usd.series.id);
    await expectRecurrenceEntries(page, ars.series.id, [entry(month, c, { generated: false })]);
    await expectRecurrenceEntries(page, usd.series.id, [entry(month, c, { m: 'USD', generated: false })]);
    const project = await projectSnapshot(page);
    expect(project.expenses).toHaveLength(2);
    expect(project.expenseRecurrences).toHaveLength(2);
    expect(project.expenses.some(e => e.f === `${Number(year) + 1}-01`)).toBe(false);
    for (const currency of ['ARS', 'USD']) {
      await expectMonthlyTotals(page, { currency, month, expenses: `${currency} 10.25` });
      await expectMonthlyTotals(page, { currency, month: `${Number(year) + 1}-01`, expenses: `${currency} 0` });
    }
  });

  test('TC-068 [P] Editar sólo una repetición conserva la plantilla, los otros meses y todos los IDs', async ({ page }) => {
    const year = await testYear(page), c = 'Suscripción individual';
    const { series } = await createRecurringExpense(page, { description: c, amount: '10.25', note: 'Nota de la serie', month: `${year}-10` });
    const before = await projectSnapshot(page), target = occurrence(before, series.id, `${year}-11`);
    await editRecurringExpense(page, target, { amount: '25.75', note: 'Excepción de noviembre', scope: 'one' });
    const after = await projectSnapshot(page);
    expect(after.expenses).toEqual(before.expenses.map(e => e.id === target.id
      ? { ...e, a: 25.75, n: 'Excepción de noviembre', recurrenceEdited: true } : e));
    expect(after.expenseRecurrences).toEqual(before.expenseRecurrences);
    await expectRecurrenceEntries(page, series.id, [
      entry(`${year}-10`, c, { generated: false }),
      entry(`${year}-11`, c, { a: 25.75, n: 'Excepción de noviembre', edited: true }),
      entry(`${year}-12`, c),
    ]);
    await expectMonthlyTotals(page, { month: `${year}-11`, expenses: 'ARS 25.75' });
    await expectMonthlyTotals(page, { month: `${year}-12`, expenses: 'ARS 10.25' });
  });

  test('TC-069 [R] Editar este y siguientes actualiza pendientes sin tocar anteriores, pagados ni excepciones', async ({ page }) => {
    const year = await testYear(page), c = 'Serie con excepciones';
    const { series } = await createRecurringExpense(page, { description: c, amount: '10.25', note: 'Nota de la serie', month: `${year}-08` });
    let project = await projectSnapshot(page);
    await markOccurrencePaid(page, occurrence(project, series.id, `${year}-11`));
    await editRecurringExpense(page, occurrence(project, series.id, `${year}-12`), { amount: '99.75', note: 'Importe particular' });
    const before = await projectSnapshot(page);
    await editRecurringExpense(page, occurrence(before, series.id, `${year}-09`), {
      amount: '20.50', note: 'Nueva tarifa', scope: 'future',
    });
    const after = await projectSnapshot(page);
    expect(after.expenses).toEqual(before.expenses.map(e => [`${year}-09`, `${year}-10`].includes(e.f)
      ? { ...e, a: 20.5, n: 'Nueva tarifa' } : e));
    expect(after.expenseRecurrences).toEqual(before.expenseRecurrences.map(s =>
      ({ ...s, a: 20.5, n: 'Nueva tarifa' })));
    await expectRecurrenceEntries(page, series.id, [
      entry(`${year}-08`, c, { generated: false }),
      entry(`${year}-09`, c, { a: 20.5, n: 'Nueva tarifa' }),
      entry(`${year}-10`, c, { a: 20.5, n: 'Nueva tarifa' }),
      entry(`${year}-11`, c, { paid: true }),
      entry(`${year}-12`, c, { a: 99.75, n: 'Importe particular', edited: true }),
    ]);
    for (const [month, total] of [['09', '20.5'], ['10', '20.5'], ['11', '10.25'], ['12', '99.75']]) {
      await expectMonthlyTotals(page, { month: `${year}-${month}`, expenses: `ARS ${total}` });
    }
  });

  test('TC-070 [R] Detener exige mes válido y confirmación; conserva histórico, pagos y excepciones', async ({ page }) => {
    const year = await testYear(page), c = 'Detener con cuidado';
    const { source, series } = await createRecurringExpense(page, { description: c, amount: '10.25', note: 'Nota de la serie', month: `${year}-08` });
    let project = await projectSnapshot(page);
    await markOccurrencePaid(page, occurrence(project, series.id, `${year}-10`));
    await editRecurringExpense(page, occurrence(project, series.id, `${year}-11`), { amount: '99.75', note: 'Excepción conservada' });
    const before = await projectSnapshot(page);
    // Apagar el switch y guardar abre la confirmación; cancelar no detiene la serie.
    await beginRecurringEdit(page, source);
    await setMonthlyRepeat(page, 'ARS', false);
    await saveButton(page).click();
    await expect(page.locator('#kashFeatureTitle')).toHaveText('Stop repeating');
    await page.locator('#kashFeatureModal [data-feature-cancel]').click();
    await expectRecurringProjectUnchanged(page, before);
    await expenseSection(page).locator('[onclick="cancelExpense()"]').click();
    await openStopRecurrence(page, source);
    for (const invalid of ['', `${year}-07`]) {
      await setRecurrenceStopMonth(page, invalid);
      await expect(page.locator('#recurrenceStopApply')).toBeDisabled();
      await expectRecurringProjectUnchanged(page, before);
    }
    await setRecurrenceStopMonth(page, `${year}-09`);
    await expect(page.locator('#recurrenceStopPreview b')).toHaveText('2 pending repetitions will be removed');
    await expect(page.locator('#recurrenceStopApply')).toBeEnabled();
    await page.locator('#recurrenceStopApply').click();
    await expect(page.locator('#kashFeatureModal')).toHaveCount(0);
    const after = await projectSnapshot(page);
    expect(after.expenses).toEqual(before.expenses.filter(e => ![`${year}-09`, `${year}-12`].includes(e.f)));
    expect(after.expenseRecurrences).toEqual(before.expenseRecurrences.map(s => ({ ...s, on: false, stopFrom: `${year}-09` })));
    await expectRecurringStatePersisted(page, after);
    const row = await selectOccurrence(page, source);
    await expect(row.locator('.expenseRecurringBadge')).toHaveText('↻ Recurrence stopped');
    for (const month of [`${year}-09`, `${year}-12`]) await expectMonthlyTotals(page, { month, expenses: 'ARS 0' });
    await expectMonthlyTotals(page, { month: `${year}-10`, expenses: 'ARS 10.25' });
    await expectMonthlyTotals(page, { month: `${year}-11`, expenses: 'ARS 99.75' });
  });

  test('TC-071 [R] Borrar un mes conserva la serie y no regenera esa repetición al volver a guardar', async ({ page }) => {
    const year = await testYear(page), c = 'Borrar un mes';
    const { source, series } = await createRecurringExpense(page, { description: c, amount: '10.25', note: 'Nota de la serie', month: `${year}-10` });
    const before = await projectSnapshot(page), target = occurrence(before, series.id, `${year}-11`);
    let row = await selectOccurrence(page, target);
    await row.locator('.trashbtn').click();
    await expect(page.locator('#darkModal .darkModalText')).toContainText("Only this month's entry is deleted; other repetitions are kept.");
    await page.locator('#darkCancel').click();
    await expectRecurringProjectUnchanged(page, before);
    row = await selectOccurrence(page, target);
    await row.locator('.trashbtn').click();
    await page.locator('#darkOk').click();
    await expect(page.locator('#darkModal')).toHaveCount(0);
    const deleted = await projectSnapshot(page);
    expect(deleted.expenses).toEqual(before.expenses.filter(e => e.id !== target.id));
    expect(deleted.expenseRecurrences).toEqual(before.expenseRecurrences.map(s => ({ ...s, skipped: [`${year}-11`] })));
    await expectRecurringStatePersisted(page, deleted);
    await beginRecurringEdit(page, source);
    await saveButton(page).click();
    const saved = await projectSnapshot(page);
    expect(saved.expenses).toEqual(deleted.expenses);
    expect(saved.expenseRecurrences).toEqual(deleted.expenseRecurrences);
    await expectRecurringStatePersisted(page, saved);
    await expectMonthlyTotals(page, { month: `${year}-11`, expenses: 'ARS 0' });
    await expectMonthlyTotals(page, { month: `${year}-12`, expenses: 'ARS 10.25' });
  });

  test('TC-072 [N] Rechazar mover una repetición a un mes ocupado sin alterar datos ni IDs', async ({ page }) => {
    const year = await testYear(page), c = 'No duplicar el mes';
    const { series } = await createRecurringExpense(page, { description: c, amount: '10.25', note: 'Nota de la serie', month: `${year}-10` });
    const before = await projectSnapshot(page), target = occurrence(before, series.id, `${year}-11`);
    await beginRecurringEdit(page, target);
    await page.locator('#ef_ARS').fill(`${year}-12`);
    await saveButton(page).click();
    await expect(page.locator('#darkModal .darkModalTitle')).toHaveText('Month already has an entry');
    await expect(page.locator('#darkModal .darkModalText'))
      .toHaveText('A repetition of this expense already exists in the selected month. Edit that entry or choose another month.');
    await expectRecurringProjectUnchanged(page, before);
    await page.locator('#darkOk').click();
    await expenseSection(page).locator('[onclick="cancelExpense()"]').click();
    await expectRecurringProjectUnchanged(page, before);
  });

  test('TC-073 [R] Recargar y reactivar conserva la serie original sin duplicar gastos ni perder pagos', async ({ page }) => {
    const year = await testYear(page), c = 'Reactivar y persistir';
    const { source, series } = await createRecurringExpense(page, { description: c, amount: '10.25', note: 'Nota de la serie', paid: true, month: `${year}-10` });
    await openStopRecurrence(page, source);
    await setRecurrenceStopMonth(page, `${year}-11`);
    await expect(page.locator('#recurrenceStopPreview b')).toHaveText('2 pending repetitions will be removed');
    await page.locator('#recurrenceStopApply').click();
    const stopped = await projectSnapshot(page);
    expect(stopped.expenses).toEqual([source]);
    expect(stopped.expenseRecurrences).toEqual([{ ...series, on: false, stopFrom: `${year}-11` }]);
    await expectRecurringStatePersisted(page, stopped);
    await expectStableRecurringReload(page, stopped);
    const row = await selectOccurrence(page, source);
    await row.locator('.expenseRecurringBadge').click();
    await expect(page.locator('#kashFeatureTitle')).toHaveText('Recurrence stopped');
    await page.locator('#recurrenceEdit').click();
    await expect(page.locator('#erepeat_ARS')).not.toBeChecked();
    await setMonthlyRepeat(page, 'ARS', true);
    await saveButton(page).click();
    const restarted = await projectSnapshot(page);
    expect(restarted.expenseRecurrences).toEqual([series]);
    expect(occurrence(restarted, series.id, source.f)).toEqual(source);
    await expectRecurrenceEntries(page, series.id, [
      entry(`${year}-10`, c, { generated: false, paid: true }), entry(`${year}-11`, c), entry(`${year}-12`, c),
    ]);
    const afterReload = await expectStableRecurringReload(page, restarted);
    expect(afterReload.expenses.map(e => e.id)).toEqual(restarted.expenses.map(e => e.id));
    expect(afterReload.expenses).toHaveLength(3);
    expect(afterReload.expenseRecurrences).toHaveLength(1);
    await expectMonthlyTotals(page, { month: `${year}-11`, expenses: 'ARS 10.25' });
    await expectMonthlyTotals(page, { month: `${year}-12`, expenses: 'ARS 10.25' });
  });
});
