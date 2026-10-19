const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot, goTo } = require('../helpers/language');
const { addCurrency, deactivateCurrency, expectActiveCurrencies } = require('../helpers/currencies');
const { createExpense, nextMonth } = require('../helpers/expenses');
const {
  openMonthlyBudget, expectBudgetPersisted, expectBudgetUnchanged, createMonthlyGroup,
  createMonthlyService, writeBudgetAmount, toggleBudgetPaid,
} = require('../helpers/monthly-budget');
const {
  verifiedCell, totalCell, setOpeningBalance, beginVerifiedEdit, writeVerifiedBalance,
  expectBalances, expectSummaryBalances, balanceTransactions, reloadBalanceProject,
} = require('../helpers/balances');

const errorsByPage = new WeakMap();
const test = base.extend({
  balancesApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanBalancesProject: [async ({ page, context, balancesApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    const origin = new URL(app.url).origin;
    await context.addInitScript(value => {
      if (location.origin === value) localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await base.step('Preparación: app limpia, idioma, wizard y saldos sin cierres', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
      await createLanguageProject(page);
      const project = await projectSnapshot(page);
      expect(project.base).toBe(0);
      expect(project.real).toEqual({});
      expect(project.realByCurrency).toEqual({});
      expect(project.realConfirmedMonths).toEqual([]);
      expect(project.expenses).toEqual([]);
      await expectBudgetPersisted(page, project);
      await openMonthlyBudget(page);
    });
    page.setDefaultTimeout(5_000);
    await testInfo.attach('balances-setup-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, freshProject: true }), contentType: 'application/json',
    });
    await use();
  }, { auto: true, timeout: 60_000 }],
  openingBalanceCurrencies: [async ({ page, cleanBalancesProject }, use, testInfo) => {
    // Depende del proyecto limpio: wizard, monedas y caso tienen presupuestos separados.
    // Esta fixture sólo se solicita en TC-090; los otros trece casos no la ejecutan.
    const started = Date.now();
    await base.step('Preparación TC-090: habilitar USD y EUR por UI', async () => {
      await addCurrency(page, 'USD');
      await addCurrency(page, 'EUR');
      await expectActiveCurrencies(page, ['ARS', 'EUR', 'USD']);
    });
    await testInfo.attach('opening-balance-currencies-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, currencies: ['ARS', 'EUR', 'USD'] }), contentType: 'application/json',
    });
    await use(['ARS', 'EUR', 'USD']);
  }, { timeout: 60_000 }],
});

