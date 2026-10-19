const { gridMoney } = require('./money-presentation');
const { test, expect } = require('@playwright/test');
const { goTo, projectSnapshot } = require('./language');

const expenseSection = (page, currency = 'ARS') => page.locator(`.expenseSection[data-expense-currency="${currency}"]`);
const expenseRows = (page, currency = 'ARS') => expenseSection(page, currency).locator('tr[data-expense-index]');
const expenseRow = (page, currency, description) => expenseRows(page, currency)
  .filter({ has: page.getByText(description, { exact: true }) });
const saveButton = (page, currency = 'ARS') => expenseSection(page, currency)
  .locator(`[onclick="saveExpense('${currency}')"]`);

async function readSavedProject(page) {
  // Una lectura por intento: sin expect.poll anidado ni acceso a D.
  return page.evaluate(() => {
    const raw = localStorage.getItem('kash');
    return raw ? JSON.parse(raw) : null;
  });
}

async function expectPersistedExpenses(page, expected) {
  await expect.poll(async () => (await readSavedProject(page))?.expenses ?? null, {
    timeout: 5_000, message: 'Los gastos persistidos deben coincidir con los registros esperados',
  }).toEqual(expected);
}

async function openExpenses(page) {
  if (!await page.locator('#expenseSearch').isVisible()) await goTo(page, 'gastos');
  await expect(page.locator('#expenseSearch')).toBeVisible();
}

async function fillExpense(page, {
  currency = 'ARS', description = '', amount = '', note = '', paid = false, month,
}) {
  await openExpenses(page);
  await expect(page.locator(`#ec_${currency}`)).toBeEditable();
  if (month !== undefined) await page.locator(`#ef_${currency}`).fill(month);
  await page.locator(`#ec_${currency}`).fill(description);
  await page.locator(`#ea_${currency}`).fill(amount);
  await page.locator(`#en_${currency}`).fill(note);
  await page.locator(`#epaid_${currency}`).setChecked(paid);
  await page.locator(`#erepeat_${currency}`).uncheck();
  return page.locator(`#ef_${currency}`).inputValue();
}

async function createExpense(page, values) {
  return test.step(`Registrar gasto ${values.currency || 'ARS'}: ${values.description}`, async () => {
    const before = (await projectSnapshot(page)).expenses.length;
    const month = await fillExpense(page, values);
    const currency = values.currency || 'ARS', description = values.description.trim();
    await saveButton(page, currency).click();
    await expect(expenseRow(page, currency, description)).toBeVisible();
    const project = await projectSnapshot(page);
    expect(project.expenses).toHaveLength(before + 1);
    const record = project.expenses.find(x => x.m === currency && x.c === description && x.f === month);
    expect(record, 'Debe existir el gasto con su moneda y mes originales').toBeTruthy();
    await expectPersistedExpenses(page, project.expenses);
    return record;
  });
}

async function expectRejectedExpense(page, values) {
  const before = await projectSnapshot(page);
  await fillExpense(page, values);
  if (values.expectedAmountField !== undefined) {
    await expect(page.locator(`#ea_${values.currency || 'ARS'}`)).toHaveValue(values.expectedAmountField);
  }
  await saveButton(page, values.currency || 'ARS').click();
  await expect(page.locator('#darkModal .darkModalTitle')).toHaveText('Missing information');
  await expect(page.locator('#darkModal .darkModalText')).toHaveText(
    `Enter the month, description and amount in ${values.currency || 'ARS'}.`);
  expect(await projectSnapshot(page)).toEqual(before);
  await expectPersistedExpenses(page, before.expenses);
  await page.locator('#darkOk').click();
  await expect(page.locator('#darkModal')).toHaveCount(0);
  await expect(expenseRows(page, values.currency || 'ARS')).toHaveCount(before.expenses
    .filter(x => x.m === (values.currency || 'ARS')).length);
}

async function beginExpenseEdit(page, currency, description) {
  await openExpenses(page);
  await expenseRow(page, currency, description).locator('.editbtn').click();
  await expect(saveButton(page, currency)).toHaveText('Save changes');
  await expect(page.locator(`#ec_${currency}`)).toHaveValue(description);
}

async function expectMonthlyTotals(page, { currency = 'ARS', month, expenses, calculated, projected }) {
  await test.step(`Verificar planilla: ${currency}, ${month}`, async () => {
    await goTo(page, 'grid');
    const year = Number(month.slice(0, 4));
    // El caso usa el año actual o el siguiente. El límite evita bucles sin fin.
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = Number(await page.locator('.yearNavLabel').innerText());
      if (current === year) break;
      await page.locator('.monthNav > button').nth(current < year ? 1 : 0).click();
      await expect(page.locator('.yearNavLabel')).toHaveText(String(current + (current < year ? 1 : -1)));
    }
    await expect(page.locator('.yearNavLabel')).toHaveText(String(year));
    const values = { expenses, confirmed: calculated, estimated: projected };
    for (const [kind, text] of Object.entries(values)) {
      if (text === undefined) continue;
      const cell = page.locator(`tr[data-total-currency="${currency}"][data-total-kind="${kind}"] td[data-total-month="${month}"]`);
      // Las columnas pueden estar fuera del viewport del scroll horizontal.
      // Se valida su contenido sin forzar clics ni modificar el scroll de la app.
      await expect(cell).toHaveText(gridMoney(text));
    }
  });
}

function nextMonth(month) {
  const [year, value] = month.split('-').map(Number);
  return value === 12 ? `${year + 1}-01` : `${year}-${String(value + 1).padStart(2, '0')}`;
}

module.exports = {
  expenseSection, expenseRows, expenseRow, saveButton, readSavedProject,
  expectPersistedExpenses, openExpenses, fillExpense, createExpense,
  expectRejectedExpense, beginExpenseEdit, expectMonthlyTotals, nextMonth,
};
