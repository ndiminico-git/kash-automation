const { expect } = require('@playwright/test');

const labels = {
  en: { create: 'Create empty project', open: 'Open project', summary: 'Summary' },
  es: { create: 'Crear proyecto vacío', open: 'Abrir Proyecto', summary: 'Resumen' },
};

function welcome(page) {
  return page.locator('#kashLearning[data-kind="welcome"]');
}

async function chooseLanguage(page, language = 'en') {
  const dialog = page.locator('#kashLanguageDialog');
  await expect(dialog).toBeVisible();
  await dialog.locator(`[data-language="${language}"]`).click();
  await expect(dialog.locator(`[data-language="${language}"]`)).toHaveAttribute('aria-pressed', 'true');
  await dialog.locator('.kashLanguageContinue').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}

async function beginProject(page, language = 'en') {
  await chooseLanguage(page, language);
  await page.getByRole('button', { name: labels[language].create, exact: true }).click();
  await expect(welcome(page)).toBeVisible();
  await expect(welcome(page).locator('#learnName')).toBeVisible();
}

async function addWelcomeCurrency(page, code) {
  const wizard = welcome(page);
  await wizard.locator('#learnCurrencyAdd').selectOption(code);
  await wizard.locator('[data-learn="welcome-add-currency"]').click();
  await expect(wizard.locator(`[data-welcome-currency="${code}"]`)).toBeChecked();
}

async function nextWelcomeStep(page) {
  await welcome(page).locator('[data-learn="welcome-next"]').click();
}

async function dismissSummaryTour(page) {
  // La guía automática es comportamiento real de una instalación nueva.
  // La omitimos por UI, sin invocar funciones internas ni cambiar sus preferencias.
  const tour = page.locator('#kashLearning[data-kind="tour"]');
  await expect(tour).toBeVisible();
  await tour.locator('[data-learn="tour-close"]').click();
  await expect(tour).toHaveCount(0);
}

async function expectProjectReady(page, language = 'en') {
  await expect(welcome(page)).toHaveCount(0);
  await dismissSummaryTour(page);
  await expect(page.locator('#v').getByRole('heading', {
    name: labels[language].summary, exact: true,
  })).toBeVisible();
}

async function completeWelcomeWithDefaults(page, language = 'en') {
  await nextWelcomeStep(page);
  await expect(welcome(page).locator('[data-welcome-balance="ARS"]')).toBeVisible();
  await nextWelcomeStep(page);
  await expect(welcome(page).locator('[data-welcome-option="charts"]')).toBeVisible();
  await nextWelcomeStep(page);
  await expectProjectReady(page, language);
}

async function savedProject(page) {
  // Sólo lectura. Esperamos el autoguardado real, que es asíncrono.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('kash'))).not.toBeNull();
  return page.evaluate(() => JSON.parse(localStorage.getItem('kash')));
}

module.exports = {
  labels, welcome, chooseLanguage, beginProject, addWelcomeCurrency,
  nextWelcomeStep, expectProjectReady, completeWelcomeWithDefaults, savedProject,
};
