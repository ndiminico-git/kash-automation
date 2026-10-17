const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot, settingsPage } = require('../helpers/language');
const { addCurrency, deactivateCurrency, inactiveRow, optionCodes, expectActiveCurrencies } = require('../helpers/currencies');
const { nextMonth, createExpense, readSavedProject } = require('../helpers/expenses');
const { expectBudgetPersisted, expectBudgetUnchanged } = require('../helpers/monthly-budget');
const { setOpeningBalance, expectBalances, expectSummaryBalances, writeVerifiedBalance, reloadBalanceProject } = require('../helpers/balances');
const {
  exchangeRows, exchangeRow, exchangeSave, exchangeFilter, openCurrencyExchange, fillExchange,
  unrelatedToExchanges, createExchange, beginExchangeEdit, expectExchangeCells,
  expectExchangeStatus, expectRejectedExchange,
} = require('../helpers/currency-exchange');

const errorsByPage = new WeakMap();
const test = base.extend({
  exchangeApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanExchangeProject: [async ({ page, context, exchangeApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    const origin = new URL(app.url).origin;
    await context.addInitScript(value => {
      if (location.origin === value) localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await base.step('Preparación: app limpia, inglés y proyecto vacío desde el wizard', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
      await createLanguageProject(page);
      const project = await projectSnapshot(page);
      expect(project.fx).toEqual([]);
      expect(project.expenses).toEqual([]);
      expect(project.C).toEqual({});
      expect(project.enabledCurrencies).toEqual(['ARS']);
      await expectBudgetPersisted(page, project);
      await openCurrencyExchange(page);
    });
    page.setDefaultTimeout(5_000);
    await testInfo.attach('exchange-setup-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, freshProject: true }), contentType: 'application/json',
    });
    await use();
  }, { auto: true, timeout: 60_000 }],
  withUSD: [async ({ page, cleanExchangeProject }, use, testInfo) => {
    const started = Date.now();
    await base.step('Preparación opcional: habilitar USD por UI', async () => {
      await addCurrency(page, 'USD');
      await expectActiveCurrencies(page, ['ARS', 'USD']);
    });
    await testInfo.attach('exchange-currency-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, currencies: ['ARS', 'USD'] }), contentType: 'application/json',
    });
    await use('USD');
  }, { timeout: 60_000 }],
  withEUR: [async ({ page, withUSD }, use, testInfo) => {
    expect(withUSD).toBe('USD');
    const started = Date.now();
    await base.step('Preparación opcional adicional: habilitar EUR por UI', async () => {
      await addCurrency(page, 'EUR');
      await expectActiveCurrencies(page, ['ARS', 'EUR', 'USD']);
    });
    await testInfo.attach('exchange-extra-currency-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, currencies: ['ARS', 'EUR', 'USD'] }), contentType: 'application/json',
    });
    await use(['ARS', 'EUR', 'USD']);
  }, { timeout: 60_000 }],
});

