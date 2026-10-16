const { test, expect } = require('@playwright/test');
const { goTo, projectSnapshot } = require('./language');
const { readSavedProject } = require('./expenses');

const budgetRow = (page, service) => page.locator(`#gw tr.data-row[data-rid="${service.id}"]`);
const budgetCell = (page, service, month) => page.locator(`#gw td[data-key="${service.id}|${month}"]`);

async function openMonthlyBudget(page) {
  if (!await page.locator('#gw').isVisible()) await goTo(page, 'grid');
  await expect(page.locator('#gw .monthtable')).toBeVisible();
}

async function selectBudgetYear(page, year) {
  await openMonthlyBudget(page);
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = Number(await page.locator('.yearNavLabel').innerText());
    if (current === Number(year)) return;
    const step = current < Number(year) ? 1 : -1;
    await page.locator('.monthNav > button').nth(step === 1 ? 1 : 0).click();
    await expect(page.locator('.yearNavLabel')).toHaveText(String(current + step));
  }
  await expect(page.locator('.yearNavLabel')).toHaveText(String(year));
}

async function expectBudgetPersisted(page, project) {
  await expect.poll(() => readSavedProject(page), {
    message: 'La estructura y las celdas deben coincidir con el proyecto persistido',
  }).toEqual(project);
}

async function createMonthlyGroup(page, { name, type = 'e' }) {
  return test.step(`Crear rubro ${type}: ${name}`, async () => {
    await openMonthlyBudget(page);
    await page.locator('#grn').fill(name);
    await page.locator('#grt').selectOption(type);
    await page.locator('.addGroupBtn').click();
    const project = await projectSnapshot(page);
    const group = project.groups.find(g => g.n === name.trim() && g.t === type);
    expect(group).toBeTruthy();
    await expect(page.locator(`#gw tr[data-group="${group.id}"]`)).toContainText(name.trim());
    await expectBudgetPersisted(page, project);
    return group;
  });
}

async function createMonthlyService(page, { name, group, currency = 'ARS' }) {
  return test.step(`Crear servicio ${currency}: ${name}`, async () => {
    await openMonthlyBudget(page);
    await page.locator('#nr').fill(name);
    await page.locator('#ng').selectOption(group.id);
    await page.locator('#nc').selectOption(currency);
    await page.locator('.addServiceBtn').click();
    const project = await projectSnapshot(page);
    const service = project.rub.find(r => r.n === name.trim() && r.g === group.id && r.m === currency);
    expect(service).toMatchObject({ t: group.t, on: true, custom: true });
    await expect(budgetRow(page, service)).toContainText(name.trim());
    await expectBudgetPersisted(page, project);
    return service;
  });
}

async function createBudgetService(page, name = 'Internet hogar') {
  const group = await createMonthlyGroup(page, { name: 'Servicios QA' });
  return createMonthlyService(page, { name, group });
}

async function beginBudgetEdit(page, service, month, mode = 'double-click') {
  await selectBudgetYear(page, Number(month.slice(0, 4)));
  const cell = budgetCell(page, service, month);
  await expect(cell).toHaveAttribute('data-editable', '1');
  if (mode === 'keyboard') {
    await cell.click();
    await page.keyboard.press('Enter');
  } else await cell.locator('.val').dblclick();
  await expect(cell.locator('.quickAmount')).toBeFocused();
  return cell.locator('.quickAmount');
}

async function writeBudgetAmount(page, service, month, amount, mode) {
  await test.step(`Cargar ${service.n}, ${month}: ${amount}`, async () => {
    const field = await beginBudgetEdit(page, service, month, mode);
    await field.fill(amount);
    await field.press('Enter');
    await expect(page.locator('#gw .quickAmount')).toHaveCount(0);
    await expectBudgetPersisted(page, await projectSnapshot(page));
  });
}

async function toggleBudgetPaid(page, service, month) {
  await selectBudgetYear(page, Number(month.slice(0, 4)));
  await budgetCell(page, service, month).locator('.pk').click();
  await expectBudgetPersisted(page, await projectSnapshot(page));
}

async function expectBudgetUnchanged(page, before) {
  expect(await projectSnapshot(page)).toEqual(before);
  await expectBudgetPersisted(page, before);
}

async function openBudgetExpensePayments(page, service, month) {
  await selectBudgetYear(page, Number(month.slice(0, 4)));
  await budgetCell(page, service, month).click({ button: 'right' });
  await page.locator('#expensePaymentMenu').getByRole('menuitem', { name: 'Edit expenses', exact: true }).click();
  await expect(page.locator('#expensePaymentPopup [data-payment-save]')).toBeVisible();
}

module.exports = {
  budgetRow, budgetCell, openMonthlyBudget, selectBudgetYear, expectBudgetPersisted,
  createMonthlyGroup, createMonthlyService, createBudgetService, beginBudgetEdit,
  writeBudgetAmount, toggleBudgetPaid, expectBudgetUnchanged, openBudgetExpensePayments,
};
