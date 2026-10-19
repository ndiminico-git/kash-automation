const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot } = require('../helpers/language');
const { addCurrency, expectActiveCurrencies } = require('../helpers/currencies');
const { createExpense, nextMonth, readSavedProject } = require('../helpers/expenses');
const { expectBudgetPersisted, expectBudgetUnchanged } = require('../helpers/monthly-budget');
const {
  setOpeningBalance, expectBalances, expectSummaryBalances, writeVerifiedBalance, reloadBalanceProject,
} = require('../helpers/balances');
const {
  adjustmentRows, adjustmentSave, openBalanceAdjustments, fillAdjustment, adjustmentRow,
  createAdjustment, beginAdjustmentEdit, expectAdjustmentRow, expectRejectedAdjustment,
  unrelatedToAdjustments,
} = require('../helpers/balance-adjustments');

const errorsByPage = new WeakMap();
const test = base.extend({
  adjustmentsApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanAdjustmentsProject: [async ({ page, context, adjustmentsApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    const origin = new URL(app.url).origin;
    await context.addInitScript(value => {
      if (location.origin === value) localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await base.step('Preparación: app limpia, idioma y proyecto vacío desde el wizard', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
      await createLanguageProject(page);
      const project = await projectSnapshot(page);
      expect(project.tenAdjustments).toEqual([]);
      expect(project.base).toBe(0);
      expect(project.expenses).toEqual([]);
      expect(project.real).toEqual({});
      expect(project.realByCurrency).toEqual({});
      await expectBudgetPersisted(page, project);
      await openBalanceAdjustments(page);
    });
    page.setDefaultTimeout(5_000);
    await testInfo.attach('adjustments-setup-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, freshProject: true }), contentType: 'application/json',
    });
    await use();
  }, { auto: true, timeout: 60_000 }],
  withUSD: [async ({ page, cleanAdjustmentsProject }, use, testInfo) => {
    const started = Date.now();
    await base.step('Preparación opcional: habilitar USD por UI', async () => {
      await addCurrency(page, 'USD');
      await expectActiveCurrencies(page, ['ARS', 'USD']);
    });
    await testInfo.attach('adjustments-currency-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, currencies: ['ARS', 'USD'] }), contentType: 'application/json',
    });
    await use('USD');
  }, { timeout: 60_000 }],
});

