const { expect } = require('@playwright/test');
const { projectSnapshot } = require('./language');
const { openExpenses, readSavedProject } = require('./expenses');

// La app conserva las filas descartadas con display:none y puede ocultar su sección.
// Contarlas todas produciría falsos positivos: aquí sólo se consideran filas visibles.
const visibleExpenseRows = page => page.locator('.expenseSection tr[data-expense-index]:visible');

async function setExpenseFilters(page, { query, month, currency } = {}) {
  await openExpenses(page);
  if (query !== undefined) {
    await page.locator('#expenseSearch').fill(query);
    await expect(page.locator('#expenseSearch')).toHaveValue(query);
  }
  if (month !== undefined) {
    await page.locator('#expensePeriodFilter').selectOption(month);
    await expect(page.locator('#expensePeriodFilter')).toHaveValue(month);
  }
  if (currency !== undefined) {
    await page.locator('#expenseCurrencyFilter').selectOption(currency);
    await expect(page.locator('#expenseCurrencyFilter')).toHaveValue(currency);
  }
}

async function expectFilteredExpenses(page, { descriptions, totals }) {
  const rows = visibleExpenseRows(page);
  await expect(rows).toHaveCount(descriptions.length);
  // Se valida pertenencia sin imponer un orden de filas ajeno al objetivo del filtro.
  await expect.poll(async () => (await rows.locator('.expenseConceptText').allTextContents()).sort())
    .toEqual([...descriptions].sort());
  const summary = page.locator('#expenseFilterSummary');
  await expect(summary.locator(':scope > span').first())
    .toHaveText(`${descriptions.length} ${descriptions.length === 1 ? 'result' : 'results'}`);
  await expect(summary.locator('strong')).toHaveCount(Object.keys(totals).length);
  for (const [currency, amount] of Object.entries(totals)) {
    await expect(summary.locator(':scope > span').filter({ hasText: `Filtered total ${currency}:` }))
      .toHaveText(`Filtered total ${currency}: ${amount}`);
  }
}

async function expectFilteringReadOnly(page, before) {
  expect(await projectSnapshot(page), 'Filtrar no debe modificar el proyecto en memoria').toEqual(before);
  await expect.poll(() => readSavedProject(page), {
    message: 'Filtrar no debe modificar el proyecto persistido',
  }).toEqual(before);
}

async function filterOptionValues(page, id) {
  return page.locator(`#${id} option`).evaluateAll(options => options.map(option => option.value));
}

module.exports = {
  visibleExpenseRows, setExpenseFilters, expectFilteredExpenses,
  expectFilteringReadOnly, filterOptionValues,
};
