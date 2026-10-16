const { test, expect } = require('@playwright/test');
const { settingsPage, goTo, projectSnapshot, addExpense } = require('./language');

// Expectativa del producto, independiente del catálogo interno de la app.
const catalogCodes = [
  'AED', 'ARS', 'AUD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'EUR',
  'GBP', 'INR', 'JPY', 'KRW', 'MXN', 'NZD', 'PEN', 'SGD', 'USD', 'UYU',
];

const activeRows = page => page.locator('.kashCurrencyList > .kashCurrencyRow');
const inactiveRow = (page, code) => page.locator('.kashInactiveCurrencies .kashCurrencyRow')
  .filter({ has: page.locator('.kashCurrencyName b', { hasText: new RegExp(`^${code}$`) }) });
const balanceCard = (page, code) => page.locator(`.kashActiveCurrencyCards > [data-estimate-currency="${code}"]`);

async function optionCodes(select) {
  // Sólo lectura de las opciones reales; no se insertan opciones ni se invocan handlers.
  return select.locator('option').evaluateAll(options => options.map(o => o.value).filter(Boolean));
}

async function openCurrencies(page) {
  await settingsPage(page, 'money', 'currencies');
  await expect(page.locator('#kashCurrencyAdd')).toBeVisible();
}

async function addCurrency(page, code) {
  await test.step(`Agregar ${code} por UI y comprobar su guardado`, async () => {
    await openCurrencies(page);
    await page.locator('#kashCurrencyAdd').selectOption(code);
    await page.locator('[onclick="addConfiguredCurrency()"]').click();
    await expect(activeRows(page).locator('.kashCurrencyName b', { hasText: new RegExp(`^${code}$`) })).toBeVisible();
    // Una lectura por intento. No anidar expect.poll dentro de otro expect.poll.
    await expect.poll(() => readSavedCurrencies(page), {
      timeout: 5_000,
      message: `${code} debe aparecer en las monedas persistidas después de agregarla`,
    }).toContain(code);
  });
}

async function readSavedCurrencies(page) {
  // Sólo lectura: devuelve el valor observado para que Expected/Received sea útil.
  return page.evaluate(() => {
    const raw = localStorage.getItem('kash');
    return raw ? JSON.parse(raw).enabledCurrencies ?? [] : [];
  });
}

async function deactivateCurrency(page, code) {
  await openCurrencies(page);
  const row = activeRows(page).filter({
    has: page.locator('.kashCurrencyName b', { hasText: new RegExp(`^${code}$`) }),
  });
  // El input está dibujado con un switch propio. Click sobre su label visible.
  await row.locator('label.switchToggle').click();
}

async function expectActiveCurrencies(page, codes) {
  await expect.poll(() => readSavedCurrencies(page), {
    timeout: 5_000, message: 'Las monedas persistidas deben coincidir con las esperadas',
  }).toEqual(codes);
  await expect(activeRows(page).locator('.kashCurrencyName b')).toHaveText(codes);
}

async function expectNewTransactionCurrencies(page, codes) {
  await goTo(page, 'fx');
  expect(await optionCodes(page.locator('#m1'))).toEqual(codes);
  expect(await optionCodes(page.locator('#m2'))).toEqual(codes);
  await settingsPage(page, 'money', 'adjustments');
  expect(await optionCodes(page.locator('#tam'))).toEqual(codes);
  await goTo(page, 'grid');
  expect(await optionCodes(page.locator('#nc'))).toEqual(codes);
}

async function prepareUsdHistory(page) {
  await addCurrency(page, 'USD');
  await settingsPage(page, 'money', 'balances');
  await page.locator('#bh_USD').fill('100');
  await page.locator('#bh_USD').press('Tab');
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem('kash');
    return raw ? JSON.parse(raw).ten?.find(item => item.m === 'USD')?.ini ?? null : null;
  }), { timeout: 5_000, message: 'El saldo inicial USD 100 debe quedar persistido' }).toBe(100);
  await addExpense(page, {
    currency: 'USD', description: 'Café & viaje <b>USD</b>', amount: '10.50',
    note: 'Histórico propio: no convertir ni borrar', paid: true,
  });
  return financialRecords(await projectSnapshot(page));
}

function financialRecords(project) {
  const keys = ['base', 'ten', 'expenses', 'expenseBase', 'expenseRecurrences', 'rub', 'C',
    'fx', 'real', 'realByCurrency', 'realConfirmedMonths', 'inv', 'tenAdjustments'];
  return Object.fromEntries(keys.map(key => [key, project[key]]));
}

module.exports = {
  catalogCodes, activeRows, inactiveRow, balanceCard, optionCodes, openCurrencies,
  addCurrency, deactivateCurrency, expectActiveCurrencies, expectNewTransactionCurrencies,
  prepareUsdHistory, financialRecords,
};