const initialMonth = async page => (await projectSnapshot(page)).inicio;
test.use({ storageState: { cookies: [], origins: [] } });
test.describe('09 · Ajustes de saldo · KA$H v0.690', () => {
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
        fields: Object.fromEntries(['taf', 'tam', 'tad', 'taa', 'tan'].map(id => [id, document.getElementById(id)?.value])),
        table: document.querySelector('.tenAdjTable')?.innerText,
        settingsPage: document.querySelector('.kashSettingsShell')?.dataset.page,
        modal: document.querySelector('#darkModal')?.textContent,
      }));
      await testInfo.attach('adjustments-diagnostic', {
        body: JSON.stringify(diagnostic, null, 2), contentType: 'application/json',
      });
    }
  });

  test('TC-103 [P] Abrir ajustes vacíos muestra formulario y tabla sin crear movimientos', async ({ page }) => {
    const before = await projectSnapshot(page);
    await expect(page.locator('.tenAdjTable .expenseEmpty')).toHaveText('No adjustments recorded.');
    await expect(adjustmentRows(page)).toHaveCount(0);
    await expect(page.locator('#tam option')).toHaveText(['ARS · Argentine peso']);
    await expect(page.locator('#tad option')).toHaveText(['Increase (+)', 'Decrease (-)']);
    await expect(page.locator('#tad')).toHaveValue('plus');
    await expect(page.locator('#taa')).toHaveValue('');
    await expect(page.locator('#tan')).toHaveValue('');
    await expect(page.locator('#taf')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    await expect(adjustmentSave(page)).toHaveText('Add adjustment');
    const month = before.inicio;
    await expectBalances(page, { month, opening: 'ARS 0', calculated: 'ARS 0', projected: 'ARS 0', verified: '—' });
    await expectSummaryBalances(page, { month, calculated: 'ARS 0', projected: 'ARS 0' });
    await openBalanceAdjustments(page);
    await expectBudgetUnchanged(page, before);
  });

  test('TC-104 [P] Ajuste a favor con decimales y nota literal aumenta ARS sin crear ingresos ni cierres', async ({ page }) => {
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    // Un gasto pendiente en el mes siguiente hace visible la proyección futura ARS.
    await createExpense(page, { month: future, description: 'Servicio futuro QA', amount: '20', paid: false });
    const before = await projectSnapshot(page);
    const note = 'Café & ahorro <b>USD</b> "conciliación"';
    const adjustment = await createAdjustment(page, { date: `${month}-28`, amount: '75.25', note: `  ${note}  ` });
    expect(adjustment).toEqual({ id: adjustment.id, f: `${month}-28`, m: 'ARS', a: 75.25, n: note });
    const row = await expectAdjustmentRow(page, adjustment, { amount: '+ARS 75.25', direction: '↑ Increase (+)' });
    await expect(row.locator('.note b')).toHaveCount(0);
    expect(unrelatedToAdjustments(await projectSnapshot(page))).toEqual(unrelatedToAdjustments(before));
    await expectBalances(page, { month, opening: 'ARS 1,000', calculated: 'ARS 1,075.25', projected: 'ARS 1,075.25', verified: '—' });
    await expectBalances(page, { month: future, opening: 'ARS 1,075.25', calculated: 'ARS 1,075.25', projected: 'ARS 1,055.25', verified: '—' });
    await expectSummaryBalances(page, { month, calculated: 'ARS 1,075.25', projected: 'ARS 1,075.25' });
  });

  test('TC-105 [B] Tipo del ajuste define el signo aun con monto negativo y separa monedas y meses', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '200');
    const before = await projectSnapshot(page);
    const decrease = await createAdjustment(page, { date: `${month}-01`, currency: 'USD', direction: 'minus', amount: '-25.50' });
    const increase = await createAdjustment(page, { date: `${month}-28`, currency: 'USD', direction: 'plus', amount: '-10.25' });
    expect(decrease).toEqual({ id: decrease.id, f: `${month}-01`, m: 'USD', a: -25.5, n: '' });
    expect(increase).toEqual({ id: increase.id, f: `${month}-28`, m: 'USD', a: 10.25, n: '' });
    await expectAdjustmentRow(page, decrease, { amount: '-USD 25.5', direction: '↓ Decrease (-)' });
    await expectAdjustmentRow(page, increase, { amount: '+USD 10.25', direction: '↑ Increase (+)' });
    expect(unrelatedToAdjustments(await projectSnapshot(page))).toEqual(unrelatedToAdjustments(before));
    await expectBalances(page, { currency: 'USD', month, opening: 'USD 200', calculated: 'USD 184.75', projected: 'USD 184.75', verified: '—' });
    await expectBalances(page, { currency: 'USD', month: future, opening: 'USD 184.75', calculated: 'USD 184.75', projected: 'USD 184.75', verified: '—' });
    await expectBalances(page, { month, calculated: 'ARS 1,000', projected: 'ARS 1,000', verified: '—' });
    await expectSummaryBalances(page, { currency: 'USD', month, calculated: 'USD 184.75', projected: 'USD 184.75' });
  });

  test('TC-106 [N] Rechazar fecha o monto ausente, cero y texto no numérico sin guardar el borrador', async ({ page }) => {
    const month = await initialMonth(page);
    await createAdjustment(page, { date: `${month}-01`, amount: '10', note: 'Registro que se conserva' });
    const before = await projectSnapshot(page);
    for (const values of [
      { date: '', amount: '25' },
      { date: `${month}-01`, amount: '' },
      { date: `${month}-01`, amount: '0' },
      { date: `${month}-01`, amount: 'abc' },
      { date: `${month}-01`, amount: 'Infinity' },
    ]) {
      await test.step(`Rechazar fecha=${values.date || '(vacía)'}, monto=${values.amount || '(vacío)'}`, async () => {
        await expectRejectedAdjustment(page, { ...values, note: 'Borrador inválido & sin guardar' });
      });
    }
    await expectBudgetUnchanged(page, before);
    await expectBalances(page, { month, calculated: 'ARS 10', projected: 'ARS 10', verified: '—' });
  });

  test('TC-107 [R] Editar fecha, moneda, signo y nota del registro correcto conserva ID y recalcula ambos meses', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '200');
    const first = await createAdjustment(page, { date: `${month}-01`, amount: '100', note: 'Primero en el array' });
    const second = await createAdjustment(page, { date: `${future}-01`, currency: 'USD', direction: 'minus', amount: '10', note: 'Segundo en el array' });
    await expect(adjustmentRows(page).first().locator('.note')).toHaveText(second.n);
    const before = await projectSnapshot(page);
    await beginAdjustmentEdit(page, first);
    await fillAdjustment(page, { date: `${future}-28`, currency: 'USD', direction: 'minus', amount: '25.50', note: 'Corregido & <b>sin formato</b>' });
    await adjustmentSave(page).click();
    await expect(adjustmentSave(page)).toHaveText('Add adjustment');
    const after = await projectSnapshot(page);
    const edited = { id: first.id, f: `${future}-28`, m: 'USD', a: -25.5, n: 'Corregido & <b>sin formato</b>' };
    expect(after.tenAdjustments).toEqual([edited, second]);
    expect(unrelatedToAdjustments(after)).toEqual(unrelatedToAdjustments(before));
    await expect(adjustmentRows(page).first().locator('.note')).toHaveText(edited.n);
    await expectAdjustmentRow(page, edited, { amount: '-USD 25.5', direction: '↓ Decrease (-)' });
    await expectBudgetPersisted(page, after);
    await expectBalances(page, { month, calculated: 'ARS 1,000', projected: 'ARS 1,000' });
    await expectBalances(page, { currency: 'USD', month, calculated: 'USD 200', projected: 'USD 200' });
    await expectBalances(page, { currency: 'USD', month: future, opening: 'USD 200', calculated: 'USD 164.5', projected: 'USD 164.5', verified: '—' });
    await expectSummaryBalances(page, { currency: 'USD', month: future, calculated: 'USD 164.5', projected: 'USD 164.5' });
  });

  test('TC-108 [N] Cancelar una edición descarta fecha, moneda, importe y nota sin cambiar IDs ni saldos', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '200');
    const adjustment = await createAdjustment(page, { date: `${month}-01`, amount: '50', note: 'Nota original' });
    const before = await projectSnapshot(page);
    await beginAdjustmentEdit(page, adjustment);
    await fillAdjustment(page, { date: `${future}-28`, currency: 'USD', direction: 'minus', amount: '999.99', note: 'Borrador descartado' });
    await page.locator('[onclick="cancelTenAdjustment()"]').click();
    await expect(adjustmentSave(page)).toHaveText('Add adjustment');
    await expect(page.locator('[onclick="cancelTenAdjustment()"]')).toHaveCount(0);
    await expectBudgetUnchanged(page, before);
    await expectAdjustmentRow(page, adjustment, { amount: '+ARS 50', direction: '↑ Increase (+)' });
    await beginAdjustmentEdit(page, adjustment);
    await page.locator('[onclick="cancelTenAdjustment()"]').click();
    await expectBudgetUnchanged(page, before);
    await expectBalances(page, { month, calculated: 'ARS 1,050', projected: 'ARS 1,050' });
    await expectBalances(page, { currency: 'USD', month: future, calculated: 'USD 200', projected: 'USD 200', verified: '—' });
  });

  test('TC-109 [R] Cancelar y confirmar borrado en tabla ordenada elimina sólo el ajuste elegido y revierte su efecto', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '200');
    const first = await createAdjustment(page, { date: `${month}-01`, amount: '100', note: 'Conservar ARS' });
    const second = await createAdjustment(page, { date: `${future}-28`, currency: 'USD', direction: 'minus', amount: '50', note: 'Eliminar USD' });
    await expect(adjustmentRows(page).first().locator('.note')).toHaveText(second.n);
    const before = await projectSnapshot(page);
    await (await adjustmentRow(page, second)).locator('.trashbtn').click();
    await expect(page.locator('#darkModal .darkModalText')).toHaveText('Delete this balance adjustment?');
    await page.locator('#darkCancel').click();
    await expectBudgetUnchanged(page, before);
    await expect(adjustmentRows(page)).toHaveCount(2);
    await expectBalances(page, { currency: 'USD', month: future, calculated: 'USD 150', projected: 'USD 150' });
    await openBalanceAdjustments(page);
    await (await adjustmentRow(page, second)).locator('.trashbtn').click();
    await page.locator('#darkOk').click();
    await expect(page.locator('#darkModal')).toHaveCount(0);
    await expect(adjustmentRows(page)).toHaveCount(1);
    const after = await projectSnapshot(page);
    expect(after.tenAdjustments).toEqual([first]);
    expect(unrelatedToAdjustments(after)).toEqual(unrelatedToAdjustments(before));
    await expectBudgetPersisted(page, after);
    await expectBalances(page, { month, calculated: 'ARS 1,100', projected: 'ARS 1,100' });
    await expectBalances(page, { currency: 'USD', month: future, calculated: 'USD 200', projected: 'USD 200', verified: '—' });
    await expectSummaryBalances(page, { currency: 'USD', month: future, calculated: 'USD 200', projected: 'USD 200' });
  });

  test('TC-110 [R] Recargar conserva ajustes e IDs y un cierre anterior evita volver a sumar ajustes ya conciliados', async ({ page, withUSD }) => {
    expect(withUSD).toBe('USD');
    const month = await initialMonth(page), future = nextMonth(month);
    await setOpeningBalance(page, 'ARS', '1000');
    await setOpeningBalance(page, 'USD', '200');
    const expense = await createExpense(page, { currency: 'USD', month: future, description: 'Pendiente USD QA', amount: '10', paid: false });
    const beforeAdjustments = await projectSnapshot(page);
    const ars = await createAdjustment(page, { date: `${month}-01`, direction: 'minus', amount: '25.75', note: 'Conciliación ARS' });
    const usd = await createAdjustment(page, { date: `${month}-28`, currency: 'USD', amount: '10.25', note: 'Antes del cierre' });
    const later = await createAdjustment(page, { date: `${future}-01`, currency: 'USD', direction: 'minus', amount: '5.50', note: 'Después del cierre' });
    expect(unrelatedToAdjustments(await projectSnapshot(page))).toEqual(unrelatedToAdjustments(beforeAdjustments));
    await writeVerifiedBalance(page, 'USD', month, '150.25');
    const beforeReload = await projectSnapshot(page);
    expect(beforeReload.tenAdjustments).toEqual([ars, usd, later]);
    expect(beforeReload.realByCurrency).toEqual({ USD: { [month]: 150.25 } });
    const after = await reloadBalanceProject(page, beforeReload);
    expect(after.tenAdjustments).toEqual([ars, usd, later]);
    expect(after.expenses).toEqual([expense]);
    await expectBalances(page, { month, calculated: 'ARS 974.25', projected: 'ARS 974.25', verified: '—' });
    await expectBalances(page, { currency: 'USD', month, calculated: 'USD 210.25', projected: 'USD 210.25', verified: 'USD 150.25' });
    await expectBalances(page, { currency: 'USD', month: future, opening: 'USD 150.25', calculated: 'USD 144.75', projected: 'USD 134.75', verified: '—' });
    await expectSummaryBalances(page, { currency: 'USD', month: future, calculated: 'USD 144.75', projected: 'USD 134.75' });
    await openBalanceAdjustments(page);
    await expect(adjustmentRows(page)).toHaveCount(3);
    await expectAdjustmentRow(page, ars, { amount: '-ARS 25.75', direction: '↓ Decrease (-)' });
    await expectAdjustmentRow(page, usd, { amount: '+USD 10.25', direction: '↑ Increase (+)' });
    await expectAdjustmentRow(page, later, { amount: '-USD 5.5', direction: '↓ Decrease (-)' });
    expect(await projectSnapshot(page)).toEqual(after);
    // Recargar puede normalizar sólo el contador del próximo ID en memoria.
    // Los IDs de los ajustes/gastos y todos los datos financieros siguen comparándose.
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
