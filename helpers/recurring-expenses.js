const { test, expect } = require('@playwright/test');
const { projectSnapshot } = require('./language');
const { fillExpense, openExpenses, expenseSection, saveButton, readSavedProject } = require('./expenses');
const { setExpenseFilters } = require('./expense-filters');

async function setMonthlyRepeat(page, currency, enabled) {
  const input = page.locator(`#erepeat_${currency}`);
  // El switch dibuja su propio control; se pulsa el label visible, sin force ni JS.
  if (await input.isChecked() !== enabled) {
    await expenseSection(page, currency).locator('.expenseRecurringToggle').click();
  }
  if (enabled) await expect(input).toBeChecked();
  else await expect(input).not.toBeChecked();
}

async function expectRecurringStatePersisted(page, project) {
  await expect.poll(async () => {
    const stored = await readSavedProject(page);
    return stored ? { expenses: stored.expenses, series: stored.expenseRecurrences } : null;
  }, { message: 'Gastos y configuración de recurrencias deben quedar persistidos' })
    .toEqual({ expenses: project.expenses, series: project.expenseRecurrences });
}

async function createRecurringExpense(page, values) {
  return test.step(`Crear recurrencia ${values.currency || 'ARS'} desde ${values.month}: ${values.description}`, async () => {
    const currency = values.currency || 'ARS';
    const month = await fillExpense(page, values);
    await setMonthlyRepeat(page, currency, true);
    await expect(page.locator(`#erepeat_options_${currency}`)).toBeVisible();
    await expect(page.locator(`#erepeat_hint_${currency}`))
      .toHaveText(`New pending repetitions through December ${month.slice(0, 4)}.`);
    await saveButton(page, currency).click();
    const project = await projectSnapshot(page);
    const source = project.expenses.find(e => e.m === currency && e.f === month && e.c === values.description.trim());
    expect(source?.recurrenceId, 'El gasto original debe vincularse a una serie').toBeTruthy();
    const series = project.expenseRecurrences.find(s => s.id === source.recurrenceId);
    expect(series).toMatchObject({ m: currency, from: month, through: `${month.slice(0, 4)}-12`, on: true });
    await expectRecurringStatePersisted(page, project);
    return { source, series };
  });
}

async function selectOccurrence(page, record) {
  await openExpenses(page);
  await setExpenseFilters(page, { query: '', month: record.f, currency: record.m });
  const row = expenseSection(page, record.m).locator('tr[data-expense-index]:visible')
    .filter({ has: page.getByText(record.c, { exact: true }) });
  await expect(row).toHaveCount(1);
  await expect(row).toBeVisible();
  return row;
}

async function beginRecurringEdit(page, record) {
  const row = await selectOccurrence(page, record);
  await row.locator('.editbtn').click();
  await expect(saveButton(page, record.m)).toHaveText('Save changes');
  await expect(page.locator(`#ef_${record.m}`)).toHaveValue(record.f);
  await expect(page.locator(`#ec_${record.m}`)).toHaveValue(record.c);
}

async function editRecurringExpense(page, record, { amount, note, scope = 'one' }) {
  await test.step(`Editar ${record.m} ${record.f}, alcance ${scope}`, async () => {
    await beginRecurringEdit(page, record);
    await expect(page.locator(`#erepeat_${record.m}`)).toBeChecked();
    if (amount !== undefined) await page.locator(`#ea_${record.m}`).fill(amount);
    if (note !== undefined) await page.locator(`#en_${record.m}`).fill(note);
    await page.locator(`#escope_${record.m}`).selectOption(scope);
    await saveButton(page, record.m).click();
    await expect(saveButton(page, record.m)).toHaveText('Add expense');
    await expectRecurringStatePersisted(page, await projectSnapshot(page));
  });
}

async function markOccurrencePaid(page, record) {
  const row = await selectOccurrence(page, record);
  await row.locator('.expensePaidCell input').check();
  await expect(row.locator('.expensePaidCell input')).toBeChecked();
  await expectRecurringStatePersisted(page, await projectSnapshot(page));
}

async function openStopRecurrence(page, record) {
  const row = await selectOccurrence(page, record);
  await row.locator('.expenseRecurringBadge').click();
  await expect(page.locator('#kashFeatureModal')).toBeVisible();
  await expect(page.locator('#kashFeatureTitle')).toHaveText('Stop repeating');
}

async function setRecurrenceStopMonth(page, month) {
  await page.locator('#recurrenceStopMonth').fill(month);
  // El control real aplica el preview en change; salir del campo dispara ese evento.
  await page.locator('#recurrenceStopMonth').press('Tab');
}

async function expectRecurrenceEntries(page, seriesId, expected) {
  const project = await projectSnapshot(page);
  const records = project.expenses.filter(e => e.recurrenceId === seriesId);
  const keys = ['f', 'm', 'c', 'a', 'n', 'paid', 'recurrenceGenerated', 'recurrenceEdited'];
  const byMonth = xs => [...xs].sort((a, b) => a.f.localeCompare(b.f));
  expect(byMonth(records.map(e => Object.fromEntries(keys.map(key => [key, e[key]])))))
    .toEqual(byMonth(expected));
  expect(new Set(records.map(e => e.f)).size, 'Una sola entrada por mes en la serie').toBe(records.length);
  expect(new Set(project.expenses.map(e => e.id)).size, 'IDs únicos, también entre monedas y series')
    .toBe(project.expenses.length);
  await expectRecurringStatePersisted(page, project);
}

async function expectRecurringProjectUnchanged(page, before) {
  expect(await projectSnapshot(page)).toEqual(before);
  await expect.poll(() => readSavedProject(page)).toEqual(before);
}

async function expectStableRecurringReload(page, before) {
  await page.reload();
  await expect(page.locator('#kashLanguageDialog')).toHaveCount(0);
  await expect(page.locator('#kashLearning')).toHaveCount(0);
  await openExpenses(page);
  const after = await projectSnapshot(page);
  // Migrar puede normalizar el próximo contador; los IDs existentes deben ser idénticos.
  const { nid: previousNextId, ...previous } = before;
  const { nid: nextId, ...actual } = after;
  expect(nextId).toBeGreaterThanOrEqual(previousNextId);
  expect(actual).toEqual(previous);
  await expectRecurringStatePersisted(page, after);
  return after;
}

module.exports = {
  setMonthlyRepeat, createRecurringExpense, selectOccurrence, beginRecurringEdit,
  editRecurringExpense, markOccurrencePaid, openStopRecurrence, setRecurrenceStopMonth,
  expectRecurrenceEntries, expectRecurringStatePersisted, expectRecurringProjectUnchanged,
  expectStableRecurringReload,
};
