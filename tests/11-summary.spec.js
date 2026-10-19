const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot, settingsPage } = require('../helpers/language');
const { addCurrency, expectActiveCurrencies, optionCodes } = require('../helpers/currencies');
const { createExpense, nextMonth, readSavedProject } = require('../helpers/expenses');
const { createExchange } = require('../helpers/currency-exchange');
const { createAdjustment } = require('../helpers/balance-adjustments');
const { setOpeningBalance, writeVerifiedBalance, reloadBalanceProject } = require('../helpers/balances');
const {
  createMonthlyGroup, createMonthlyService, writeBudgetAmount, toggleBudgetPaid,
  expectBudgetPersisted, expectBudgetUnchanged,
} = require('../helpers/monthly-budget');
const {
  summaryCards, summaryCard, flowCard, openSummary, expectSummaryCard, expectSummaryOrder,
  setSummaryFeatures, enableSummaryConverter, summaryFinancialState, expectFlow,
  openFlowDetails, expectHoldingLine, startSummaryDrag, expectFiniteCharts,
} = require('../helpers/summary');

const errorsByPage = new WeakMap();
const test = base.extend({
  summaryApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanSummaryProject: [async ({ page, context, summaryApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    const origin = new URL(app.url).origin;
    await context.addInitScript(value => {
      if (location.origin === value) localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await base.step('Preparación: idioma, wizard vacío y Gráficos activados desde Ajustes', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
      await createLanguageProject(page);
      const before = await projectSnapshot(page);
      expect(before.expenses).toEqual([]);
      expect(before.fx).toEqual([]);
      expect(before.C).toEqual({});
      await setSummaryFeatures(page, { charts: true, variation: true });
      const after = await projectSnapshot(page);
      expect(summaryFinancialState(after)).toEqual(summaryFinancialState(before));
      await openSummary(page, after.inicio);
    });
    page.setDefaultTimeout(5_000);
    await testInfo.attach('summary-setup-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, freshProject: true, chartsEnabledByUI: true }), contentType: 'application/json',
    });
    await use();
  }, { auto: true, timeout: 60_000 }],
  withUSD: [async ({ page, cleanSummaryProject }, use, testInfo) => {
    const started = Date.now();
    await base.step('Preparación opcional: habilitar USD por UI', async () => {
      await addCurrency(page, 'USD');
      await expectActiveCurrencies(page, ['ARS', 'USD']);
    });
    await testInfo.attach('summary-usd-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, currencies: ['ARS', 'USD'] }), contentType: 'application/json',
    });
    await use('USD');
  }, { timeout: 60_000 }],
  withEUR: [async ({ page, withUSD }, use, testInfo) => {
    expect(withUSD).toBe('USD');
    const started = Date.now();
    await base.step('Preparación opcional: habilitar EUR por UI', async () => {
      await addCurrency(page, 'EUR');
      await expectActiveCurrencies(page, ['ARS', 'EUR', 'USD']);
    });
    await testInfo.attach('summary-eur-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, currencies: ['ARS', 'EUR', 'USD'] }), contentType: 'application/json',
    });
    await use(['ARS', 'EUR', 'USD']);
  }, { timeout: 60_000 }],
  withFive: [async ({ page, withEUR }, use, testInfo) => {
    expect(withEUR).toEqual(['ARS', 'EUR', 'USD']);
    const started = Date.now();
    for (const [code, order] of [
      ['BRL', ['ARS', 'BRL', 'EUR', 'USD']],
      ['CNY', ['ARS', 'BRL', 'CNY', 'EUR', 'USD']],
    ]) {
      await addCurrency(page, code);
      await openSummary(page);
      await expectSummaryOrder(page, order);
      for (const currency of order) await expect(summaryCard(page, currency)).toBeVisible();
    }
    await testInfo.attach('summary-five-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, currencies: ['ARS', 'BRL', 'CNY', 'EUR', 'USD'] }), contentType: 'application/json',
    });
    await use(['ARS', 'BRL', 'CNY', 'EUR', 'USD']);
  }, { timeout: 60_000 }],
  confirmedSummary: [async ({ page, withUSD }, use, testInfo) => {
    expect(withUSD).toBe('USD');
    const started = Date.now(), month = (await projectSnapshot(page)).inicio;
    let received, pendingIncome;
    await base.step('Preparación opcional: ingresos, gastos, cambio y ajuste por sus formularios', async () => {
      await setOpeningBalance(page, 'ARS', '1000');
      await setOpeningBalance(page, 'USD', '100');
      const group = await createMonthlyGroup(page, { name: 'Ingresos QA', type: 'i' });
      received = await createMonthlyService(page, { name: 'Sueldo recibido & <b>QA</b>', group });
      pendingIncome = await createMonthlyService(page, { name: 'Ingreso pendiente QA', group });
      await writeBudgetAmount(page, received, month, '200');
      await toggleBudgetPaid(page, received, month);
      await writeBudgetAmount(page, pendingIncome, month, '300');
      await createExpense(page, { month, description: 'Café pagado QA', amount: '50', paid: true });
      await createExpense(page, { month, description: 'Servicio pendiente QA', amount: '75', paid: false });
      await createExchange(page, { month, amount: '10', rate: '2', fee: '1', note: 'Cambio QA' });
      await createAdjustment(page, { date: `${month}-01`, amount: '5', note: 'Conciliación QA' });
      await openSummary(page, month);
    });
    await testInfo.attach('summary-confirmed-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, seed: 'UI-only confirmed/pending income, expenses, FX and adjustment' }), contentType: 'application/json',
    });
    await use({ month, received, pendingIncome });
  }, { timeout: 60_000 }],
});

