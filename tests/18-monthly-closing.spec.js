const { test, expect } = require('../helpers/upgrade-fixture');
const { projectSnapshot, goTo } = require('../helpers/language');
const { addCurrency } = require('../helpers/currencies');
const { setOpeningBalance, writeVerifiedBalance, verifiedCell } = require('../helpers/balances');
const { createExpense } = require('../helpers/expenses');
const { openSummary, expectSummaryCard } = require('../helpers/summary');
const { expectBudgetPersisted } = require('../helpers/monthly-budget');
const { openNotices } = require('../helpers/dates-notifications');

test.use({ startTime: '2026-09-15T12:00:00-03:00' });
test.describe('18 · Cierre mensual · KA$H v0.690', () => {
  test.setTimeout(60_000);
  async function finishedMonth(page) {
    await setOpeningBalance(page, 'ARS', '1000');
    await addCurrency(page, 'USD');
    await setOpeningBalance(page, 'USD', '200');
    await createExpense(page, { month: '2026-09', description: 'Pago septiembre', amount: '25', paid: true });
    await page.clock.setFixedTime(new Date('2026-10-15T12:00:00-03:00'));
    await openSummary(page, '2026-10');
    await expect(page.locator('#kashClosingSummary')).toContainText('September 2026');
  }
  async function openClosing(page) {
    await page.locator('#kashClosingSummary button').click();
    await expect(page.locator('#kashSafetyDialog [role="dialog"]')).toBeVisible();
    await expect(page.locator('#kashClosingPeriod')).toHaveValue('2026-09');
  }
  function withoutClosing(project) {
    const { real, realByCurrency, realConfirmedMonths, monthlyCloseRead, ...rest } = project;
    return rest;
  }

  test('TC-201 [P] El aviso comienza al terminar el mes y sólo avisa el último mes finalizado', async ({ page }) => {
    await expect(page.locator('#kashClosingSummary')).toHaveCount(0);
    // The wizard starts with optional notifications hidden. Enable the bell through Settings.
    await require('../helpers/settings').setVisibleChoice(page, 'reminders', true);
    await finishedMonth(page);
    const before = await projectSnapshot(page);
    await openClosing(page);
    await expect(page.locator('.kashClosingProgress')).toContainText('0/2');
    await expect(page.locator('.kashClosingRow')).toHaveCount(2);
    await page.locator('.kashSafetyClose').click();
    await page.clock.setFixedTime(new Date('2026-11-15T12:00:00-03:00'));
    await goTo(page, 'res');
    await expect(page.locator('#kashClosingSummary')).toContainText('October 2026');
    await openNotices(page);
    await expect(page.locator('.kashClosingNotice')).toHaveCount(1);
    await expect(page.locator('.kashClosingNotice')).toContainText('October 2026');
    expect(await projectSnapshot(page)).toEqual(before);
  });

  test('TC-202 [R] Marcar leído cambia sólo el aviso y no confirma ni completa el cierre', async ({ page }) => {
    await finishedMonth(page);
    const before = await projectSnapshot(page);
    await openClosing(page);
    await page.locator('#kashClosingRead').click();
    await expect(page.locator('.kashClosingProgress')).toContainText('0/2');
    await expect(page.locator('.kashClosingReadState')).toContainText('Notice read');
    const after = await projectSnapshot(page);
    expect(after.monthlyCloseRead).toEqual({ '2026-09': true });
    const { monthlyCloseRead, ...actual } = after;
    const { monthlyCloseRead: previousRead, ...expected } = before;
    expect(actual).toEqual(expected);
    await expectBudgetPersisted(page, after);
    await page.locator('.kashSafetyClose').click();
    await expect(page.locator('#kashClosingSummary')).toBeVisible();
  });

  test('TC-203 [N] Vacío y texto inválido no cierran el mes; cero sí confirma una moneda', async ({ page }) => {
    await finishedMonth(page);
    const before = await projectSnapshot(page);
    await openClosing(page);
    for (const value of ['', 'abc']) {
      await page.locator('#closing-ARS').fill(value);
      await page.locator('[data-confirm-closing="ARS"]').click();
      await expect(page.locator('[data-closing-currency="ARS"] [role="alert"]')).toBeVisible();
      expect(await projectSnapshot(page)).toEqual(before);
    }
    await page.locator('#closing-ARS').fill('0');
    await page.locator('[data-confirm-closing="ARS"]').click();
    await expect(page.locator('.kashClosingProgress')).toContainText('1/2');
    const after = await projectSnapshot(page);
    expect(after.real['2026-09']).toBe(0);
    expect(after.realConfirmedMonths).toContain('2026-09');
    expect(withoutClosing(after)).toEqual(withoutClosing(before));
    await page.locator('#kashClosingGrid').click();
    await expect(verifiedCell(page, 'ARS', '2026-09').locator('.realDisplay')).toHaveText('ARS 0.00');
  });

  test('TC-204 [R] Confirmar una moneda conserva el borrador de otra y completar todas retira el aviso', async ({ page }) => {
    await finishedMonth(page);
    const before = await projectSnapshot(page);
    await openClosing(page);
    await page.locator('#closing-USD').fill('180.25');
    await page.locator('#closing-ARS').fill('-10.5');
    await page.locator('[data-confirm-closing="ARS"]').click();
    await expect(page.locator('#closing-USD')).toHaveValue('180.25');
    await expect(page.locator('.kashClosingProgress')).toContainText('1/2');
    await page.locator('[data-confirm-closing="USD"]').click();
    await expect(page.locator('.kashClosingProgress')).toContainText('2/2');
    const after = await projectSnapshot(page);
    expect(after.real['2026-09']).toBe(-10.5);
    expect(after.realByCurrency.USD['2026-09']).toBe(180.25);
    expect(withoutClosing(after)).toEqual(withoutClosing(before));
    await expectBudgetPersisted(page, after);
    await page.locator('.kashSafetyClose').click();
    await expect(page.locator('#kashClosingSummary')).toHaveCount(0);
    // A verified close is independent of the selected month's calculated amounts.
    await openSummary(page, '2026-09');
    await expectSummaryCard(page, 'ARS', 'ARS 975', 'ARS 975');
    await expectSummaryCard(page, 'USD', 'USD 200', 'USD 200');
  });

  test('TC-205 [B] Sin movimientos se sugiere el cierre previo pero no se confirma automáticamente', async ({ page }) => {
    await addCurrency(page, 'USD');
    await setOpeningBalance(page, 'USD', '100');
    await writeVerifiedBalance(page, 'USD', '2026-09', '100');
    await page.clock.setFixedTime(new Date('2026-11-15T12:00:00-03:00'));
    await openSummary(page, '2026-11');
    const before = await projectSnapshot(page);
    await page.locator('#kashClosingSummary button').click();
    await expect(page.locator('#kashClosingPeriod')).toHaveValue('2026-10');
    await expect(page.locator('#closing-USD')).toHaveValue('100');
    await expect(page.locator('.kashSuggestion')).toBeVisible();
    await expect(page.locator('.kashClosingProgress')).toContainText('0/1');
    expect(await projectSnapshot(page)).toEqual(before);
    await page.locator('.kashSafetyClose').click();
    await createExpense(page, { month: '2026-10', currency: 'USD', description: 'Pendiente impide precarga', amount: '5' });
    await openSummary(page, '2026-11');
    await page.locator('#kashClosingSummary button').click();
    await expect(page.locator('#closing-USD')).toHaveValue('');
    await expect(page.locator('.kashSuggestion')).toHaveCount(0);
  });

  test('TC-206 [R] Ir a planilla conserva el mes de Resumen y selecciona la moneda editada', async ({ page }) => {
    await finishedMonth(page);
    await openClosing(page);
    const before = await projectSnapshot(page);
    await page.locator('#closing-USD').fill('199');
    await page.locator('#kashClosingGrid').click();
    await expect(page.locator('#kashSafetyDialog')).toHaveCount(0);
    await expect(verifiedCell(page, 'USD', '2026-09')).toHaveClass(/realSelected/);
    await expect(verifiedCell(page, 'USD', '2026-09').locator('.realDisplay')).toHaveText('—');
    await goTo(page, 'res');
    await expect(page.locator('.summaryPeriodSelect.period')).toHaveValue('10');
    expect(await projectSnapshot(page)).toEqual(before);
    await expectBudgetPersisted(page, before);
  });
});
