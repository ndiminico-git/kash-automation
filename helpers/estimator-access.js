const { expect } = require('@playwright/test');
const { settingsPage, projectSnapshot } = require('./language');
const { expectBudgetPersisted } = require('./monthly-budget');

const estimatorTime = '2026-10-15T12:00:00-03:00';
const estimatorMonth = '2026-10';
// Contraseña de la función local de práctica, indicada por el propietario de KA$H.
const estimatorPassword = process.env.KASH_ESTIMATOR_PASSWORD || 'Passat00!';
const estimatorDialog = page => page.locator('#kashEstimatorDialog');
const estimatorSwitch = page => page.locator('[data-display-choice="estimator"]');
const estimatorPanel = page => page.locator('.marketPanel');

async function authorization(page) {
  return page.evaluate(() => localStorage.getItem('kash_private_estimator'));
}

function outsideEstimator(project) {
  const { estimator, ...otherOptions } = project.displayOptions;
  return { ...project, displayOptions: otherOptions };
}

async function expectEstimatorOnlyChanged(page, before, enabled) {
  const after = await projectSnapshot(page);
  expect(outsideEstimator(after), 'Activar/desactivar no modifica datos ni otras preferencias').toEqual(outsideEstimator(before));
  expect(after.displayOptions.estimator).toBe(enabled);
  await expectBudgetPersisted(page, after);
  return after;
}

async function expectUnchanged(page, before) {
  expect(await projectSnapshot(page)).toEqual(before);
  await expectBudgetPersisted(page, before);
}

async function expectAuthorization(page, enabled) {
  expect(await authorization(page)).toBe(enabled ? 'enabled-v1' : null);
  if (enabled) await expect(page.locator('body')).toHaveAttribute('data-kash-estimator-enabled', '');
  else await expect(page.locator('body')).not.toHaveAttribute('data-kash-estimator-enabled', /.*/);
}

async function requestEstimator(page) {
  await settingsPage(page, 'features', 'summary');
  await expect(estimatorSwitch(page)).not.toBeChecked();
  await expect(estimatorSwitch(page)).toBeEnabled();
  const before = await projectSnapshot(page);
  await estimatorSwitch(page).locator('xpath=ancestor::label').click();
  await expect(estimatorDialog(page)).toBeVisible();
  await expect(estimatorDialog(page)).toHaveAttribute('role', 'dialog');
  await expect(estimatorDialog(page)).toHaveAttribute('aria-modal', 'true');
  await expect(estimatorSwitch(page)).not.toBeChecked();
  await expect(page.locator('#kashEstimatorPassword')).toBeFocused();
  await expectUnchanged(page, before);
}

async function submitPassword(page, value, { enter = false } = {}) {
  await page.locator('#kashEstimatorPassword').fill(value);
  if (enter) await page.locator('#kashEstimatorPassword').press('Enter');
  else await page.locator('#kashEstimatorUnlock').click();
}

async function expectRejected(page, before, language = 'en') {
  await expect(page.locator('#kashEstimatorError')).toHaveText(language === 'en'
    ? 'Incorrect password. Try again.' : 'Contraseña incorrecta. Intentá de nuevo.');
  await expect(page.locator('#kashEstimatorPassword')).toHaveValue('');
  await expect(page.locator('#kashEstimatorPassword')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#kashEstimatorPassword')).toBeFocused();
  await expect(page.locator('#kashEstimatorUnlock')).toBeEnabled();
  await expectAuthorization(page, false);
  await expectUnchanged(page, before);
}

async function unlockEstimator(page, { enter = false } = {}) {
  await requestEstimator(page);
  const before = await projectSnapshot(page);
  await submitPassword(page, estimatorPassword, { enter });
  await expect(estimatorDialog(page)).toHaveCount(0);
  await expect(estimatorSwitch(page)).toBeChecked();
  await expectAuthorization(page, true);
  const after = await expectEstimatorOnlyChanged(page, before, true);
  // Verificación sólo de lectura: no se guarda el secreto en el proyecto o preferencias.
  expect(await page.evaluate(password => ({
    projectContainsPassword: window.KASHGetProjectJson().includes(password),
    storageContainsPassword: Object.values(localStorage).some(value => value.includes(password)),
  }), estimatorPassword)).toEqual({ projectContainsPassword: false, storageContainsPassword: false });
  return after;
}

async function disableEstimator(page) {
  await settingsPage(page, 'features', 'summary');
  await expect(estimatorSwitch(page)).toBeChecked();
  const before = await projectSnapshot(page);
  await estimatorSwitch(page).locator('xpath=ancestor::label').click();
  await expect(estimatorSwitch(page)).not.toBeChecked();
  await expect(estimatorDialog(page)).toHaveCount(0);
  await expectAuthorization(page, false);
  return expectEstimatorOnlyChanged(page, before, false);
}

module.exports = {
  estimatorTime, estimatorMonth, estimatorPassword, estimatorDialog, estimatorSwitch,
  estimatorPanel, authorization, outsideEstimator, expectEstimatorOnlyChanged,
  expectUnchanged, expectAuthorization, requestEstimator, submitPassword,
  expectRejected, unlockEstimator, disableEstimator,
};
