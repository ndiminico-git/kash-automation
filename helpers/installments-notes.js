const { test, expect } = require('@playwright/test');
const { goTo, projectSnapshot } = require('./language');
const { expectBudgetPersisted } = require('./monthly-budget');

const trackerTime = '2026-10-15T12:00:00-03:00';
const trackerMonth = '2026-10';
const installmentNames = page => page.locator('#v .cuotaNameCell');
// La traducción de v0.677 cambia el atributo data-cuota-index a data-installment-index en inglés.
const installmentName = (page, index) => page.locator(
  `#v .cuotaNameCell:is([data-cuota-index="${index}"],[data-installment-index="${index}"])`);
const installmentRow = (page, index) => installmentName(page, index).locator('..');
const installmentSave = page => page.locator('[onclick="saveCuota()"]');
const ownNote = (page, index) => page.locator('#v .ownrem').filter({
  has: page.locator(`[onclick="editOwnReminder(${index})"]`),
});
const nextTrackerMonth = page => page.locator('button[onclick="S.i=add(S.i,1);render()"]');
const previousTrackerMonth = page => page.locator('button[onclick="if(idx(S.i)>idx(D.inicio)){S.i=add(S.i,-1);render()}"]');
const trackerPeriod = page => page.locator('#v .form').filter({
  has: page.locator('button[onclick="S.i=add(S.i,1);render()"]'),
}).locator('span.sub');

function outsideInstallments(project) { const { cu, ...rest } = project; return rest; }
function outsideNotes(project) { const { rec, ...rest } = project; return rest; }
function outsideTracker(project) { const { cu, rec, ...rest } = project; return rest; }

async function openTracker(page) {
  if (!await page.locator('#cd').isVisible()) await goTo(page, 'cu');
  await expect(page.locator('.quotaForm')).toBeVisible();
  await expect(page.locator('#rt')).toBeVisible();
}

async function fillInstallment(page, { description = '', total = '', start = trackerMonth }) {
  await openTracker(page);
  await page.locator('#cd').fill(description);
  await page.locator('#ct').fill(String(total));
  await page.locator('#ci').fill(start);
}

async function createInstallment(page, values) {
  return test.step(`Crear plan de cuotas: ${values.description}`, async () => {
    await openTracker(page);
    const before = await projectSnapshot(page), index = before.cu.length;
    await fillInstallment(page, values);
    await expect(installmentSave(page)).toHaveText('Add installment plan');
    await installmentSave(page).click();
    const after = await projectSnapshot(page);
    // Esta versión usa posición del array, no asigna un ID al plan de cuotas.
    const expected = { d: values.description.trim(), tot: values.expectedTotal ?? Number(values.total),
      ini: values.start ?? trackerMonth };
    expect(after.cu).toEqual([...before.cu, expected]);
    expect(outsideInstallments(after)).toEqual(outsideInstallments(before));
    await expect(page.locator('#cd')).toHaveValue('');
    await expect(page.locator('#ct')).toHaveValue('');
    await expectBudgetPersisted(page, after);
    return { index, record: expected };
  });
}

async function expectInstallmentProgress(page, index, values) {
  await expect(installmentName(page, index)).toBeVisible();
  // Nombre + seis columnas de progreso + acciones; sólo se comparan las seis del medio.
  expect(await installmentRow(page, index).locator('td').evaluateAll(cells =>
    cells.slice(1, 7).map(td => td.textContent.trim()))).toEqual(values);
}

async function shiftTrackerMonth(page, direction, label) {
  await (direction === 1 ? nextTrackerMonth(page) : previousTrackerMonth(page)).click();
  await expect(trackerPeriod(page)).toHaveText(label);
}

async function beginInstallmentEdit(page, index, mode = 'button') {
  await openTracker(page);
  if (mode === 'double-click') await installmentName(page, index).dblclick();
  else if (mode === 'Enter' || mode === 'F2') {
    await installmentName(page, index).focus();
    await page.keyboard.press(mode);
  } else await installmentRow(page, index).locator(`[onclick="editCuota(${index})"]`).click();
  await expect(installmentSave(page)).toHaveText('Save changes');
  await expect(page.locator('#cd')).toBeFocused();
}

async function expectInstallmentRejected(page, before) {
  await installmentSave(page).click();
  await expect(page.locator('#darkModal .darkModalText')).toHaveText(
    'Enter what you bought, the number of installments and the starting month.');
  expect(await projectSnapshot(page)).toEqual(before);
  await page.locator('#darkOk').click();
  await expect(page.locator('#darkModal')).toHaveCount(0);
  await expectBudgetPersisted(page, before);
}

async function addOwnNote(page, text, mode = 'button') {
  return test.step(`Agregar recordatorio propio: ${text}`, async () => {
    await openTracker(page);
    const before = await projectSnapshot(page), index = before.rec.length;
    await page.locator('#rt').fill(text);
    if (mode === 'Enter') await page.locator('#rt').press('Enter');
    else await page.locator('[onclick="addOwnReminder()"]') .click();
    await expect(page.locator('#darkModal')).toHaveCount(0);
    const after = await projectSnapshot(page);
    expect(after.rec).toEqual([...before.rec, { t: text.trim() }]);
    expect(outsideNotes(after)).toEqual(outsideNotes(before));
    await expect(ownNote(page, index).locator('> span').first()).toHaveText(text.trim());
    await expect(page.locator('#rt')).toHaveValue('');
    await expectBudgetPersisted(page, after);
    return index;
  });
}

async function beginNoteEdit(page, index) {
  await ownNote(page, index).locator(`[onclick="editOwnReminder(${index})"]`).click();
  await expect(page.locator('#darkModal .darkModalTitle')).toHaveText('Edit reminder');
  await expect(page.locator('#ownReminderText')).toBeFocused();
}

module.exports = {
  trackerTime, trackerMonth, installmentNames, installmentName, installmentRow, installmentSave,
  ownNote, trackerPeriod, previousTrackerMonth, nextTrackerMonth, outsideInstallments, outsideNotes,
  outsideTracker, openTracker, fillInstallment, createInstallment, expectInstallmentProgress,
  shiftTrackerMonth, beginInstallmentEdit, expectInstallmentRejected, addOwnNote, beginNoteEdit,
};
