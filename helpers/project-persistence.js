const { expect } = require('@playwright/test');
const { goTo, projectSnapshot } = require('./language');
const { welcome } = require('./onboarding');
const { readSavedProject } = require('./expenses');
const { expectBudgetPersisted } = require('./monthly-budget');

const persistenceTime = '2026-10-15T12:00:00-03:00';
const persistenceMonth = '2026-10';
const undoButton = page => page.locator('#nav [onclick="undoChange()"]');
const redoButton = page => page.locator('#nav [onclick="redoChange()"]');
const savePrompt = page => page.locator('#darkModal').filter({ has: page.locator('#darkSave') });
const projectButton = (page, action) => page.locator(`#nav [onclick="${action === 'new' ? 'newProject()' : 'openProject()'}"]`);

function withoutCounter(project) { const { nid, ...rest } = project; return rest; }

async function expectExactProject(page, expected) {
  expect(await projectSnapshot(page)).toEqual(expected);
  await expectBudgetPersisted(page, expected);
}

async function expectRestoredProject(page, expected) {
  const actual = await projectSnapshot(page);
  expect(withoutCounter(actual), 'Se restauran todos los campos, no sólo los importes').toEqual(withoutCounter(expected));
  expect(actual.nid).toBeGreaterThanOrEqual(expected.nid);
  return actual;
}

async function saveBrowserProject(page, as = false) {
  const before = await projectSnapshot(page);
  await page.locator(`#nav [onclick="saveProject(${as})"]`).click();
  await expectBudgetPersisted(page, before);
  expect(await projectSnapshot(page)).toEqual(before);
  // Contrato web: persistencia local. No equivale a escribir un archivo del portable.
  await expect(page.locator('#st')).toHaveText('Saved in this browser');
  return before;
}

async function requestSwitch(page, action) {
  const before = await projectSnapshot(page);
  expect(await page.evaluate(() => window.KASHHasUnsavedChanges())).toBe(true);
  await projectButton(page, action).click();
  await expect(savePrompt(page)).toBeVisible();
  await expect(savePrompt(page).locator('.darkModalTitle')).toHaveText('Unsaved changes');
  for (const id of ['darkSave', 'darkDiscard', 'darkCancel']) await expect(page.locator(`#${id}`)).toBeVisible();
  await expectExactProject(page, before);
}

async function openFileChooser(page) {
  // La API pública se usa sólo para leer el estado, nunca para ejecutar handlers.
  const dirty = await page.evaluate(() => window.KASHHasUnsavedChanges());
  if (dirty) {
    await requestSwitch(page, 'open');
    const pending = page.waitForEvent('filechooser');
    await page.locator('#darkDiscard').click();
    return pending;
  }
  const pending = page.waitForEvent('filechooser');
  await projectButton(page, 'open').click();
  return pending;
}

async function chooseProjectFile(page, { name = 'QA-proyecto.kash', content }) {
  const chooser = await openFileChooser(page);
  expect(chooser.isMultiple()).toBe(false);
  await chooser.setFiles({ name, mimeType: 'application/json',
    buffer: Buffer.from(typeof content === 'string' ? content : JSON.stringify(content)) });
  await expect(page.locator('#kash-browser-open')).toHaveValue('');
}

async function importProject(page, project, name = 'QA-proyecto.kash') {
  await chooseProjectFile(page, { name, content: project });
  await expect(page.locator('#darkModal')).toHaveCount(0);
  await expect(page.locator('#kashLearning')).toHaveCount(0);
  await expect(page.locator('#v h2').first()).toHaveText('Summary');
  const imported = await expectRestoredProject(page, project);
  await expect(undoButton(page)).toBeDisabled();
  await expect(redoButton(page)).toBeDisabled();
  // La carga web abre la copia en memoria: guardar por UI confirma su persistencia.
  await saveBrowserProject(page);
  return imported;
}

async function newEmptyProject(page, name) {
  await requestSwitch(page, 'new');
  await page.locator('#darkDiscard').click();
  await expect(welcome(page)).toBeVisible();
  await welcome(page).locator('#learnName').fill(name);
  await welcome(page).locator('[data-learn="welcome-finish"]').click();
  await expect(welcome(page)).toHaveCount(0);
  // La preferencia F1 de esta PC ya desactivó las guías automáticas.
  await expect(page.locator('#kashLearning')).toHaveCount(0);
  await expect(page.locator('#v h2').first()).toHaveText('Summary');
  const project = await projectSnapshot(page);
  expect(project.name).toBe(name);
  expect(project.inicio).toBe(persistenceMonth);
  expect(project.enabledCurrencies).toEqual(['ARS']);
  expect(project.base).toBe(0);
  for (const key of ['expenses','fx','rub','groups','cu','rec','expenseRecurrences','tenAdjustments',
    'serviceNotifications','realConfirmedMonths','usdExpenses','notes'])
    expect(project[key], `${key} sin registros heredados`).toEqual([]);
  // El modelo vacío incluye dos saldos iniciales inactivos en cero; no son monedas habilitadas.
  expect(project.ten).toEqual([
    { id: 100, n: 'USD', m: 'USD', ini: 0 }, { id: 101, n: 'EUR', m: 'EUR', ini: 0 },
  ]);
  for (const key of ['C','real','realByCurrency','recConfig','recMonthly','serviceDates',
    'expenseBase','expenseBasePaid','usdExpenseBase','inv'])
    expect(project[key], `${key} vacío`).toEqual({});
  expect(project.source).toBeNull();
  expect(project.displayOptions).toEqual({ charts: false, estimator: false, reminders: false });
  await expectExactProject(page, project);
  await expect(undoButton(page)).toBeDisabled();
  await expect(redoButton(page)).toBeDisabled();
  return project;
}

async function historyStep(page, kind, expected, key) {
  await expect(kind === 'undo' ? undoButton(page) : redoButton(page)).toBeEnabled();
  if (key) {
    // Fuera de editores: el atajo debe operar sobre el proyecto.
    await goTo(page, 'res');
    await page.locator('#v h2').first().click();
    await page.keyboard.press(key);
  } else await (kind === 'undo' ? undoButton(page) : redoButton(page)).click();
  const actual = await expectRestoredProject(page, expected);
  await expectBudgetPersisted(page, actual);
  return actual;
}

async function expectStoredUnchanged(page, before) {
  expect(await readSavedProject(page)).toEqual(before);
}

module.exports = {
  persistenceTime, persistenceMonth, undoButton, redoButton, savePrompt, projectButton,
  withoutCounter, expectExactProject, expectRestoredProject, saveBrowserProject,
  requestSwitch, openFileChooser, chooseProjectFile, importProject, newEmptyProject,
  historyStep, expectStoredUnchanged,
};