const initialMonth = async page => (await projectSnapshot(page)).inicio;
test.use({ storageState: { cookies: [], origins: [] } });
test.describe('08 · Saldos y remanentes · KA$H v0.690', () => {
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
        year: document.querySelector('.yearNavLabel')?.textContent,
        draft: document.querySelector('.realEdit')?.value,
        totals: [...document.querySelectorAll('#gw tr[data-total-currency]')]
          .map(row => ({ currency: row.dataset.totalCurrency, kind: row.dataset.totalKind, text: row.textContent })),
        modal: document.querySelector('#darkModal')?.textContent ?? null,
      }));
      await testInfo.attach('balances-diagnostic', {
        body: JSON.stringify(diagnostic, null, 2), contentType: 'application/json',
      });
    }
  });

  test('TC-089 [P] Distinguir cierre ausente de cero y no crear un cierre al abrir y salir sin editar', async ({ page }) => {
    const month = await initialMonth(page), before = await projectSnapshot(page);
    await expectBalances(page, { month, opening: 'ARS 0', calculated: 'ARS 0', projected: 'ARS 0', verified: '—' });
    let input = await beginVerifiedEdit(page, 'ARS', month);
    await expect(input).toHaveValue('');
    await input.press('Enter');
    await expectBudgetUnchanged(page, before);
    input = await beginVerifiedEdit(page, 'ARS', month, 'keyboard');
    await expect(input).toHaveValue('');
    await page.locator('.yearNavLabel').click();
    await expectBudgetUnchanged(page, before);
    await expect(verifiedCell(page, 'ARS', month).locator('.realDisplay')).toHaveText('—');
  });

  test('TC-090 [P] Saldo inicial por moneda aparece en planilla y Resumen sin crear ingresos ni cierres', async ({ page, openingBalanceCurrencies }) => {
    const month = await initialMonth(page);
    expect(openingBalanceCurrencies).toEqual(['ARS', 'EUR', 'USD']);
    const balances = [
      { currency: 'ARS', amount: '1000', text: 'ARS 1,000' },
      { currency: 'USD', amount: '200', text: 'USD 200' },
      { currency: 'EUR', amount: '50.25', text: 'EUR 50.25' },
    ];
    await test.step('Cargar las tres bases desde Ajustes', async () => {
      for (const { currency, amount } of balances) await setOpeningBalance(page, currency, amount);
    });
    await test.step('Comparar las tres monedas en una única visita a Planilla', async () => {
      for (const { currency, text } of balances) {
        await expectBalances(page, { currency, month, opening: text, calculated: text, projected: text, verified: '—' });
      }
    });
    await test.step('Comparar las tres tarjetas en una única visita a Resumen', async () => {
      await goTo(page, 'res');
      await page.locator('.summaryPeriodSelect.year').selectOption(month.slice(0, 4));
      await page.locator('.summaryPeriodSelect.period').selectOption(month.slice(5, 7));
      for (const { currency, text } of balances) {
        const card = page.locator(`.kashActiveCurrencyCards > [data-estimate-currency="${currency}"]`);
        await expect(card.locator('.holdingText > strong')).toHaveText(text);
        await expect(card.locator('.currencyCardEstimate .approxValue')).toHaveText(text);
      }
    });
    const project = await projectSnapshot(page);
    expect(project.rub).toEqual([]);
    expect(project.C).toEqual({});
    expect(project.expenses).toEqual([]);
    expect(project.real).toEqual({});
    expect(project.realByCurrency).toEqual({});
    expect(project.realConfirmedMonths).toEqual([]);
    await expectBudgetPersisted(page, project);
  });

  test('TC-091 [R] Separar saldo calculado y proyección según ingresos cobrados y gastos pagados o pendientes', async ({ page }) => {
    const month = await initialMonth(page);
    await setOpeningBalance(page, 'ARS', '1000');
    const group = await createMonthlyGroup(page, { name: 'Ingreso de prueba', type: 'i' });
    const income = await createMonthlyService(page, { name: 'Sueldo pendiente', group });
    await writeBudgetAmount(page, income, month, '300');
    await createExpense(page, { description: 'Ya pagado', amount: '100', paid: true, month });
    await createExpense(page, { description: 'Aún pendiente', amount: '50', month });
    await expectBalances(page, { month, opening: 'ARS 1,000', calculated: 'ARS 900', projected: 'ARS 1,150', verified: '—' });
    await expectSummaryBalances(page, { month, calculated: 'ARS 900', projected: 'ARS 1,150' });
    await toggleBudgetPaid(page, income, month);
    await expectBalances(page, { month, calculated: 'ARS 1,200', projected: 'ARS 1,150' });
    const project = await projectSnapshot(page), expenseService = project.rub.find(r => r.autoType === 'detail-expenses-ARS');
    await toggleBudgetPaid(page, expenseService, month);
    await expectBalances(page, { month, calculated: 'ARS 1,150', projected: 'ARS 1,150', verified: '—' });
    expect((await projectSnapshot(page)).real).toEqual({});
  });

  test('TC-092 [R] Cierre manual no reemplaza el calculado del mismo mes y sí ancla el mes siguiente', async ({ page }) => {
    const month = await initialMonth(page), later = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await createExpense(page, { description: 'Pago del mes', amount: '100', paid: true, month });
    await createExpense(page, { description: 'Plan próximo', amount: '10', month: later });
    const before = await projectSnapshot(page);
    await writeVerifiedBalance(page, 'ARS', month, '850');
    const after = await projectSnapshot(page);
    expect(balanceTransactions(after)).toEqual(balanceTransactions(before));
    expect(after.real).toEqual({ [month]: 850 });
    expect(after.realConfirmedMonths).toEqual([month]);
    await expectBalances(page, { month, calculated: 'ARS 900', projected: 'ARS 900', verified: 'ARS 850' });
    await expectSummaryBalances(page, { month, calculated: 'ARS 900', projected: 'ARS 900' });
    await expectBalances(page, { month: later, opening: 'ARS 850', calculated: 'ARS 850', projected: 'ARS 840', verified: '—' });
  });

  test('TC-093 [B] Cero confirmado en ARS es un cierre válido que reinicia el saldo del mes siguiente', async ({ page }) => {
    const month = await initialMonth(page), later = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await createExpense(page, { description: 'Después del cierre cero', amount: '5', month: later });
    await writeVerifiedBalance(page, 'ARS', month, '0');
    const project = await projectSnapshot(page);
    expect(project.real).toEqual({ [month]: 0 });
    expect(project.realConfirmedMonths).toEqual([month]);
    await expectBalances(page, { month, calculated: 'ARS 1,000', projected: 'ARS 1,000', verified: 'ARS 0' });
    await expectBalances(page, { month: later, opening: 'ARS 0', calculated: 'ARS 0', projected: '-ARS 5' });
    const input = await beginVerifiedEdit(page, 'ARS', month, 'keyboard');
    await expect(input).toHaveValue('0');
    await input.press('Enter');
    await expectBudgetUnchanged(page, project);
  });

  test('TC-094 [B] Ceros USD y EUR son independientes de ARS y borrar EUR elimina sólo su cierre', async ({ page }) => {
    const month = await initialMonth(page), later = nextMonth(month);
    await addCurrency(page, 'USD');
    await addCurrency(page, 'EUR');
    await setOpeningBalance(page, 'USD', '100');
    await setOpeningBalance(page, 'EUR', '20');
    await createExpense(page, { currency: 'USD', description: 'USD próximo', amount: '5', month: later });
    await createExpense(page, { currency: 'EUR', description: 'EUR próximo', amount: '2', month: later });
    await writeVerifiedBalance(page, 'USD', month, '0');
    await writeVerifiedBalance(page, 'EUR', month, '0');
    let project = await projectSnapshot(page);
    expect(project.realByCurrency).toEqual({ USD: { [month]: 0 }, EUR: { [month]: 0 } });
    expect(project.real).toEqual({});
    expect(project.realConfirmedMonths).toEqual([]);
    await expectBalances(page, { currency: 'USD', month: later, opening: 'USD 0', calculated: 'USD 0', projected: '-USD 5' });
    await expectBalances(page, { currency: 'EUR', month: later, opening: 'EUR 0', calculated: 'EUR 0', projected: '-EUR 2' });
    await writeVerifiedBalance(page, 'EUR', month, '');
    project = await projectSnapshot(page);
    expect(project.realByCurrency).toEqual({ USD: { [month]: 0 } });
    await expectBalances(page, { currency: 'EUR', month, verified: '—' });
    await expectBalances(page, { currency: 'EUR', month: later, opening: 'EUR 20', calculated: 'EUR 20', projected: 'EUR 18' });
    await expectBalances(page, { currency: 'USD', month: later, opening: 'USD 0', calculated: 'USD 0', projected: '-USD 5' });
  });

  test('TC-095 [R] Borrar un cierre ARS elimina su referencia y vuelve al saldo de movimientos', async ({ page }) => {
    const month = await initialMonth(page), later = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await createExpense(page, { description: 'Pago real', amount: '100', paid: true, month });
    await createExpense(page, { description: 'Próximo pendiente', amount: '50', month: later });
    await writeVerifiedBalance(page, 'ARS', month, '850');
    await expectBalances(page, { month: later, opening: 'ARS 850', calculated: 'ARS 850', projected: 'ARS 800' });
    const before = await projectSnapshot(page);
    await writeVerifiedBalance(page, 'ARS', month, '');
    const after = await projectSnapshot(page);
    expect(after.real).toEqual({});
    expect(after.realConfirmedMonths).toEqual([]);
    expect(balanceTransactions(after)).toEqual(balanceTransactions(before));
    await expectBalances(page, { month, verified: '—', calculated: 'ARS 900', projected: 'ARS 900' });
    await expectBalances(page, { month: later, opening: 'ARS 900', calculated: 'ARS 900', projected: 'ARS 850' });
  });

  test('TC-096 [R] Escape cancela cierres nuevos o existentes sin modificar el proyecto', async ({ page }) => {
    const month = await initialMonth(page);
    await setOpeningBalance(page, 'ARS', '1000');
    let before = await projectSnapshot(page), input = await beginVerifiedEdit(page, 'ARS', month);
    await input.fill('123.45');
    await input.press('Escape');
    await expectBudgetUnchanged(page, before);
    await expectBalances(page, { month, verified: '—' });
    await writeVerifiedBalance(page, 'ARS', month, '500.25');
    before = await projectSnapshot(page);
    input = await beginVerifiedEdit(page, 'ARS', month, 'keyboard');
    await input.fill('999');
    await input.press('Escape');
    await expectBudgetUnchanged(page, before);
    await expectBalances(page, { month, verified: 'ARS 500.25' });
  });

  test('TC-097 [B] Reemplazar cierre con decimales o saldo negativo conserva una sola referencia', async ({ page }) => {
    const month = await initialMonth(page), later = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await createExpense(page, { description: 'Próximo después de descubierto', amount: '10', month: later });
    await writeVerifiedBalance(page, 'ARS', month, '900.25');
    await writeVerifiedBalance(page, 'ARS', month, '750.75', { mode: 'keyboard' });
    await expectBalances(page, { month, verified: 'ARS 750.75', calculated: 'ARS 1,000' });
    await writeVerifiedBalance(page, 'ARS', month, '-25.50', { confirm: 'blur' });
    const project = await projectSnapshot(page);
    expect(project.real).toEqual({ [month]: -25.5 });
    expect(project.realConfirmedMonths).toEqual([month]);
    await expectBalances(page, { month, verified: '-ARS 25.5', calculated: 'ARS 1,000', projected: 'ARS 1,000' });
    await expectBalances(page, { month: later, opening: '-ARS 25.5', calculated: '-ARS 25.5', projected: '-ARS 35.5' });
  });

  test('TC-098 [R] El último cierre anterior manda y corregir uno más antiguo respeta el cierre posterior', async ({ page }) => {
    const first = await initialMonth(page), second = nextMonth(first), third = nextMonth(second);
    await setOpeningBalance(page, 'ARS', '1000');
    for (const [month, description, amount] of [[first, 'Pago uno', '100'], [second, 'Pago dos', '50'], [third, 'Pago tres', '10']]) {
      await createExpense(page, { description, amount, paid: true, month });
    }
    await writeVerifiedBalance(page, 'ARS', first, '800');
    await expectBalances(page, { month: second, opening: 'ARS 800', calculated: 'ARS 750', projected: 'ARS 750' });
    await writeVerifiedBalance(page, 'ARS', second, '600');
    await expectBalances(page, { month: second, calculated: 'ARS 750', verified: 'ARS 600' });
    await expectBalances(page, { month: third, opening: 'ARS 600', calculated: 'ARS 590', projected: 'ARS 590' });
    const before = await projectSnapshot(page);
    await writeVerifiedBalance(page, 'ARS', first, '700');
    expect(balanceTransactions(await projectSnapshot(page))).toEqual(balanceTransactions(before));
    await expectBalances(page, { month: second, opening: 'ARS 700', calculated: 'ARS 650', projected: 'ARS 650', verified: 'ARS 600' });
    await expectBalances(page, { month: third, opening: 'ARS 600', calculated: 'ARS 590', projected: 'ARS 590' });
  });

  test('TC-099 [R] Cierre de diciembre continúa en enero del año siguiente sin reiniciar el saldo', async ({ page }) => {
    const year = (await initialMonth(page)).slice(0, 4), december = `${year}-12`, january = `${Number(year) + 1}-01`;
    await setOpeningBalance(page, 'ARS', '1000');
    await createExpense(page, { description: 'Pago de enero', amount: '50', paid: true, month: january });
    await writeVerifiedBalance(page, 'ARS', december, '700');
    await expectBalances(page, { month: december, calculated: 'ARS 1,000', verified: 'ARS 700' });
    await expectBalances(page, { month: january, opening: 'ARS 700', calculated: 'ARS 650', projected: 'ARS 650', verified: '—' });
    await expectSummaryBalances(page, { month: january, calculated: 'ARS 650', projected: 'ARS 650' });
  });

  test('TC-100 [N] Tenencia calculada y remanente estimado son de sólo lectura en planilla y Resumen', async ({ page }) => {
    const month = await initialMonth(page);
    await setOpeningBalance(page, 'ARS', '1000');
    await createExpense(page, { description: 'Pagado', amount: '100', paid: true, month });
    await createExpense(page, { description: 'Pendiente', amount: '50', month });
    await expectBalances(page, { month, calculated: 'ARS 900', projected: 'ARS 850' });
    const before = await projectSnapshot(page);
    for (const kind of ['confirmed', 'estimated']) {
      await totalCell(page, 'ARS', month, kind).dblclick();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Delete');
      await expect(page.locator('#gw .realEdit, #gw .quickAmount')).toHaveCount(0);
      await expectBudgetUnchanged(page, before);
    }
    await expectSummaryBalances(page, { month, calculated: 'ARS 900', projected: 'ARS 850' });
    await expect(page.locator('.kashActiveCurrencyCards input, .kashActiveCurrencyCards textarea')).toHaveCount(0);
    await expectBudgetUnchanged(page, before);
  });

  test('TC-101 [R] Desactivar USD conserva saldo inicial, cierre e histórico y bloquea editar su cierre', async ({ page }) => {
    const month = await initialMonth(page);
    await addCurrency(page, 'USD');
    await setOpeningBalance(page, 'USD', '200');
    await createExpense(page, { currency: 'USD', description: 'Pago histórico USD', amount: '25', paid: true, month });
    await writeVerifiedBalance(page, 'USD', month, '150');
    await deactivateCurrency(page, 'USD');
    await expectActiveCurrencies(page, ['ARS']);
    const before = await projectSnapshot(page);
    await expectBalances(page, { currency: 'USD', month, opening: 'USD 200', calculated: 'USD 175', projected: 'USD 175', verified: 'USD 150' });
    await expect(page.locator('#gw [data-totals-block="USD"]')).toContainText('History');
    await verifiedCell(page, 'USD', month).locator('.realDisplay').dblclick();
    await expect(page.locator('#darkModal .darkModalTitle')).toHaveText('Currency disabled');
    await expect(page.locator('#gw .realEdit')).toHaveCount(0);
    await page.locator('#darkOk').click();
    await expectBudgetUnchanged(page, before);
  });

  test('TC-102 [R] Recargar conserva bases, cierre ARS cero, cierre USD y saldos por moneda sin duplicar datos', async ({ page }) => {
    const month = await initialMonth(page), later = nextMonth(month);
    await addCurrency(page, 'USD');
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '200.50');
    await createExpense(page, { description: 'ARS pagado', amount: '100', paid: true, month });
    await createExpense(page, { currency: 'USD', description: 'USD pendiente', amount: '20.25', month });
    await createExpense(page, { description: 'ARS siguiente', amount: '5', month: later });
    await createExpense(page, { currency: 'USD', description: 'USD siguiente', amount: '10', paid: true, month: later });
    await writeVerifiedBalance(page, 'ARS', month, '0');
    await writeVerifiedBalance(page, 'USD', month, '150.75');
    const before = await projectSnapshot(page);
    await reloadBalanceProject(page, before);
    await expectBalances(page, { month, calculated: 'ARS 900', projected: 'ARS 900', verified: 'ARS 0' });
    await expectBalances(page, { currency: 'USD', month, calculated: 'USD 200.5', projected: 'USD 180.25', verified: 'USD 150.75' });
    await expectBalances(page, { month: later, opening: 'ARS 0', calculated: 'ARS 0', projected: '-ARS 5', verified: '—' });
    await expectBalances(page, { currency: 'USD', month: later, opening: 'USD 150.75', calculated: 'USD 140.75', projected: 'USD 140.75', verified: '—' });
    const after = await projectSnapshot(page);
    expect(after.expenses).toEqual(before.expenses);
    expect(after.real).toEqual({ [month]: 0 });
    expect(after.realConfirmedMonths).toEqual([month]);
    expect(after.realByCurrency).toEqual({ USD: { [month]: 150.75 } });
    await expectSummaryBalances(page, { currency: 'USD', month: later, calculated: 'USD 140.75', projected: 'USD 140.75' });
  });
});


const { test: upgradeTest } = require('../helpers/upgrade-fixture');
upgradeTest('TC-213 [R] Al cambiar de mes con la app abierta ARS deja de tratar el mes actual como futuro', async ({ page }) => {
  await setOpeningBalance(page, 'ARS', '1000');
  const { openSummary, expectSummaryCard } = require('../helpers/summary');
  const before = await projectSnapshot(page);
  await openSummary(page, '2026-11');
  // Existing rule: a future ARS month with no entries displays a zero projection.
  await expectSummaryCard(page, 'ARS', 'ARS 1,000', 'ARS 0');
  await page.clock.setFixedTime(new Date('2026-11-15T12:00:00-03:00'));
  await require('../helpers/language').goTo(page, 'res');
  expect(await projectSnapshot(page)).toEqual(before);
  await expectSummaryCard(page, 'ARS', 'ARS 1,000', 'ARS 1,000');
});