const initialMonth = async page => (await projectSnapshot(page)).inicio;
test.use({ storageState: { cookies: [], origins: [] } });
test.describe('11 · Resumen · KA$H v0.690', () => {
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', { body: JSON.stringify(errors), contentType: 'application/json' });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const diagnostic = await page.evaluate(() => ({
        project: typeof window.KASHGetProjectJson === 'function' ? JSON.parse(window.KASHGetProjectJson()) : null,
        persisted: JSON.parse(localStorage.getItem('kash') || 'null'),
        period: [...document.querySelectorAll('.summaryPeriodSelect')].map(el => [el.className, el.value]),
        cards: [...document.querySelectorAll('.kashActiveCurrencyCards > [data-estimate-currency]')].map(el => ({ code: el.dataset.estimateCurrency, text: el.innerText })),
        detail: document.querySelector('#holdingDetails')?.innerText,
        modal: document.querySelector('#flowDetailOverlay')?.innerText,
        tooltip: document.querySelector('#kashAppTooltip')?.textContent,
        dragGhost: !!document.querySelector('.kashCurrencyDragGhost'),
        dashboard: document.querySelector('.summaryDashboard')?.innerText,
      }));
      await testInfo.attach('summary-diagnostic', { body: JSON.stringify(diagnostic, null, 2), contentType: 'application/json' });
    }
  });

  test('TC-123 [P] Resumen vacío muestra una moneda en cero, estados vacíos y gráficos sin NaN ni datos inventados', async ({ page }) => {
    const before = await projectSnapshot(page);
    await expectSummaryOrder(page, ['ARS']);
    await expectSummaryCard(page, 'ARS', 'ARS 0', 'ARS 0');
    await expect(summaryCard(page, 'ARS').locator('.holdingVariation')).toHaveText('— No previous balance');
    await expect(page.locator('.movementsCard')).toContainText('No confirmed transactions in this period.');
    await expect(page.locator('.flowTile')).toHaveCount(0);
    await expect(page.locator('.distributionPanel .chartEmpty')).toContainText('No expenses recorded');
    await expect(page.locator('.principalExpensesPanel .chartEmpty')).toHaveText('No expenses recorded.');
    await expect(page.locator('.distributionPanel .donutSvg')).toHaveCount(0);
    await expectFiniteCharts(page);
    await expectBudgetUnchanged(page, before);
  });

  test('TC-124 [R] Navegar períodos respeta el inicio y cruza diciembre/enero mostrando los saldos del mes elegido', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page), december = `${month.slice(0, 4)}-12`, january = nextMonth(december);
    await setOpeningBalance(page, 'USD', '100');
    await createExpense(page, { currency: 'USD', month: december, description: 'Diciembre pagado', amount: '10', paid: true });
    await createExpense(page, { currency: 'USD', month: january, description: 'Enero pendiente', amount: '5', paid: false });
    const before = await projectSnapshot(page);
    await openSummary(page, month);
    const options = await page.locator('.summaryPeriodSelect.period option').evaluateAll(xs => xs.map(x => Number(x.value)));
    expect(options.every(value => value >= Number(month.slice(5, 7)))).toBe(true);
    await page.locator('.navPeriodArrow').first().click();
    await expect(page.locator('.summaryPeriodSelect.period')).toHaveValue(month.slice(5, 7));
    await openSummary(page, december);
    await expectSummaryOrder(page, ['ARS', 'USD']);
    await expectSummaryCard(page, 'USD', 'USD 90', 'USD 90');
    await page.locator('.navPeriodArrow').nth(1).click();
    await expect(page.locator('.summaryPeriodSelect.year')).toHaveValue(january.slice(0, 4));
    await expect(page.locator('.summaryPeriodSelect.period')).toHaveValue('01');
    await expectSummaryCard(page, 'USD', 'USD 90', 'USD 85');
    await page.locator('.navPeriodArrow').first().click();
    await expect(page.locator('.summaryPeriodSelect.year')).toHaveValue(december.slice(0, 4));
    await expect(page.locator('.summaryPeriodSelect.period')).toHaveValue('12');
    await expectSummaryCard(page, 'USD', 'USD 90', 'USD 90');
    await expectBudgetUnchanged(page, before);
  });

  test('TC-125 [R] Movimientos confirmados separan monedas y no confunden flujo neto con saldo o remanente estimado', async ({ page, confirmedSummary }) => {
    const before = await projectSnapshot(page);
    await expect(page.locator('.flowTile')).toHaveCount(6);
    await expectFlow(page, 'ARS', { income: 'ARS 220', out: 'ARS 50', net: 'ARS 170' });
    await expectFlow(page, 'USD', { income: 'USD 0', out: 'USD 11', net: '-USD 11' });
    await expectSummaryCard(page, 'ARS', 'ARS 1,175', 'ARS 1,400');
    await expectSummaryCard(page, 'USD', 'USD 89', 'USD 89');
    expect(confirmedSummary.month).toBe(before.inicio);
    await expectBudgetUnchanged(page, before);
  });

  test('TC-126 [P] Ojitos abren desgloses con pagos y cambios correctos y cerrar o pulsar Escape no altera datos', async ({ page, confirmedSummary }) => {
    const before = await projectSnapshot(page);
    await openFlowDetails(page, 'ARS', 'income', 'ARS 220');
    await expect(page.locator('#flowDetailHeading')).toHaveText('Income · ARS');
    await expect(page.locator('.flowDetailScroll')).toContainText(confirmedSummary.received.n);
    await expect(page.locator('.flowDetailScroll')).not.toContainText(confirmedSummary.pendingIncome.n);
    await expect(page.locator('.flowDetailRow span').filter({ hasText: '<b>QA</b>' }).locator('b')).toHaveCount(0);
    await expect(page.locator('.flowDetailRow strong')).toHaveText(['ARS 200', 'ARS 20']);
    await page.locator('.flowDetailClose').click();
    await expect(page.locator('#flowDetailOverlay')).toHaveCount(0);
    await openFlowDetails(page, 'ARS', 'out', 'ARS 50');
    await expect(page.locator('.flowDetailRow strong')).toHaveText(['-ARS 50']);
    await page.keyboard.press('Escape');
    await expect(page.locator('#flowDetailOverlay')).toHaveCount(0);
    await openFlowDetails(page, 'ARS', 'net', 'ARS 170');
    await expect(page.locator('#flowDetailHeading')).toHaveText('Net cash flow · ARS');
    await expect(page.locator('.flowDetailRow strong')).toHaveText(['ARS 200', 'ARS 20', '-ARS 50']);
    await page.locator('.flowDetailClose').click();
    await openFlowDetails(page, 'USD', 'out', 'USD 11');
    await expect(page.locator('.flowDetailGroupTitle')).toContainText(['Expenses paid (green check) · USD 0', 'Currency sent (including fee) · USD 11']);
    await expect(page.locator('.flowDetailRow strong')).toHaveText(['-USD 11']);
    await page.keyboard.press('Escape');
    await expectBudgetUnchanged(page, before);
  });

  test('TC-127 [R] Detalle de tenencia concilia base, pagos, cambio, ajuste y cierre sin reemplazar el calculado', async ({ page, confirmedSummary }) => {
    await writeVerifiedBalance(page, 'ARS', confirmedSummary.month, '1180');
    await openSummary(page, confirmedSummary.month);
    const before = await projectSnapshot(page), card = summaryCard(page, 'ARS');
    await card.click();
    await expect(card).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#holdingDetails h3')).toHaveText('Balance details · ARS');
    for (const [label, amount] of [
      ['Opening balance', '+ARS 1,000'], ['Confirmed income', '+ARS 200'],
      ['Confirmed expenses', '-ARS 50'], ['Balance adjustments', '+ARS 5'],
      ['Calculated balance', '+ARS 1,175'], ['Verified month-end balance', '+ARS 1,180'],
      ['Difference at verified close', '+ARS 5'],
    ]) await expectHoldingLine(page, label, amount);
    await page.locator('.holdingFxDetails summary').click();
    await expect(page.locator('.holdingFxDetails b')).toHaveText(['ARS 20', 'ARS 0']);
    await expectSummaryCard(page, 'ARS', 'ARS 1,175', 'ARS 1,400');
    await page.locator('[onclick="closeHoldingDetail()"]').click();
    await expect(page.locator('#holdingDetails')).toHaveCount(0);
    await expect(card).toBeFocused();
    await card.press('Enter');
    await expect(page.locator('#holdingDetails')).toBeVisible();
    await card.press('Enter');
    await expect(page.locator('#holdingDetails')).toHaveCount(0);
    await expectBudgetUnchanged(page, before);
  });

  test('TC-128 [P] Variación mensual muestra subida, bajada y cero con tooltip propio y base anterior correcta', async ({ page, withEUR }) => {
    expect(withEUR).toEqual(['ARS', 'EUR', 'USD']);
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '100');
    await createAdjustment(page, { date: `${future}-01`, amount: '100', note: 'Aumento ARS' });
    await createExpense(page, { currency: 'USD', month: future, description: 'Disminución USD por pago', amount: '20', paid: true });
    await openSummary(page, future);
    const before = await projectSnapshot(page);
    const up = summaryCard(page, 'ARS').locator('.holdingVariation');
    await expect(up).toHaveClass(/\bup\b/);
    await expect(up).toHaveText(/^▲ 10% vs /);
    await expect(summaryCard(page, 'USD').locator('.holdingVariation')).toHaveText(/^▼ 20% vs /);
    await expect(summaryCard(page, 'EUR').locator('.holdingVariation')).toHaveText(/^= 0% vs /);
    await up.hover();
    const tip = page.locator('#kashAppTooltip');
    await expect(tip).toBeVisible();
    await expect(tip).toHaveAttribute('role', 'tooltip');
    await expect(tip).toContainText('Previous balance: ARS 1,000');
    await expect(tip).toContainText('Change: ARS 100');
    await expect(up).toHaveAttribute('aria-describedby', /kashAppTooltip/);
    expect(await up.getAttribute('title')).toBeNull();
    expect(await tip.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgb(255, 255, 255)');
    await page.keyboard.press('Escape');
    await expect(tip).not.toBeVisible();
    await expectBudgetUnchanged(page, before);
  });

  test('TC-129 [B] Base anterior cero no divide por cero y una base negativa usa porcentaje sobre su valor absoluto', async ({ page, withEUR }) => {
    expect(withEUR).toEqual(['ARS', 'EUR', 'USD']);
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'USD', '-100');
    await createAdjustment(page, { date: `${future}-01`, currency: 'USD', amount: '50', note: 'Recuperación de saldo negativo' });
    await createExpense(page, { currency: 'EUR', month: future, description: 'Primera devolución EUR', amount: '-10', paid: true });
    await openSummary(page, future);
    const before = await projectSnapshot(page);
    await expectSummaryCard(page, 'USD', '-USD 50', '-USD 50');
    await expect(summaryCard(page, 'USD').locator('.holdingVariation')).toHaveText(/^▲ 50% vs /);
    const badge = summaryCard(page, 'EUR').locator('.holdingVariation');
    await expect(badge).toHaveText('▲ No baseline');
    await expect(badge).toHaveClass(/no-base/);
    await badge.hover();
    await expect(page.locator('#kashAppTooltip')).toContainText('The previous balance was zero; a percentage cannot be calculated.');
    await expect(page.locator('#kashAppTooltip')).not.toContainText(/NaN|Infinity/);
    await expect(summaryCard(page, 'ARS').locator('.holdingVariation')).toHaveText(/^= 0% vs /);
    await page.keyboard.press('Escape');
    await expectBudgetUnchanged(page, before);
  });

  test('TC-130 [R] Moneda de gráficos cambia distribución, barras y tendencia sin convertir tarjetas ni alterar el cotizador', async ({ page, withEUR }) => {
    expect(withEUR).toEqual(['ARS', 'EUR', 'USD']);
    const month = await initialMonth(page);
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '100');
    await createExpense(page, { month, description: 'ARS pagado', amount: '30', paid: true });
    await createExpense(page, { month, description: 'ARS pendiente', amount: '70', paid: false });
    await createExpense(page, { currency: 'USD', month, description: 'USD pendiente', amount: '25', paid: false });
    await enableSummaryConverter(page);
    await openSummary(page, month);
    const before = await projectSnapshot(page);
    const converter = [await page.locator('#convFrom').inputValue(), await page.locator('#convTo').inputValue()];
    const picker = page.locator('.kashChartCurrency select');
    expect(await optionCodes(picker)).toEqual(['ARS', 'EUR', 'USD']);
    await expect(page.locator('.donutCenterLabel')).toHaveText('ARS');
    await expect(page.locator('.donutCenterValue')).toHaveText('100');
    await picker.selectOption('USD');
    await expect(page.locator('.donutCenterLabel')).toHaveText('USD');
    await expect(page.locator('.donutCenterValue')).toHaveText('25');
    await expect(page.locator('.legendAmt')).toHaveText(['USD 25']);
    await expect(page.locator('.principalExpensesPanel .rankValue')).toHaveText(['USD 25']);
    await expect(page.locator('.flowChartPanel .sub')).toContainText('USD');
    await page.locator('.flowChartPanel rect[fill="url(#barExpGrad)"]').last().hover();
    await expect(page.locator('#trendTip .ttValue')).toHaveText('USD 25');
    await page.locator('.remHoverHit').last().hover();
    await expect(page.locator('#trendTip .ttValue')).toHaveText('USD 75');
    await expectSummaryCard(page, 'ARS', 'ARS 970', 'ARS 900');
    await expectSummaryCard(page, 'USD', 'USD 100', 'USD 75');
    await picker.selectOption('EUR');
    await expect(page.locator('.distributionPanel .chartEmpty')).toContainText('No expenses recorded');
    await expect(page.locator('.donutSvg')).toHaveCount(0);
    await expectFiniteCharts(page);
    expect([await page.locator('#convFrom').inputValue(), await page.locator('#convTo').inputValue()]).toEqual(converter);
    const order = await page.locator('.summarySideCol').evaluate(el => {
      const converter = el.querySelector('.quickConverter'), picker = el.querySelector('.kashChartCurrency'), chart = el.querySelector('.distributionPanel');
      return { converterBeforePicker: !!(converter.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING),
        pickerBeforeChart: !!(picker.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
    expect(order).toEqual({ converterBeforePicker: true, pickerBeforeChart: true });
    await expectBudgetUnchanged(page, before);
  });

  test('TC-131 [R] Período de distribución es independiente del Resumen y actualizarlo no cambia tarjetas ni datos', async ({ page }) => {
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await createExpense(page, { month, description: 'Gasto actual', amount: '100', paid: false });
    await createExpense(page, { month: future, description: 'Gasto futuro', amount: '50', paid: false });
    await openSummary(page, month);
    const before = await projectSnapshot(page);
    await expect(page.locator('.donutCenterValue')).toHaveText('100');
    await page.locator('.chartSelectYear').selectOption(future.slice(0, 4));
    await page.locator('.chartSelectMonth').selectOption(future.slice(5, 7));
    await expect(page.locator('.donutCenterValue')).toHaveText('50');
    await expect(page.locator('.summaryPeriodSelect.year')).toHaveValue(month.slice(0, 4));
    await expect(page.locator('.summaryPeriodSelect.period')).toHaveValue(month.slice(5, 7));
    await expectSummaryCard(page, 'ARS', 'ARS 1,000', 'ARS 900');
    await expect(page.locator('.principalExpensesPanel .rankValue')).toHaveText(['ARS 100']);
    await page.locator('.chartSelectYear').selectOption(month.slice(0, 4));
    await page.locator('.chartSelectMonth').selectOption(month.slice(5, 7));
    await expect(page.locator('.donutCenterValue')).toHaveText('100');
    await expectBudgetUnchanged(page, before);
  });

  test('TC-132 [R] Ocultar y restaurar gráficos, cotizador y variación conserva tarjetas, saldos y movimientos', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page);
    await setOpeningBalance(page, 'ARS', '1000');
    await createExpense(page, { month, description: 'Gasto conservado', amount: '100', paid: true });
    await enableSummaryConverter(page);
    const before = await projectSnapshot(page);
    await expect(page.locator('.distributionPanel')).toBeVisible();
    await expect(page.locator('.quickConverter')).toBeVisible();
    await expect(summaryCard(page, 'ARS').locator('.holdingVariation')).toBeVisible();
    await setSummaryFeatures(page, { charts: false, converter: false, variation: false });
    await openSummary(page, month);
    await expect(page.locator('.distributionPanel')).not.toBeVisible();
    await expect(page.locator('.flowChartPanel')).not.toBeVisible();
    await expect(page.locator('.quickConverter')).not.toBeVisible();
    await expect(summaryCard(page, 'ARS').locator('.holdingVariation')).not.toBeVisible();
    await expect(page.locator('.holdingsCard')).toBeVisible();
    await expect(page.locator('.movementsCard')).toBeVisible();
    await expectSummaryCard(page, 'ARS', 'ARS 900', 'ARS 900');
    expect(summaryFinancialState(await projectSnapshot(page))).toEqual(summaryFinancialState(before));
    await setSummaryFeatures(page, { charts: true, converter: true, variation: true });
    await openSummary(page, month);
    await expect(page.locator('.distributionPanel')).toBeVisible();
    await expect(page.locator('.quickConverter')).toBeVisible();
    await expect(summaryCard(page, 'ARS').locator('.holdingVariation')).toBeVisible();
    await expectSummaryCard(page, 'ARS', 'ARS 900', 'ARS 900');
    const after = await projectSnapshot(page);
    expect(summaryFinancialState(after)).toEqual(summaryFinancialState(before));
    expect(after.displayOptions).toMatchObject({ charts: true, converter: true, variation: true });
    await expectBudgetPersisted(page, after);
  });

  test('TC-133 [R] Arrastre visible y teclado intercambian tarjetas; Escape y límites conservan el orden y los datos', async ({ page, withEUR }) => {
    expect(withEUR).toEqual(['ARS', 'EUR', 'USD']);
    await openSummary(page);
    await expectSummaryOrder(page, ['ARS', 'EUR', 'USD']);
    const before = await projectSnapshot(page);
    try {
      await startSummaryDrag(page, 'USD', 'ARS');
    } finally { await page.mouse.up(); }
    await expectSummaryOrder(page, ['USD', 'EUR', 'ARS']);
    await expect(page.locator('.kashCurrencyDragGhost')).toHaveCount(0);
    await expect(page.locator('#holdingDetails')).toHaveCount(0);
    await summaryCard(page, 'USD').focus();
    await summaryCard(page, 'USD').press('Alt+ArrowRight');
    await expectSummaryOrder(page, ['EUR', 'USD', 'ARS']);
    await expect(summaryCard(page, 'USD')).toBeFocused();
    await summaryCard(page, 'USD').press('Alt+ArrowLeft');
    await expectSummaryOrder(page, ['USD', 'EUR', 'ARS']);
    const beforeCancel = await projectSnapshot(page);
    await summaryCard(page, 'ARS').focus();
    await summaryCard(page, 'ARS').press('Alt+ArrowRight');
    await expectBudgetUnchanged(page, beforeCancel);
    try {
      await startSummaryDrag(page, 'USD', 'EUR');
      await page.keyboard.press('Escape');
    } finally { await page.mouse.up(); }
    await expect(page.locator('.kashCurrencyDragGhost')).toHaveCount(0);
    await expectSummaryOrder(page, ['USD', 'EUR', 'ARS']);
    await expectBudgetUnchanged(page, beforeCancel);
    expect(summaryFinancialState(await projectSnapshot(page))).toEqual(summaryFinancialState(before));
    await settingsPage(page, 'money', 'currencies');
    await expect(page.locator('.kashCurrencyList .kashCurrencyName b')).toHaveText(['ARS', 'EUR', 'USD']);
    await page.locator('#nav').getByRole('button', { name: 'Currency exchange', exact: true }).click();
    expect(await optionCodes(page.locator('#m1'))).toEqual(['ARS', 'EUR', 'USD']);
    expect(await optionCodes(page.locator('#m2'))).toEqual(['ARS', 'EUR', 'USD']);
  });

  test('TC-134 [R] Cinco tarjetas conservan importes, orden personalizado y preferencias al recargar sin duplicar datos', async ({ page, withFive }) => {
    expect(withFive).toEqual(['ARS', 'BRL', 'CNY', 'EUR', 'USD']);
    const month = await initialMonth(page);
    for (const [currency, value] of [['ARS', '1000'], ['BRL', '2'], ['CNY', '3'], ['EUR', '50'], ['USD', '100']]) {
      await setOpeningBalance(page, currency, value);
    }
    const expense = await createExpense(page, { currency: 'USD', month, description: 'Pendiente USD para conservar', amount: '10', paid: false });
    await openSummary(page, month);
    await expectSummaryOrder(page, ['ARS', 'BRL', 'CNY', 'EUR', 'USD']);
    await summaryCard(page, 'USD').focus();
    await summaryCard(page, 'USD').press('Alt+ArrowLeft');
    await summaryCard(page, 'USD').press('Alt+ArrowLeft');
    await expectSummaryOrder(page, ['ARS', 'BRL', 'USD', 'CNY', 'EUR']);
    await setSummaryFeatures(page, { charts: false, converter: false, variation: false });
    await openSummary(page, month);
    const before = await projectSnapshot(page);
    expect(before.summaryCurrencyOrder).toEqual(['ARS', 'BRL', 'USD', 'CNY', 'EUR']);
    const after = await reloadBalanceProject(page, before);
    await openSummary(page, month);
    await expectSummaryOrder(page, ['ARS', 'BRL', 'USD', 'CNY', 'EUR']);
    for (const [currency, calculated, projected] of [
      ['ARS', 'ARS 1,000', 'ARS 1,000'], ['BRL', 'BRL 2', 'BRL 2'],
      ['CNY', 'CNY 3', 'CNY 3'], ['EUR', 'EUR 50', 'EUR 50'], ['USD', 'USD 100', 'USD 90'],
    ]) {
      await expect(summaryCard(page, currency)).toBeVisible();
      await expectSummaryCard(page, currency, calculated, projected);
    }
    await expect(page.locator('.distributionPanel')).not.toBeVisible();
    await expect(page.locator('.quickConverter')).not.toBeVisible();
    await expect(summaryCard(page, 'USD').locator('.holdingVariation')).not.toBeVisible();
    expect(after.expenses).toEqual([expense]);
    expect(after.displayOptions).toMatchObject({ charts: false, converter: false, variation: false });
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


const { test: upgradeTest } = require('../helpers/upgrade-fixture');
upgradeTest.describe('11 · Cotizador manual · KA$H v0.690', () => {
  upgradeTest.setTimeout(60_000);
  upgradeTest('TC-200 [R] Tasa manual valida cero y negativos, convierte offline y no crea transacciones', async ({ page }) => {
    await addCurrency(page, 'USD');
    await enableSummaryConverter(page);
    const before = await projectSnapshot(page);
    await page.locator('[onclick="openConverterRates()"]').click();
    for (const invalid of ['0', '-1', 'abc']) {
      await page.locator('#converterManualArs').fill(invalid);
      await page.locator('#converterManualEur').fill('0.8');
      await page.locator('#converterManualApply').click();
      await expect(page.locator('#converterManualError')).toHaveText('Enter exchange rates greater than zero.');
      expect(await page.evaluate(() => localStorage.getItem('kash_converter_manual_v1'))).toBeNull();
    }
    await page.locator('#converterManualArs').fill('1500');
    await page.locator('#converterManualEur').fill('0.8');
    await page.locator('#converterManualApply').click();
    await require('../helpers/settings').setOnlinePreference(page, false);
    await openSummary(page, '2026-10');
    await expect(page.locator('.quickConverter')).toBeVisible();
    await page.locator('#convFrom').selectOption('USD');
    await page.locator('#convTo').selectOption('ARS');
    await page.locator('#convAmount').fill('2');
    await expect(page.locator('#convResult')).toHaveText('ARS 3,000');
    await expect(page.locator('.quickConverter .marketQuoteStatus')).toContainText('Manual rate');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kash_converter_manual_v1'))))
      .toMatchObject({ usdArs: 1500, usdEur: 0.8 });
    expect(await projectSnapshot(page)).toEqual(before);
    await expectBudgetPersisted(page, before);
    await page.locator('[onclick="clearConverterManualRates()"]').click();
    await expect(page.locator('.quickConverter')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('kash_converter_manual_v1'))).toBeNull();
  });
});
