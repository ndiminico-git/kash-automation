const { test, expect } = require('@playwright/test');
const { goTo, projectSnapshot } = require('./language');
const { expectBudgetPersisted, expectBudgetUnchanged } = require('./monthly-budget');

const exchangeRows = page => page.locator('.fxTable tbody tr[data-fx-index]');
const exchangeRow = (page, index) => page.locator(`.fxTable tbody tr[data-fx-index="${index}"]`);
const exchangeSave = page => page.locator('[onclick="saveFxForm()"]');
const exchangeFilter = (page, column) => page.locator(`[data-fx-filter="${column}"]`);
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const monthLabel = month => `${monthNames[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

async function openCurrencyExchange(page) {
  if (!await page.locator('#fa').isVisible()) await goTo(page, 'fx');
  await expect(page.locator('.fxTable')).toBeVisible();
  await expect(page.locator('#fa')).toBeEditable();
}

async function fillExchange(page, {
  from = 'USD', to = 'ARS', amount = '', rate = '', fee = '0', month, note = '',
}) {
  await openCurrencyExchange(page);
  await page.locator('#m1').selectOption(from);
  await page.locator('#m2').selectOption(to);
  await page.locator('#fa').fill(amount);
  await page.locator('#ft').fill(rate);
  await page.locator('#fc').fill(fee);
  if (month !== undefined) await page.locator('#fd').fill(month);
  await page.locator('#fn').fill(note);
}

function unrelatedToExchanges(project) {
  const { fx, ...rest } = project;
  return rest;
}

async function createExchange(page, values) {
  return test.step(`Registrar cambio ${values.from || 'USD'} → ${values.to || 'ARS'}, ${values.amount}`, async () => {
    const before = await projectSnapshot(page);
    await fillExchange(page, values);
    await expect(exchangeSave(page)).toHaveText('Add exchange');
    await exchangeSave(page).click();
    const after = await projectSnapshot(page), index = before.fx.length;
    expect(after.fx).toHaveLength(index + 1);
    expect(after.fx.slice(0, index)).toEqual(before.fx);
    expect(unrelatedToExchanges(after)).toEqual(unrelatedToExchanges(before));
    await expect(exchangeRow(page, index)).toBeVisible();
    await expectBudgetPersisted(page, after);
    // Esta versión no asigna ID al cambio: data-fx-index apunta al array exportado.
    return { index, record: after.fx[index] };
  });
}

async function beginExchangeEdit(page, index, record) {
  await openCurrencyExchange(page);
  await exchangeRow(page, index).locator('.editbtn').click();
  await expect(exchangeSave(page)).toHaveText('Save changes');
  for (const [id, value] of Object.entries({
    m1: record.m, m2: record.m2, fa: String(record.a), ft: String(record.tc),
    fc: String(record.c), fd: record.f, fn: record.n,
  })) await expect(page.locator(`#${id}`)).toHaveValue(value);
}

async function expectExchangeCells(page, index, { month, sent, received, rate, fee, note }) {
  const row = exchangeRow(page, index), cells = row.locator('td');
  await expect(row).toBeVisible();
  for (const [column, text] of [month && monthLabel(month), sent, received, rate, fee, note].entries()) {
    if (text !== undefined) await expect(cells.nth(column)).toHaveText(text);
  }
  return row;
}

async function expectExchangeStatus(page, indices, total) {
  await expect(exchangeRows(page)).toHaveCount(indices.length);
  expect(await exchangeRows(page).evaluateAll(rows => rows.map(row => Number(row.dataset.fxIndex)))).toEqual(indices);
  await expect(page.locator('#fxFilterStatus')).toHaveText(`${indices.length} of ${total} exchanges`);
}

async function expectRejectedExchange(page, values) {
  const before = await projectSnapshot(page);
  await fillExchange(page, values);
  await exchangeSave(page).click();
  await expect(page.locator('#darkModal .darkModalText')).toHaveText(
    'Select different currencies and enter an amount, exchange rate and month.');
  await expectBudgetUnchanged(page, before);
  await page.locator('#darkOk').click();
  await expect(page.locator('#darkModal')).toHaveCount(0);
  await expect(page.locator('#fn')).toHaveValue(values.note || '');
  await expect(exchangeRows(page)).toHaveCount(before.fx.length);
}

module.exports = {
  exchangeRows, exchangeRow, exchangeSave, exchangeFilter, openCurrencyExchange, fillExchange,
  unrelatedToExchanges, createExchange, beginExchangeEdit, expectExchangeCells,
  expectExchangeStatus, expectRejectedExchange,
};