const initialMonth = async page => (await projectSnapshot(page)).inicio;
test.use({ storageState: { cookies: [], origins: [] } });
test.describe('10 · Cambio de divisas · KA$H v0.677', () => {
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', {
      body: JSON.stringify(errors), contentType: 'application/json',
    });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const diagnostic = await page.evaluate(() => ({
        project: typeof window.KASHGetProjectJson === 'function' ? JSON.parse(window.KASHGetProjectJson()) : null,
        persisted: JSON.parse(localStorage.getItem('kash') || 'null'),
        fields: Object.fromEntries(['m1', 'm2', 'fa', 'ft', 'fc', 'fd', 'fn'].map(id => [id, document.getElementById(id)?.value])),
        filters: [...document.querySelectorAll('[data-fx-filter]')].map(el => [el.dataset.fxFilter, el.value]),
        table: document.querySelector('.fxTable')?.innerText,
        filterStatus: document.getElementById('fxFilterStatus')?.textContent,
        modal: document.querySelector('#darkModal')?.textContent,
      }));
      await testInfo.attach('exchange-diagnostic', {
        body: JSON.stringify(diagnostic, null, 2), contentType: 'application/json',
      });
    }
  });

  test('TC-111 [P] Cambio vacío requiere dos monedas activas y habilitarlas no crea operaciones', async ({ page }) => {
    const before = await projectSnapshot(page);
    await expect(exchangeRows(page)).toHaveCount(0);
    await expect(page.locator('.fxNoResults')).toHaveText('No exchanges recorded.');
    await expect(exchangeSave(page)).toBeDisabled();
    await expect(page.locator('#fxClearFilters')).toBeDisabled();
    await expect(page.locator('.fxTable thead tr').first().locator('th')).toHaveText([
      'Month', 'I send', 'I receive', 'Exchange rate', 'Fee in source currency', 'Note', 'Actions',
    ]);
    expect(await optionCodes(page.locator('#m1'))).toEqual(['ARS']);
    expect(await optionCodes(page.locator('#m2'))).toEqual(['ARS']);
    await expect(page.locator('#fd')).toHaveValue(before.inicio);
    await expect(page.locator('#fa')).toHaveValue('');
    await expect(page.locator('#ft')).toHaveValue('');
    await expect(page.locator('#fc')).toHaveValue('0');
    await expectExchangeStatus(page, [], 0);
    await expectBudgetUnchanged(page, before);
    await addCurrency(page, 'USD');
    await openCurrencyExchange(page);
    await expect(exchangeSave(page)).toBeEnabled();
    expect(await optionCodes(page.locator('#m1'))).toEqual(['ARS', 'USD']);
    expect(await optionCodes(page.locator('#m2'))).toEqual(['ARS', 'USD']);
    const after = await projectSnapshot(page);
    for (const key of ['fx', 'expenses', 'rub', 'groups', 'tenAdjustments']) expect(after[key]).toEqual([]);
    for (const key of ['C', 'real', 'realByCurrency']) expect(after[key]).toEqual({});
    await expectBudgetPersisted(page, after);
  });

  test('TC-112 [P] Vender USD por ARS multiplica la tasa y descuenta la comisión sólo de USD', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page);
    await setOpeningBalance(page, 'ARS', '10000');
    await setOpeningBalance(page, 'USD', '1000');
    const note = '  Café & venta <b>USD</b> "sin formato"  ';
    const { record } = await createExchange(page, { month, amount: '100', rate: '1500', fee: '2.5', note });
    expect(record).toEqual({ f: month, m: 'USD', m2: 'ARS', a: 100, tc: 1500, c: 2.5, n: note, rateMode: 'direct' });
    await expect(page.locator('#kashFxRateHint')).toHaveText('1 USD = amount in ARS');
    const row = await expectExchangeCells(page, 0, { month, sent: 'USD 100', received: 'ARS 150,000', rate: '1,500', fee: 'USD 2.5', note });
    await expect(row.locator('.note b')).toHaveCount(0);
    await expectBalances(page, { month, opening: 'ARS 10,000', calculated: 'ARS 160,000', projected: 'ARS 160,000', verified: '—' });
    await expectBalances(page, { currency: 'USD', month, opening: 'USD 1,000', calculated: 'USD 897.5', projected: 'USD 897.5', verified: '—' });
    await expectSummaryBalances(page, { month, calculated: 'ARS 160,000', projected: 'ARS 160,000' });
    await expectSummaryBalances(page, { currency: 'USD', month, calculated: 'USD 897.5', projected: 'USD 897.5' });
  });

  test('TC-113 [P] Comprar USD con ARS divide por la cotización y cobra la comisión en ARS', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page);
    await setOpeningBalance(page, 'ARS', '200000');
    await setOpeningBalance(page, 'USD', '100');
    const { record } = await createExchange(page, { from: 'ARS', to: 'USD', month, amount: '150000', rate: '1500', fee: '1000' });
    expect(record).toEqual({ f: month, m: 'ARS', m2: 'USD', a: 150000, tc: 1500, c: 1000, n: '', rateMode: 'legacy' });
    await expect(page.locator('#kashFxRateHint')).toHaveText('1 USD = amount in ARS');
    await expectExchangeCells(page, 0, { month, sent: 'ARS 150,000', received: 'USD 100', fee: 'ARS 1,000', note: '' });
    await expectBalances(page, { month, calculated: 'ARS 49,000', projected: 'ARS 49,000', verified: '—' });
    await expectBalances(page, { currency: 'USD', month, calculated: 'USD 200', projected: 'USD 200', verified: '—' });
    await expectSummaryBalances(page, { currency: 'USD', month, calculated: 'USD 200', projected: 'USD 200' });
  });

  test('TC-114 [P] Cambiar USD por EUR aplica tasa directa sin convertir ni alterar ARS', async ({ page, withEUR }) => {
    expect(withEUR).toEqual(['ARS', 'EUR', 'USD']);
    const month = await initialMonth(page);
    await setOpeningBalance(page, 'USD', '500');
    await setOpeningBalance(page, 'EUR', '50');
    const { record } = await createExchange(page, { to: 'EUR', month, amount: '100', rate: '0.8', fee: '1.25', note: 'Cruce USD/EUR' });
    expect(record).toEqual({ f: month, m: 'USD', m2: 'EUR', a: 100, tc: 0.8, c: 1.25, n: 'Cruce USD/EUR', rateMode: 'direct' });
    await expectExchangeCells(page, 0, { received: 'EUR 80', fee: 'USD 1.25' });
    await expectBalances(page, { currency: 'USD', month, calculated: 'USD 398.75', projected: 'USD 398.75' });
    await expectBalances(page, { currency: 'EUR', month, calculated: 'EUR 130', projected: 'EUR 130' });
    await expectBalances(page, { month, calculated: 'ARS 0', projected: 'ARS 0', verified: '—' });
    await expectSummaryBalances(page, { currency: 'EUR', month, calculated: 'EUR 130', projected: 'EUR 130' });
  });

  test('TC-115 [B] Conservar precisión en monto y comisión y redondear sólo la presentación de tres cambios', async ({ page, withEUR }) => {
    expect(withEUR).toEqual(['ARS', 'EUR', 'USD']);
    const month = await initialMonth(page);
    await setOpeningBalance(page, 'USD', '10');
    const records = [];
    for (let index = 0; index < 3; index++) {
      const { record } = await createExchange(page, { to: 'EUR', month, amount: '1.23456', rate: '0.8', fee: '0.00004', note: `Microcambio ${index + 1}` });
      expect(record).toMatchObject({ a: 1.23456, tc: 0.8, c: 0.00004, rateMode: 'direct' });
      await expectExchangeCells(page, index, { sent: 'USD 1.23', received: 'EUR 0.99', fee: 'USD 0' });
      records.push(record);
    }
    expect((await projectSnapshot(page)).fx).toEqual(records);
    // 3 × (1.23456 × 0.8) = 2.962944; sumar tres importes ya redondeados daría 2.97.
    await expectBalances(page, { currency: 'EUR', month, calculated: 'EUR 2.96', projected: 'EUR 2.96' });
    await expectBalances(page, { currency: 'USD', month, calculated: 'USD 6.3', projected: 'USD 6.3' });
    await expectSummaryBalances(page, { currency: 'EUR', month, calculated: 'EUR 2.96', projected: 'EUR 2.96' });
  });

  test('TC-116 [N] Rechazar monedas iguales, mes ausente y monto o tasa vacíos, cero, negativos o no numéricos', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page);
    await createExchange(page, { month, amount: '10', rate: '2', note: 'Registro válido anterior' });
    const before = await projectSnapshot(page);
    for (const invalid of [
      { amount: '' }, { amount: '0' }, { amount: '-1' }, { amount: 'abc' },
      { rate: '' }, { rate: '0' }, { rate: '-1' }, { rate: 'Infinity' },
      { month: '' }, { from: 'USD', to: 'USD' },
    ]) {
      await test.step(`Rechazar ${JSON.stringify(invalid)}`, async () => {
        await expectRejectedExchange(page, { month, amount: '25', rate: '2', fee: '0', note: 'Borrador inválido & conservado', ...invalid });
      });
    }
    await expectBudgetUnchanged(page, before);
    await expectBalances(page, { month, calculated: 'ARS 20', projected: 'ARS 20' });
    await expectBalances(page, { currency: 'USD', month, calculated: '-USD 10', projected: '-USD 10', verified: '—' });
  });

  test('TC-117 [R] Editar una fila ordenada cambia mes, monedas, tasa y comisión sin duplicar ni tocar otro cambio', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '100');
    const first = await createExchange(page, { month, amount: '10', rate: '10', fee: '1', note: 'Cambio a corregir' });
    const second = await createExchange(page, { from: 'ARS', to: 'USD', month: future, amount: '100', rate: '10', note: 'Otro cambio' });
    await expectExchangeStatus(page, [1, 0], 2);
    const before = await projectSnapshot(page);
    await beginExchangeEdit(page, first.index, first.record);
    await fillExchange(page, { from: 'ARS', to: 'USD', month: future, amount: '50', rate: '5', fee: '2', note: 'Corregido & <b>literal</b>' });
    await exchangeSave(page).click();
    await expect(exchangeSave(page)).toHaveText('Add exchange');
    const after = await projectSnapshot(page);
    const edited = { f: future, m: 'ARS', m2: 'USD', a: 50, tc: 5, c: 2, n: 'Corregido & <b>literal</b>', rateMode: 'legacy' };
    expect(after.fx).toEqual([edited, second.record]);
    expect(unrelatedToExchanges(after)).toEqual(unrelatedToExchanges(before));
    await expectExchangeCells(page, first.index, { month: future, sent: 'ARS 50', received: 'USD 10', rate: '5', fee: 'ARS 2', note: edited.n });
    await expectBudgetPersisted(page, after);
    await expectBalances(page, { month, calculated: 'ARS 1,000', projected: 'ARS 1,000' });
    await expectBalances(page, { currency: 'USD', month, calculated: 'USD 100', projected: 'USD 100' });
    await expectBalances(page, { month: future, calculated: 'ARS 848', projected: 'ARS 848', verified: '—' });
    await expectBalances(page, { currency: 'USD', month: future, calculated: 'USD 120', projected: 'USD 120', verified: '—' });
    await expectSummaryBalances(page, { currency: 'USD', month: future, calculated: 'USD 120', projected: 'USD 120' });
  });

  test('TC-118 [N] Cancelar la edición descarta todo el borrador y conserva cambios y saldos originales', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '100');
    const original = await createExchange(page, { month, amount: '10', rate: '10', fee: '1', note: 'Nota original' });
    const before = await projectSnapshot(page);
    await beginExchangeEdit(page, original.index, original.record);
    await fillExchange(page, { from: 'ARS', to: 'USD', month: future, amount: '999', rate: '15', fee: '2', note: 'Borrador que no se guarda' });
    await page.locator('[onclick="cancelFx()"]').click();
    await expect(exchangeSave(page)).toHaveText('Add exchange');
    await expect(page.locator('[onclick="cancelFx()"]')).toHaveCount(0);
    await expectBudgetUnchanged(page, before);
    await beginExchangeEdit(page, original.index, original.record);
    await page.locator('[onclick="cancelFx()"]').click();
    await expectBudgetUnchanged(page, before);
    await expectBalances(page, { month, calculated: 'ARS 1,100', projected: 'ARS 1,100' });
    await expectBalances(page, { currency: 'USD', month, calculated: 'USD 89', projected: 'USD 89' });
    await expectSummaryBalances(page, { currency: 'USD', month, calculated: 'USD 89', projected: 'USD 89' });
  });

  test('TC-119 [R] Cancelar y confirmar borrado bajo filtros afecta al índice original y revierte sólo ese cambio', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '100');
    const first = await createExchange(page, { month, amount: '10', rate: '10', fee: '1', note: 'Conservar primero' });
    const target = await createExchange(page, { month, amount: '20', rate: '10', note: 'Eliminar objetivo' });
    const third = await createExchange(page, { from: 'ARS', to: 'USD', month: future, amount: '100', rate: '10', note: 'Conservar futuro' });
    await exchangeFilter(page, 'f').selectOption(month);
    await exchangeFilter(page, 'n').fill('objetivo');
    await expectExchangeStatus(page, [1], 3);
    const before = await projectSnapshot(page);
    await exchangeRow(page, target.index).locator('.trashbtn').click();
    await expect(page.locator('#darkModal .darkModalText')).toHaveText('Delete this currency exchange?');
    await page.locator('#darkCancel').click();
    await expectBudgetUnchanged(page, before);
    await expectExchangeStatus(page, [1], 3);
    await exchangeRow(page, target.index).locator('.trashbtn').click();
    await page.locator('#darkOk').click();
    await expect(page.locator('#darkModal')).toHaveCount(0);
    await expectExchangeStatus(page, [], 2);
    await expect(page.locator('.fxNoResults')).toHaveText('No exchanges match the filters.');
    const after = await projectSnapshot(page);
    expect(after.fx).toEqual([first.record, third.record]);
    expect(unrelatedToExchanges(after)).toEqual(unrelatedToExchanges(before));
    await expectBudgetPersisted(page, after);
    await page.locator('#fxClearFilters').click();
    await expectExchangeStatus(page, [1, 0], 2);
    await expectBalances(page, { month, calculated: 'ARS 1,100', projected: 'ARS 1,100' });
    await expectBalances(page, { currency: 'USD', month, calculated: 'USD 89', projected: 'USD 89' });
    await expectBalances(page, { month: future, calculated: 'ARS 1,000', projected: 'ARS 1,000' });
    await expectBalances(page, { currency: 'USD', month: future, calculated: 'USD 99', projected: 'USD 99' });
  });

  test('TC-120 [R] Combinar filtros de mes, monedas, nota, tasa y comisión y limpiarlos no modifica el proyecto', async ({ page, withEUR }) => {
    expect(withEUR).toEqual(['ARS', 'EUR', 'USD']);
    const month = await initialMonth(page), future = nextMonth(month);
    await createExchange(page, { month, amount: '10', rate: '10', fee: '1', note: 'Café & <b>Venta</b>' });
    await createExchange(page, { to: 'EUR', month: future, amount: '20', rate: '0.8', note: 'Viaje europa' });
    await createExchange(page, { from: 'EUR', to: 'USD', month: future, amount: '10', rate: '1.25', fee: '0.5', note: 'CAFÉ cambio' });
    const before = await projectSnapshot(page);
    await expectExchangeStatus(page, [2, 1, 0], 3);
    await exchangeFilter(page, 'f').selectOption(future);
    await expectExchangeStatus(page, [2, 1], 3);
    await exchangeFilter(page, 'give').selectOption('USD');
    await expectExchangeStatus(page, [1], 3);
    await exchangeFilter(page, 'recv').selectOption('EUR');
    await exchangeFilter(page, 'n').fill('VIAJE');
    await exchangeFilter(page, 'tc').fill('0.8');
    await exchangeFilter(page, 'comm').fill('USD 0');
    await expectExchangeStatus(page, [1], 3);
    await expectBudgetUnchanged(page, before);
    await exchangeFilter(page, 'n').fill('no existe <b>ni.*regex</b>');
    await expectExchangeStatus(page, [], 3);
    await expect(page.locator('.fxNoResults')).toHaveText('No exchanges match the filters.');
    await expectBudgetUnchanged(page, before);
    await page.locator('#fxClearFilters').click();
    await expectExchangeStatus(page, [2, 1, 0], 3);
    for (const column of ['f', 'give', 'recv', 'tc', 'comm', 'n']) await expect(exchangeFilter(page, column)).toHaveValue('');
    await expect(page.locator('#fxClearFilters')).toBeDisabled();
    await exchangeFilter(page, 'n').fill('café');
    await expectExchangeStatus(page, [2, 0], 3);
    await exchangeFilter(page, 'n').fill('<b>');
    await expectExchangeStatus(page, [0], 3);
    await expect(exchangeRow(page, 0).locator('.note b')).toHaveCount(0);
    await page.locator('#fxClearFilters').click();
    await expectBudgetUnchanged(page, before);
  });

  test('TC-121 [R] Desactivar USD conserva sus cambios e histórico consultable y bloquea editarlos hasta reactivarlo', async ({ page, withEUR }) => {
    expect(withEUR).toEqual(['ARS', 'EUR', 'USD']);
    const month = await initialMonth(page);
    await setOpeningBalance(page, 'USD', '100');
    await setOpeningBalance(page, 'EUR', '50');
    const usd = await createExchange(page, { month, amount: '10', rate: '2', fee: '1', note: 'Histórico USD' });
    await createExchange(page, { from: 'EUR', month, amount: '5', rate: '2', note: 'Cambio EUR activo' });
    const before = await projectSnapshot(page);
    await deactivateCurrency(page, 'USD');
    await expectActiveCurrencies(page, ['ARS', 'EUR']);
    await openCurrencyExchange(page);
    expect(await optionCodes(page.locator('#m1'))).toEqual(['ARS', 'EUR']);
    expect(await optionCodes(page.locator('#m2'))).toEqual(['ARS', 'EUR']);
    expect(await optionCodes(exchangeFilter(page, 'give'))).toEqual(['EUR', 'USD']);
    await exchangeFilter(page, 'give').selectOption('USD');
    await expectExchangeStatus(page, [0], 2);
    await expect(exchangeRow(page, 0).locator('.editbtn')).toBeDisabled();
    await expectExchangeCells(page, 0, { sent: 'USD 10', received: 'ARS 20', fee: 'USD 1', note: 'Histórico USD' });
    const disabled = await projectSnapshot(page);
    expect(disabled).toEqual({ ...before, enabledCurrencies: ['ARS', 'EUR'] });
    await expectBudgetPersisted(page, disabled);
    await expectBalances(page, { currency: 'USD', month, calculated: 'USD 89', projected: 'USD 89', verified: '—' });
    await expectBalances(page, { currency: 'EUR', month, calculated: 'EUR 45', projected: 'EUR 45' });
    await settingsPage(page, 'money', 'currencies');
    await inactiveRow(page, 'USD').getByRole('button', { name: 'Enable again', exact: true }).click();
    await expectActiveCurrencies(page, ['ARS', 'EUR', 'USD']);
    await openCurrencyExchange(page);
    await page.locator('#fxClearFilters').click();
    await expectExchangeStatus(page, [1, 0], 2);
    await expect(exchangeRow(page, usd.index).locator('.editbtn')).toBeEnabled();
    await beginExchangeEdit(page, usd.index, usd.record);
    await page.locator('[onclick="cancelFx()"]').click();
    await expectBudgetUnchanged(page, before);
  });

  test('TC-122 [R] Recargar conserva cambios, gastos y cierre por moneda y mantiene saldos sin contar dos veces el pasado', async ({ page, withEUR }) => {
    expect(withEUR).toEqual(['ARS', 'EUR', 'USD']);
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '200');
    await setOpeningBalance(page, 'EUR', '50');
    const paid = await createExpense(page, { month, description: 'Gasto ARS pagado QA', amount: '50', paid: true });
    const pending = await createExpense(page, { currency: 'USD', month: future, description: 'Gasto USD pendiente QA', amount: '5', paid: false });
    const first = await createExchange(page, { month, amount: '25', rate: '10', fee: '0.5', note: 'Venta <b>USD</b> & Café' });
    const second = await createExchange(page, { from: 'ARS', to: 'USD', month: future, amount: '100', rate: '20', fee: '1', note: 'Compra posterior' });
    const third = await createExchange(page, { to: 'EUR', month: future, amount: '10', rate: '0.8', fee: '0.25', note: 'Cruce posterior' });
    await writeVerifiedBalance(page, 'USD', month, '160');
    const before = await projectSnapshot(page);
    const after = await reloadBalanceProject(page, before);
    expect(after.fx).toEqual([first.record, second.record, third.record]);
    expect(after.expenses).toEqual([paid, pending]);
    expect(after.realByCurrency).toEqual({ USD: { [month]: 160 } });
    await expectBalances(page, { month, calculated: 'ARS 1,200', projected: 'ARS 1,200', verified: '—' });
    await expectBalances(page, { currency: 'USD', month, calculated: 'USD 174.5', projected: 'USD 174.5', verified: 'USD 160' });
    await expectBalances(page, { month: future, calculated: 'ARS 1,099', projected: 'ARS 1,099', verified: '—' });
    await expectBalances(page, { currency: 'USD', month: future, opening: 'USD 160', calculated: 'USD 154.75', projected: 'USD 149.75', verified: '—' });
    await expectBalances(page, { currency: 'EUR', month: future, calculated: 'EUR 58', projected: 'EUR 58', verified: '—' });
    await expectSummaryBalances(page, { currency: 'USD', month: future, calculated: 'USD 154.75', projected: 'USD 149.75' });
    await openCurrencyExchange(page);
    await expectExchangeStatus(page, [2, 1, 0], 3);
    await expectExchangeCells(page, 0, { month, sent: 'USD 25', received: 'ARS 250', fee: 'USD 0.5', note: first.record.n });
    await expectExchangeCells(page, 1, { month: future, sent: 'ARS 100', received: 'USD 5', fee: 'ARS 1', note: second.record.n });
    await expectExchangeCells(page, 2, { month: future, sent: 'USD 10', received: 'EUR 8', fee: 'USD 0.25', note: third.record.n });
    expect(await projectSnapshot(page)).toEqual(after);
    const { nid: normalizedNextId, ...expectedFinancialProject } = after;
    await expect.poll(async () => {
      const stored = await readSavedProject(page);
      if (!stored) return null;
      const { nid: storedNextId, ...financialProject } = stored;
      expect(normalizedNextId).toBeGreaterThanOrEqual(storedNextId);
      return financialProject;
    }).toEqual(expectedFinancialProject);
  });
});
