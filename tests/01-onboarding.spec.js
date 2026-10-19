const { test, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const {
  welcome, chooseLanguage, beginProject, addWelcomeCurrency,
  nextWelcomeStep, expectProjectReady, completeWelcomeWithDefaults, savedProject,
} = require('../helpers/onboarding');

// Sobrescribe un eventual storageState de otro proyecto de automation.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('01 · Primer inicio y bienvenida · KA$H v0.690', () => {
  let app;
  const errorsByPage = new WeakMap();

  test.beforeAll(async () => {
    app = await startAppServer();
  });

  test.afterAll(async () => {
    await app?.close();
  });

  test.beforeEach(async ({ page }) => {
    const errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));

    // Las cotizaciones externas no forman parte del onboarding.
    // No precargamos idioma, proyecto, monedas ni datos financieros.
    await page.addInitScript(() => localStorage.setItem('kash_services_online', '0'));
    await page.route('**/*', route => {
      const sameOrigin = new URL(route.request().url()).origin === new URL(app.url).origin;
      return sameOrigin ? route.continue() : route.abort();
    });
    await page.goto(app.url);
    await expect(page.locator('#kashLanguageDialog')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
  });

  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) {
      await testInfo.attach('javascript-errors', {
        body: JSON.stringify(errors, null, 2), contentType: 'application/json',
      });
    }
    expect.soft(errors, 'La página no debe generar errores JavaScript').toEqual([]);
  });

  test('TC-001 [P] Mostrar el selector de idioma en una instalación limpia', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Choose your language', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-language]')).toHaveCount(2);
    await expect(dialog.locator('[data-language="en"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.locator('[data-language="es"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(dialog.locator('.kashLanguageContinue')).toBeEnabled();
    await expect(welcome(page)).toHaveCount(0);
  });

  test('TC-002 [P] Elegir inglés y continuar', async ({ page }) => {
    await chooseLanguage(page, 'en');
    await expect(page.getByRole('button', { name: 'Create empty project', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open project', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear proyecto vacío', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBe('en');
    expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
  });

  test('TC-003 [P] Elegir español y continuar', async ({ page }) => {
    await chooseLanguage(page, 'es');
    await expect(page.getByRole('button', { name: 'Crear proyecto vacío', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir Proyecto', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create empty project', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBe('es');
    expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
  });

  test('TC-004 [P] Crear un proyecto vacío', async ({ page }) => {
    await beginProject(page);
    await expect(welcome(page).getByRole('heading', { name: 'Your project, your way', exact: true })).toBeVisible();
    await expect(welcome(page).locator('#learnName')).toHaveValue('New project');
    await expect(welcome(page).locator('[data-welcome-currency]')).toHaveCount(1);
    await expect(welcome(page).locator('[data-welcome-currency="ARS"]')).toBeChecked();
    const project = await savedProject(page);
    expect(project.expenses).toEqual([]);
    expect(project.rub).toEqual([]);
  });

  test('TC-005 [P] Completar todos los pasos de bienvenida', async ({ page }) => {
    await beginProject(page);
    await welcome(page).locator('#learnName').fill('QA - Proyecto completo');
    await nextWelcomeStep(page);
    await expect(welcome(page).getByRole('heading', { name: 'Your starting point', exact: true })).toBeVisible();
    await welcome(page).locator('[data-welcome-balance="ARS"]').fill('2500.50');
    await nextWelcomeStep(page);
    await expect(welcome(page).getByRole('heading', { name: 'Choose what to show', exact: true })).toBeVisible();
    await welcome(page).locator('[data-welcome-option="charts"]').check();
    await nextWelcomeStep(page);
    await expectProjectReady(page);
    await expect(page.locator('[data-estimate-currency="ARS"] .holdingText > strong')).toHaveText('ARS 2,500.5');
    await expect.poll(async () => (await savedProject(page)).name).toBe('QA - Proyecto completo');
    const project = await savedProject(page);
    expect(project.base).toBe(2500.5);
    expect(project.displayOptions).toMatchObject({ charts: true, estimator: false, reminders: false });
  });

  test('TC-006 [P] Omitir la bienvenida y acceder a la aplicación', async ({ page }) => {
    await beginProject(page);
    await welcome(page).locator('[data-learn="welcome-finish"]').click();
    await expectProjectReady(page);
    await expect(page.locator('.kashActiveCurrencyCards > [data-estimate-currency]')).toHaveCount(1);
    await expect(page.locator('[data-estimate-currency="ARS"] .holdingText > strong')).toHaveText('ARS 0');
    const project = await savedProject(page);
    expect(project.enabledCurrencies).toEqual(['ARS']);
    expect(project.base).toBe(0);
  });

  test('TC-007 [N] Impedir continuar con un nombre de proyecto vacío', async ({ page }) => {
    await beginProject(page);
    for (const value of ['', '   ']) {
      await test.step(value ? 'Nombre compuesto por espacios' : 'Nombre vacío', async () => {
        await welcome(page).locator('#learnName').fill(value);
        await nextWelcomeStep(page);
        await expect(welcome(page).getByRole('alert')).toHaveText('Enter a name to identify your project.');
        await expect(welcome(page).locator('#learnName')).toBeVisible();
        await expect(welcome(page).locator('[data-welcome-balance]')).toHaveCount(0);
      });
    }
  });

  test('TC-008 [B] Conservar caracteres especiales en el nombre del proyecto', async ({ page }) => {
    const name = 'Café & Ahorros <b>USD</b> "2026" 💰';
    await beginProject(page);
    await welcome(page).locator('#learnName').fill(name);
    await expect(welcome(page).locator('#learnName')).toHaveValue(name);
    await completeWelcomeWithDefaults(page);
    await expect.poll(async () => (await savedProject(page)).name).toBe(name);
    await page.reload();
    await expect(page.locator('#v').getByRole('heading', { name: 'Summary', exact: true })).toBeVisible();
    expect((await savedProject(page)).name).toBe(name);
  });

  test('TC-009 [P] Seleccionar varias monedas durante la bienvenida', async ({ page }) => {
    await beginProject(page);
    await addWelcomeCurrency(page, 'USD');
    await addWelcomeCurrency(page, 'EUR');
    await expect(welcome(page).locator('[data-welcome-currency]')).toHaveCount(3);
    await completeWelcomeWithDefaults(page);
    await expect(page.locator('.kashActiveCurrencyCards > [data-estimate-currency]')).toHaveCount(3);
    for (const code of ['ARS', 'EUR', 'USD']) {
      await expect(page.locator(`.kashActiveCurrencyCards > [data-estimate-currency="${code}"]`)).toBeVisible();
    }
    await expect.poll(async () => (await savedProject(page)).enabledCurrencies).toEqual(['ARS', 'EUR', 'USD']);
  });

  test('TC-010 [B] Permitir cinco monedas e impedir agregar una sexta', async ({ page }) => {
    await beginProject(page);
    for (const code of ['BRL', 'CNY', 'EUR', 'USD']) await addWelcomeCurrency(page, code);
    await expect(welcome(page).locator('[data-welcome-currency]')).toHaveCount(5);
    await expect(welcome(page).locator('.kashWelcomeCurrencyCount')).toHaveText('5 / 5 active currencies');
    await welcome(page).locator('#learnCurrencyAdd').selectOption('JPY');
    await expect(welcome(page).locator('[data-learn="welcome-add-currency"]')).toBeDisabled();
    await expect(welcome(page).locator('[data-welcome-currency="JPY"]')).toHaveCount(0);
    await completeWelcomeWithDefaults(page);
    await expect(page.locator('.kashActiveCurrencyCards > [data-estimate-currency]')).toHaveCount(5);
    await expect.poll(async () => (await savedProject(page)).enabledCurrencies).toEqual(['ARS', 'BRL', 'CNY', 'EUR', 'USD']);
  });

  test('TC-011 [R] Omitir la bienvenida sin cargar movimientos de ejemplo', async ({ page }) => {
    await beginProject(page);
    await welcome(page).locator('[data-learn="welcome-finish"]').click();
    await expectProjectReady(page);
    const project = await savedProject(page);
    for (const field of ['rub', 'groups', 'expenses', 'fx', 'cu', 'rec', 'notes', 'tenAdjustments', 'expenseRecurrences']) {
      expect(project[field], `${field} debe iniciar vacío`).toEqual([]);
    }
    for (const field of ['C', 'real', 'realByCurrency', 'recMonthly', 'expenseBase']) {
      expect(project[field], `${field} no debe contener movimientos de ejemplo`).toEqual({});
    }
    expect(project.base).toBe(0);
    expect(project.ten.every(balance => balance.ini === 0)).toBe(true);
    await expect(page.locator('.movementsCard .flowEyeBtn')).toHaveCount(0);
  });

  test('TC-012 [R] Mantener el estimador fuera de la bienvenida y desactivado', async ({ page }) => {
    await beginProject(page);
    await nextWelcomeStep(page);
    await nextWelcomeStep(page);
    await expect(welcome(page).locator('[data-welcome-option="charts"]')).toBeVisible();
    await expect(welcome(page).locator('[data-welcome-option="estimator"]')).toHaveCount(0);
    await expect(welcome(page).getByText('Exchange estimator', { exact: true })).toHaveCount(0);
    await nextWelcomeStep(page);
    await expectProjectReady(page);
    await expect(page.locator('.marketPanel')).toHaveCount(0);
    expect((await savedProject(page)).displayOptions.estimator).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem('kash_private_estimator'))).toBeNull();
  });
});
