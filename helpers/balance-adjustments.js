const { test, expect } = require('@playwright/test');
const { settingsPage, projectSnapshot } = require('./language');
const { expectBudgetPersisted, expectBudgetUnchanged } = require('./monthly-budget');

const adjustmentRows = page => page.locator('.tenAdjTable tbody tr').filter({ has: page.locator('.editbtn') });
const adjustmentSave = page => page.locator('[onclick="saveTenAdjustment()"]');

async function openBalanceAdjustments(page) {
  if (!await page.locator('#taa').isVisible()) await settingsPage(page, 'money', 'adjustments');
  await expect(page.locator('.kashSettingsShell')).toHaveAttribute('data-page', 'money:adjustments');
  await expect(page.locator('#taa')).toBeEditable();
}

async function fillAdjustment(page, { date, currency = 'ARS', direction = 'plus', amount = '', note = '' }) {
  await openBalanceAdjustments(page);
  if (date !== undefined) await page.locator('#taf').fill(date);
  await page.locator('#tam').selectOption(currency);
  await page.locator('#tad').selectOption(direction);
  await page.locator('#taa').fill(amount);
  await page.locator('#tan').fill(note);
}

async function adjustmentRow(page, record) {
  const project = await projectSnapshot(page);
  const index = project.tenAdjustments.findIndex(item => item.id === record.id);
  expect(index, `Existe el ajuste ${record.id} en el proyecto`).toBeGreaterThanOrEqual(0);
  // La tabla ordena por fecha; sus botones conservan el índice del array original.
  // Se resuelve por ID de la exportación pública, nunca por la posición visual.
  return adjustmentRows(page).filter({ has: page.locator(`[onclick="editTenAdjustment(${index})"]`) });
}

async function createAdjustment(page, values) {
  return test.step(`Ajuste ${values.currency || 'ARS'} ${values.direction || 'plus'} ${values.amount}`, async () => {
    const before = await projectSnapshot(page);
    await fillAdjustment(page, values);
    await expect(adjustmentSave(page)).toHaveText('Add adjustment');
    await adjustmentSave(page).click();
    const after = await projectSnapshot(page);
    expect(after.tenAdjustments).toHaveLength(before.tenAdjustments.length + 1);
    const added = after.tenAdjustments.filter(item => !before.tenAdjustments.some(old => old.id === item.id));
    expect(added).toHaveLength(1);
    const [record] = added;
    expect(record.id).toEqual(expect.any(Number));
    expect(record.id).toBeGreaterThan(0);
    await expect(await adjustmentRow(page, record)).toBeVisible();
    await expectBudgetPersisted(page, after);
    return record;
  });
}

async function beginAdjustmentEdit(page, record) {
  await openBalanceAdjustments(page);
  await (await adjustmentRow(page, record)).locator('.editbtn').click();
  await expect(adjustmentSave(page)).toHaveText('Save changes');
  await expect(page.locator('#taf')).toHaveValue(record.f);
  await expect(page.locator('#tam')).toHaveValue(record.m);
  await expect(page.locator('#tad')).toHaveValue(record.a < 0 ? 'minus' : 'plus');
  await expect(page.locator('#taa')).toHaveValue(String(Math.abs(record.a)));
  await expect(page.locator('#tan')).toHaveValue(record.n);
}

async function expectAdjustmentRow(page, record, { amount, direction }) {
  const row = await adjustmentRow(page, record);
  const cells = row.locator('td');
  await expect(cells.nth(0)).toHaveText(record.f);
  await expect(cells.nth(1)).toHaveText(record.m);
  await expect(cells.nth(2)).toHaveText(direction);
  await expect(cells.nth(3)).toHaveText(amount);
  await expect(cells.nth(4)).toHaveText(record.n);
  return row;
}

async function expectRejectedAdjustment(page, values) {
  const before = await projectSnapshot(page);
  await fillAdjustment(page, values);
  await adjustmentSave(page).click();
  await expect(page.locator('#darkModal .darkModalText')).toHaveText('Enter the adjustment date and amount.');
  await expectBudgetUnchanged(page, before);
  await page.locator('#darkOk').click();
  await expect(page.locator('#darkModal')).toHaveCount(0);
  await expect(adjustmentRows(page)).toHaveCount(before.tenAdjustments.length);
  await expect(page.locator('#tan')).toHaveValue(values.note || '');
}

function unrelatedToAdjustments(project) {
  const { tenAdjustments, ...rest } = project;
  return rest;
}

module.exports = {
  adjustmentRows, adjustmentSave, openBalanceAdjustments, fillAdjustment, adjustmentRow,
  createAdjustment, beginAdjustmentEdit, expectAdjustmentRow, expectRejectedAdjustment,
  unrelatedToAdjustments,
};
