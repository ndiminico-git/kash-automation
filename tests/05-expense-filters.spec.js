const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot, goTo } = require('../helpers/language');
const { addCurrency, deactivateCurrency, expectActiveCurrencies } = require('../helpers/currencies');
const {
  createExpense, openExpenses, expenseRows, expenseRow, expenseSection, saveButton,
  beginExpenseEdit, expectPersistedExpenses, expectMonthlyTotals, nextMonth,
} = require('../helpers/expenses');
const {
  visibleExpenseRows, setExpenseFilters, expectFilteredExpenses,
  expectFilteringReadOnly, filterOptionValues,
} = require('../helpers/expense-filters');

const errorsByPage = new WeakMap();
const test = base.extend({
  filtersApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanFilterProject: [async ({ page, context, filtersApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    const origin = new URL(app.url).origin;
    await context.addInitScript(value => {
      if (location.origin === value) localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await base.step('Preparación: instalación limpia, idioma y wizard por UI', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
      await createLanguageProject(page);
      await openExpenses(page);
      await expect(visibleExpenseRows(page)).toHaveCount(0);
      await expectPersistedExpenses(page, []);
    });
    page.setDefaultTimeout(5_000);
    await testInfo.attach('expense-filters-setup-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, freshProject: true }), contentType: 'application/json',
    });
    await use();
  }, { auto: true, timeout: 60_000 }],
});

test.use({ storageState: { cookies: [], origins: [] } });
test.describe('05 · Búsqueda y filtros de Gastos · KA$H v0.677', () => {
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', {
      body: JSON.stringify(errors), contentType: 'application/json',
    });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const state = await page.evaluate(() => ({
        filters: Object.fromEntries(['expenseSearch', 'expensePeriodFilter', 'expenseCurrencyFilter']
          .map(id => [id, document.getElementById(id)?.value ?? null])),
        summary: document.getElementById('expenseFilterSummary')?.textContent ?? null,
        visibleConcepts: [...document.querySelectorAll('.expenseConceptText')]
          .filter(el => el.getClientRects().length).map(el => el.textContent),
        project: typeof window.KASHGetProjectJson === 'function'
          ? JSON.parse(window.KASHGetProjectJson()) : null,
      }));
      await testInfo.attach('expense-filters-diagnostic', {
        body: JSON.stringify(state, null, 2), contentType: 'application/json',
      });
    }
  });

  test('TC-055 [P] Iniciar filtros vacíos con cero resultados y sin crear datos', async ({ page }) => {
    const before = await projectSnapshot(page);
    await expect(page.locator('#expenseSearch')).toHaveValue('');
    expect(await filterOptionValues(page, 'expensePeriodFilter')).toEqual(['']);
    expect(await filterOptionValues(page, 'expenseCurrencyFilter')).toEqual(['', 'ARS']);
    await expect(page.locator('#expensePeriodFilter option').first()).toHaveText('All periods');
    await expect(page.locator('#expenseCurrencyFilter option').first()).toHaveText('All currencies');
    await expectFilteredExpenses(page, { descriptions: [], totals: { ARS: 'ARS 0' } });
    await setExpenseFilters(page, { query: 'Nada cargado', currency: 'ARS' });
    await expectFilteredExpenses(page, { descriptions: [], totals: { ARS: 'ARS 0' } });
    await expect(expenseSection(page).locator('.expenseNoMatch')).toBeVisible();
    await expect(expenseSection(page).locator('.expenseNoMatch'))
      .toHaveText('No expenses match these filters.');
    await expectFilteringReadOnly(page, before);
  });

  test('TC-056 [P] Buscar coincidencias parciales sin distinguir mayúsculas ni buscar en notas', async ({ page }) => {
    await createExpense(page, { description: 'Netflix mensual', amount: '10.25', paid: true });
    await createExpense(page, { description: 'Plan NETFLIX familiar', amount: '20.50' });
    await createExpense(page, { description: 'Internet hogar', amount: '99', note: 'Netflix figura sólo en esta nota' });
    const before = await projectSnapshot(page);
    for (const query of ['netFL', 'NETFLIX']) {
      await setExpenseFilters(page, { query });
      await expectFilteredExpenses(page, {
        descriptions: ['Netflix mensual', 'Plan NETFLIX familiar'], totals: { ARS: 'ARS 30.75' },
      });
      await expect(expenseRow(page, 'ARS', 'Internet hogar')).toBeHidden();
    }
    await expect(expenseRows(page)).toHaveCount(3); // Ocultar no significa borrar.
    await expectFilteringReadOnly(page, before);
  });

  test('TC-057 [B] Buscar con tildes, ñ y espacios externos manteniendo el texto original', async ({ page }) => {
    const description = 'Café de mañana';
    await createExpense(page, { description, amount: '15.25' });
    await createExpense(page, { description: 'Panadería', amount: '40' });
    const before = await projectSnapshot(page);
    for (const query of ['  CAFE  ', 'mañana', 'MANANA']) {
      await setExpenseFilters(page, { query });
      await expectFilteredExpenses(page, { descriptions: [description], totals: { ARS: 'ARS 15.25' } });
      await expect(expenseRow(page, 'ARS', description).locator('.expenseConceptText')).toHaveText(description);
    }
    await setExpenseFilters(page, { query: '   ' });
    await expectFilteredExpenses(page, { descriptions: [description, 'Panadería'], totals: { ARS: 'ARS 55.25' } });
    await expectFilteringReadOnly(page, before);
  });

  test('TC-058 [B] Tratar símbolos y etiquetas como búsqueda literal sin regex ni HTML', async ({ page }) => {
    const description = '<b>Café & Facturas!</b> [Plan.*] "A"';
    await createExpense(page, { description, amount: '12.75' });
    await createExpense(page, { description: 'Plan ABC alternativo', amount: '500' });
    const before = await projectSnapshot(page);
    for (const query of ['[Plan.*]', '& Facturas!', '<b>', '"A"']) {
      await setExpenseFilters(page, { query });
      await expectFilteredExpenses(page, { descriptions: [description], totals: { ARS: 'ARS 12.75' } });
      await expect(expenseRow(page, 'ARS', description).locator('.expenseConceptText b')).toHaveCount(0);
    }
    await setExpenseFilters(page, { query: '[Plan.+]' });
    await expectFilteredExpenses(page, { descriptions: [], totals: { ARS: 'ARS 0' } });
    await expectFilteringReadOnly(page, before);
  });

  test('TC-059 [P] Filtrar por mes y año sin mezclar períodos de distinto año', async ({ page }) => {
    const year = Number((await page.locator('#ef_ARS').inputValue()).slice(0, 4));
    const first = `${year}-01`, second = `${year + 1}-01`;
    await createExpense(page, { description: 'Enero anterior', amount: '10.25', month: first });
    await createExpense(page, { description: 'Enero siguiente', amount: '20.50', month: second });
    const before = await projectSnapshot(page);
    expect(await filterOptionValues(page, 'expensePeriodFilter')).toEqual(['', second, first]);
    await setExpenseFilters(page, { month: first });
    await expectFilteredExpenses(page, { descriptions: ['Enero anterior'], totals: { ARS: 'ARS 10.25' } });
    await setExpenseFilters(page, { month: second });
    await expectFilteredExpenses(page, { descriptions: ['Enero siguiente'], totals: { ARS: 'ARS 20.5' } });
    await setExpenseFilters(page, { month: '' });
    await expectFilteredExpenses(page, { descriptions: ['Enero anterior', 'Enero siguiente'], totals: { ARS: 'ARS 30.75' } });
    await expectFilteringReadOnly(page, before);
  });

  test('TC-060 [R] Filtrar monedas A–Z y consultar USD inactivo conservando sus totales', async ({ page }) => {
    await addCurrency(page, 'USD');
    await addCurrency(page, 'EUR');
    await createExpense(page, { description: 'Compra ARS', amount: '100' });
    await createExpense(page, { currency: 'EUR', description: 'Compra EUR', amount: '20.25' });
    await createExpense(page, { currency: 'USD', description: 'Compra USD', amount: '10.50' });
    await deactivateCurrency(page, 'USD');
    await expectActiveCurrencies(page, ['ARS', 'EUR']);
    await openExpenses(page);
    const before = await projectSnapshot(page);
    expect(await filterOptionValues(page, 'expenseCurrencyFilter')).toEqual(['', 'ARS', 'EUR', 'USD']);
    for (const [currency, amount] of [['ARS', 'ARS 100'], ['EUR', 'EUR 20.25'], ['USD', 'USD 10.5']]) {
      await setExpenseFilters(page, { currency });
      await expectFilteredExpenses(page, { descriptions: [`Compra ${currency}`], totals: { [currency]: amount } });
      await expect(page.locator('.expenseSection:visible')).toHaveCount(1);
      await expect(expenseSection(page, currency)).toBeVisible();
    }
    await expect(expenseSection(page, 'USD').locator('.editbtn')).toBeDisabled();
    await expect(expenseSection(page, 'USD').locator('.expenseForm')).toHaveCount(0);
    await expectFilteringReadOnly(page, before);
  });

  test('TC-061 [P] Combinar texto, período y moneda con intersección de resultados', async ({ page }) => {
    await addCurrency(page, 'USD');
    await openExpenses(page);
    const month = await page.locator('#ef_ARS').inputValue(), later = nextMonth(month);
    await createExpense(page, { description: 'Café ARS actual', amount: '10.25', month });
    await createExpense(page, { description: 'Café ARS próximo', amount: '20.50', month: later });
    await createExpense(page, { currency: 'USD', description: 'Café USD actual', amount: '30.75', month });
    await createExpense(page, { currency: 'USD', description: 'Taxi USD actual', amount: '99', month });
    const before = await projectSnapshot(page);
    await setExpenseFilters(page, { query: 'cafe', month, currency: 'USD' });
    await expectFilteredExpenses(page, { descriptions: ['Café USD actual'], totals: { USD: 'USD 30.75' } });
    await setExpenseFilters(page, { currency: 'ARS' });
    await expectFilteredExpenses(page, { descriptions: ['Café ARS actual'], totals: { ARS: 'ARS 10.25' } });
    await setExpenseFilters(page, { month: later });
    await expectFilteredExpenses(page, { descriptions: ['Café ARS próximo'], totals: { ARS: 'ARS 20.5' } });
    await expectFilteringReadOnly(page, before);
  });

  test('TC-062 [N] Mostrar cero y estado vacío sin borrar gastos cuando no hay coincidencias', async ({ page }) => {
    const record = await createExpense(page, { description: 'Internet sin coincidencia', amount: '15.25' });
    const before = await projectSnapshot(page);
    await setExpenseFilters(page, { query: 'ZZZ-inexistente-987', month: record.f, currency: 'ARS' });
    await expectFilteredExpenses(page, { descriptions: [], totals: { ARS: 'ARS 0' } });
    await expect(expenseSection(page).locator('.expenseNoMatch')).toBeVisible();
    await expect(expenseSection(page).locator('.expenseNoMatch')).toHaveText('No expenses match these filters.');
    await expect(page.locator('#expenseSearch')).toHaveValue('ZZZ-inexistente-987');
    await expect(page.locator('#expensePeriodFilter')).toHaveValue(record.f);
    await expect(page.locator('#expenseCurrencyFilter')).toHaveValue('ARS');
    await expect(expenseRow(page, 'ARS', record.c)).toBeHidden();
    await expectFilteringReadOnly(page, before);
  });

  test('TC-063 [R] Limpiar búsqueda conserva los dropdowns y restablecerlos recupera todos los gastos', async ({ page }) => {
    await addCurrency(page, 'USD');
    await openExpenses(page);
    const month = await page.locator('#ef_ARS').inputValue(), later = nextMonth(month);
    await createExpense(page, { description: 'Internet ARS', amount: '10', month });
    await createExpense(page, { currency: 'USD', description: 'Café USD', amount: '20', month });
    await createExpense(page, { currency: 'USD', description: 'Taxi USD', amount: '30', month });
    await createExpense(page, { currency: 'USD', description: 'Café próximo USD', amount: '40', month: later });
    const before = await projectSnapshot(page);
    await setExpenseFilters(page, { query: 'cafe', month, currency: 'USD' });
    await expectFilteredExpenses(page, { descriptions: ['Café USD'], totals: { USD: 'USD 20' } });
    await page.locator('.expenseSearchInputWrap .searchClear').click();
    await expect(page.locator('#expenseSearch')).toHaveValue('');
    await expect(page.locator('#expenseSearch')).toBeFocused();
    await expect(page.locator('#expensePeriodFilter')).toHaveValue(month);
    await expect(page.locator('#expenseCurrencyFilter')).toHaveValue('USD');
    await expectFilteredExpenses(page, { descriptions: ['Café USD', 'Taxi USD'], totals: { USD: 'USD 50' } });
    await setExpenseFilters(page, { month: '', currency: '' });
    await expectFilteredExpenses(page, {
      descriptions: ['Internet ARS', 'Café USD', 'Taxi USD', 'Café próximo USD'],
      totals: { ARS: 'ARS 10', USD: 'USD 90' },
    });
    await expectFilteringReadOnly(page, before);
  });

  test('TC-064 [R] Editar y borrar bajo filtros afecta sólo al gasto visible y actualiza los totales', async ({ page }) => {
    const hidden = await createExpense(page, { description: 'No tocar', amount: '50', paid: true });
    const target = await createExpense(page, { description: 'Objetivo Café', amount: '10.25', note: 'Original' });
    const other = await createExpense(page, { description: 'Otra devolución', amount: '-5.25' });
    const before = await projectSnapshot(page);
    // Los totales conservan el signo y suman sólo gastos de su moneda, pagados o pendientes.
    await expectFilteredExpenses(page, {
      descriptions: [hidden.c, target.c, other.c], totals: { ARS: 'ARS 55' },
    });
    await setExpenseFilters(page, { query: 'objetivo', month: target.f, currency: 'ARS' });
    await expectFilteredExpenses(page, { descriptions: [target.c], totals: { ARS: 'ARS 10.25' } });
    await expectFilteringReadOnly(page, before);
    await beginExpenseEdit(page, 'ARS', target.c);
    await page.locator('#ea_ARS').fill('20.75');
    await page.locator('#en_ARS').fill('Editado desde resultado filtrado');
    await saveButton(page).click();
    const updated = { ...target, a: 20.75, n: 'Editado desde resultado filtrado' };
    expect((await projectSnapshot(page)).expenses).toEqual([hidden, updated, other]);
    await expectPersistedExpenses(page, [hidden, updated, other]);
    await expectFilteredExpenses(page, { descriptions: [target.c], totals: { ARS: 'ARS 20.75' } });
    await expenseRow(page, 'ARS', target.c).locator('.trashbtn').click();
    await expect(page.locator('#darkModal')).toBeVisible();
    await page.locator('#darkOk').click();
    await expect(page.locator('#darkModal')).toHaveCount(0);
    expect((await projectSnapshot(page)).expenses).toEqual([hidden, other]);
    await expectPersistedExpenses(page, [hidden, other]);
    await expectFilteredExpenses(page, { descriptions: [], totals: { ARS: 'ARS 0' } });
    await setExpenseFilters(page, { query: '', month: '', currency: '' });
    await expectFilteredExpenses(page, { descriptions: [hidden.c, other.c], totals: { ARS: 'ARS 44.75' } });
    await expect(expenseRow(page, 'ARS', hidden.c).locator('.expensePaidCell input')).toBeChecked();
    await expectMonthlyTotals(page, {
      month: target.f, expenses: 'ARS 44.75', calculated: '-ARS 50', projected: '-ARS 44.75',
    });
    await goTo(page, 'gastos');
    await expectFilteredExpenses(page, { descriptions: [hidden.c, other.c], totals: { ARS: 'ARS 44.75' } });
  });
});
