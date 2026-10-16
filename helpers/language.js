const { expect } = require('@playwright/test');
const { beginProject, welcome, completeWelcomeWithDefaults, savedProject } = require('./onboarding');

const navigation = {
  en: { res: 'Summary', grid: 'Monthly budget', fx: 'Currency exchange', gastos: 'Expenses', cu: 'Installments & notes', set: 'Settings' },
  es: { res: 'Resumen', grid: 'Consumos Mensuales', fx: 'Cambio de divisas', gastos: 'Gastos', cu: 'Cuotas y Notas', set: 'Ajustes' },
};
const projectName = 'QA — Café & Ahorros <b>USD</b>';

async function goTo(page, section) {
  const language = await page.locator('html').getAttribute('lang');
  await page.locator('#nav').getByRole('button', {
    name: navigation[language][section], exact: true,
  }).click();
}

async function settingsPage(page, group, tab) {
  await goTo(page, 'set');
  await page.locator(`[data-settings-section="${group}"]`).click();
  await page.locator(`[data-settings-tab="${tab}"]`).click();
  await expect(page.locator('.kashSettingsShell')).toHaveAttribute('data-page', `${group}:${tab}`);
}

async function changeLanguage(page, language) {
  await settingsPage(page, 'appearance', 'language');
  await page.locator('#ks_language').selectOption(language);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  await expect(page.locator('#ks_language')).toHaveValue(language);
  expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBe(language);
}

async function createLanguageProject(page) {
  await beginProject(page, 'en');
  await welcome(page).locator('#learnName').fill(projectName);
  await completeWelcomeWithDefaults(page);
  await expect.poll(async () => (await savedProject(page)).name).toBe(projectName);

  // Preferencia real por UI: evita que las guías automáticas tapen los formularios.
  // Las guías manuales siguen disponibles para el TC-021.
  await page.keyboard.press('F1');
  await expect(page.locator('#kashLearning[data-kind="help"]')).toBeVisible();
  await page.locator('#learnAuto').uncheck();
  await page.locator('[data-learn="help-close"]').click();
  await expect(page.locator('#kashLearning')).toHaveCount(0);
}

async function projectSnapshot(page) {
  // API pública de exportación; sólo lectura, sin acceder ni asignar la variable D.
  return page.evaluate(() => JSON.parse(window.KASHGetProjectJson()));
}

async function addExpense(page, { currency = 'ARS', description, amount, note = '', paid = false }) {
  await goTo(page, 'gastos');
  await page.locator(`#ec_${currency}`).fill(description);
  await page.locator(`#ea_${currency}`).fill(amount);
  await page.locator(`#en_${currency}`).fill(note);
  await page.locator(`#epaid_${currency}`).setChecked(paid);
  const month = await page.locator(`#ef_${currency}`).inputValue();
  await page.locator(`[onclick="saveExpense('${currency}')"]`).click();
  await expect(page.locator(`.expenseSection[data-expense-currency="${currency}"]`)
    .getByText(description, { exact: true })).toBeVisible();
  await expect.poll(async () => (await savedProject(page)).expenses
    .some(item => item.c === description && item.m === currency)).toBe(true);
  return month;
}

async function prepareFinancialData(page) {
  await settingsPage(page, 'money', 'currencies');
  await page.locator('#kashCurrencyAdd').selectOption('USD');
  await page.locator('[onclick="addConfiguredCurrency()"]').click();
  await expect.poll(async () => (await savedProject(page)).enabledCurrencies).toEqual(['ARS', 'USD']);
  await settingsPage(page, 'money', 'balances');
  await page.locator('#bh_ARS').fill('1000');
  await page.locator('#bh_ARS').press('Tab');
  await expect.poll(async () => (await savedProject(page)).base).toBe(1000);
  await page.locator('#bh_USD').fill('100');
  await page.locator('#bh_USD').press('Tab');
  await expect.poll(async () => (await savedProject(page)).ten.find(item => item.m === 'USD').ini).toBe(100);
  await addExpense(page, {
    description: 'Café & Facturas! <b>Guardar</b>', amount: '150.75',
    note: 'Gastos / Save / comentario sin traducir', paid: true,
  });
  await addExpense(page, { description: 'Servicio pendiente', amount: '200.25', paid: false });
  await addExpense(page, { currency: 'USD', description: 'Compra USD', amount: '10.50', paid: true });
  await goTo(page, 'res');
}

async function changeLanguageWithOverlayOpen(page, language, kind) {
  await expect(page.locator(`#kashLearning[data-kind="${kind}"]`)).toBeVisible();
  // Integración: el modal impide acceder al selector. Ejercitamos la API pública
  // de idioma para comprobar la actualización de un componente que sigue abierto.
  await page.evaluate(lang => window.KashI18n.setLanguage(lang), language);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  await expect(page.locator(`#kashLearning[data-kind="${kind}"]`)).toBeVisible();
}

module.exports = {
  navigation, projectName, goTo, settingsPage, changeLanguage, createLanguageProject,
  projectSnapshot, addExpense, prepareFinancialData, changeLanguageWithOverlayOpen,
};
