const { test, expect } = require('@playwright/test');
const { settingsPage, goTo, projectSnapshot } = require('./language');
const { readSavedProject } = require('./expenses');
const { selectBudgetYear, expectBudgetPersisted } = require('./monthly-budget');

const verifiedCell = (page, currency, month) => page.locator(
  `#gw td.realCell[data-real-currency="${currency}"][data-month="${month}"]`);
const totalCell = (page, currency, month, kind) => page.locator(
  `#gw tr[data-total-currency="${currency}"][data-total-kind="${kind}"] td[data-total-month="${month}"]`);

async function setOpeningBalance(page, currency, amount) {
  await test.step(`Saldo inicial ${currency}: ${amount}`, async () => {
    await settingsPage(page, 'money', 'balances');
    await page.locator(`#bh_${currency}`).fill(amount);
    await page.locator(`#bh_${currency}`).press('Tab');
    await expect.poll(async () => {
      const p = await readSavedProject(page);
      return currency === 'ARS' ? p?.base : p?.ten?.filter(t => t.m === currency).map(t => t.ini);
    }).toEqual(currency === 'ARS' ? Number(amount) : [Number(amount)]);
    await expectBudgetPersisted(page, await projectSnapshot(page));
  });
}

async function beginVerifiedEdit(page, currency, month, mode = 'double-click') {
  await selectBudgetYear(page, Number(month.slice(0, 4)));
  const cell = verifiedCell(page, currency, month);
  if (mode === 'keyboard') {
    await cell.click();
    await page.keyboard.press('Enter');
  } else await cell.locator('.realDisplay').dblclick();
  await expect(cell.locator('.realEdit')).toBeFocused();
  return cell.locator('.realEdit');
}

async function writeVerifiedBalance(page, currency, month, amount, { mode, confirm = 'Enter' } = {}) {
  await test.step(`Cierre comprobado ${currency}, ${month}: ${amount === '' ? '(vacío)' : amount}`, async () => {
    const input = await beginVerifiedEdit(page, currency, month, mode);
    await input.fill(amount);
    if (confirm === 'blur') await page.locator('.yearNavLabel').click();
    else await input.press('Enter');
    await expect(page.locator('#gw .realEdit')).toHaveCount(0);
    await expectBudgetPersisted(page, await projectSnapshot(page));
  });
}

async function expectBalances(page, { currency = 'ARS', month, opening, calculated, projected, verified }) {
  await test.step(`Verificar saldos ${currency}, ${month}`, async () => {
    await selectBudgetYear(page, Number(month.slice(0, 4)));
    for (const [kind, value] of Object.entries({ opening, confirmed: calculated, estimated: projected })) {
      if (value !== undefined) await expect(totalCell(page, currency, month, kind)).toHaveText(value);
    }
    if (verified !== undefined) await expect(verifiedCell(page, currency, month).locator('.realDisplay')).toHaveText(verified);
  });
}

async function expectSummaryBalances(page, { currency = 'ARS', month, calculated, projected }) {
  await goTo(page, 'res');
  const year = month.slice(0, 4), period = month.slice(5, 7);
  await page.locator('.summaryPeriodSelect.year').selectOption(year);
  await page.locator('.summaryPeriodSelect.period').selectOption(period);
  const card = page.locator(`.kashActiveCurrencyCards > [data-estimate-currency="${currency}"]`);
  await expect(card.locator('.holdingText > strong')).toHaveText(calculated);
  await expect(card.locator('.currencyCardEstimate .approxValue')).toHaveText(projected);
}

function balanceTransactions(project) {
  const keys = ['base', 'ten', 'rub', 'groups', 'C', 'expenses', 'fx', 'tenAdjustments'];
  return Object.fromEntries(keys.map(key => [key, project[key]]));
}

async function reloadBalanceProject(page, before) {
  await page.reload();
  await expect(page.locator('#kashLanguageDialog')).toHaveCount(0);
  await expect(page.locator('#kashLearning')).toHaveCount(0);
  const after = await projectSnapshot(page);
  const { nid: beforeNextId, ...expected } = before;
  const { nid: afterNextId, ...actual } = after;
  expect(afterNextId).toBeGreaterThanOrEqual(beforeNextId);
  expect(actual).toEqual(expected);
  // Migrar puede normalizar nid; el resto de la información financiera persistida debe coincidir.
  await expect.poll(async () => {
    const stored = await readSavedProject(page);
    if (!stored) return null;
    const { nid, ...financialProject } = stored;
    return financialProject;
  }).toEqual(actual);
  return after;
}

module.exports = {
  verifiedCell, totalCell, setOpeningBalance, beginVerifiedEdit, writeVerifiedBalance,
  expectBalances, expectSummaryBalances, balanceTransactions, reloadBalanceProject,
};
