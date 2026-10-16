const { test, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { savedProject } = require('../helpers/onboarding');
const {
  navigation, projectName, goTo, settingsPage, changeLanguage, createLanguageProject,
  projectSnapshot, addExpense, prepareFinancialData, changeLanguageWithOverlayOpen,
} = require('../helpers/language');

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('02 · Idiomas · KA$H v0.677', () => {
  let app;
  const errorsByPage = new WeakMap();

  test.beforeAll(async () => { app = await startAppServer(); });
  test.afterAll(async () => { await app?.close(); });

  test.beforeEach(async ({ page, context }) => {
    const errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    context.on('page', otherPage => otherPage.on('pageerror', error => errors.push(error.message)));
    await context.addInitScript(origin => {
      // Una pestaña nueva comienza en about:blank, donde no hay localStorage.
      // Preparar la preferencia únicamente al cargar el origen de nuestra app.
      if (location.origin === origin) localStorage.setItem('kash_services_online', '0');
    }, new URL(app.url).origin);
    await context.route('**/*', route => {
      const local = new URL(route.request().url()).origin === new URL(app.url).origin;
      return local ? route.continue() : route.abort();
    });
    await page.goto(app.url);
    expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
    await createLanguageProject(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', {
      body: JSON.stringify(errors, null, 2), contentType: 'application/json',
    });
    expect.soft(errors, 'Sin errores JavaScript, incluidas pestañas adicionales').toEqual([]);
  });

  test('TC-013 [P] Cambiar de inglés a español desde Ajustes', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await changeLanguage(page, 'es');
    await expect(page.locator('#ks_settings_content')).toContainText('Idioma de la interfaz');
    await expect(page.locator('#nav').getByRole('button', { name: 'Ajustes', exact: true })).toBeVisible();
    await expect(page.locator('#nav').getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
  });

  test('TC-014 [P] Cambiar de español a inglés desde Ajustes', async ({ page }) => {
    await test.step('Preparar la interfaz en español mediante su selector', async () => {
      await changeLanguage(page, 'es');
    });
    await changeLanguage(page, 'en');
    await expect(page.locator('#ks_settings_content')).toContainText('Interface language');
    await expect(page.locator('#nav').getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.locator('#nav').getByRole('button', { name: 'Ajustes', exact: true })).toHaveCount(0);
  });

  test('TC-015 [R] Conservar el idioma elegido después de recargar', async ({ page }) => {
    await changeLanguage(page, 'es');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('#v').getByRole('heading', { name: 'Resumen', exact: true })).toBeVisible();
    await settingsPage(page, 'appearance', 'language');
    await expect(page.locator('#ks_language')).toHaveValue('es');
    expect((await savedProject(page)).name).toBe(projectName);
  });

  test('TC-016 [R] No repetir la selección inicial al abrir otra pestaña de la misma sesión', async ({ page, context }) => {
    const otherPage = await context.newPage();
    await otherPage.goto(app.url);
    await expect(otherPage.locator('#v').getByRole('heading', { name: 'Summary', exact: true })).toBeVisible();
    await expect(otherPage.locator('#kashLanguageDialog')).toHaveCount(0);
    await expect(otherPage.locator('html')).toHaveAttribute('lang', 'en');
    expect((await projectSnapshot(otherPage)).name).toBe(projectName);
    await expect(page.locator('#kashLanguageDialog')).toHaveCount(0);
    await otherPage.close();
  });

  test('TC-017 [R] Traducir los nombres de las secciones de navegación', async ({ page }) => {
    for (const language of ['es', 'en']) {
      await changeLanguage(page, language);
      const menu = page.locator('#nav .navPrimary > button .lbl');
      await expect(menu).toHaveText(['res', 'grid', 'fx', 'gastos', 'cu'].map(key => navigation[language][key]));
    }
  });

  test('TC-018 [R] Actualizar meses y nombres de monedas', async ({ page }) => {
    await goTo(page, 'res');
    await expect(page.locator('.summaryPeriodSelect.period option[value="12"]')).toHaveText('December');
    await settingsPage(page, 'money', 'currencies');
    await expect(page.locator('.kashCurrencyName span').first()).toHaveText('Argentine peso');
    await expect(page.locator('#kashCurrencyAdd option[value="USD"]')).toHaveText('USD · US dollar');
    await changeLanguage(page, 'es');
    await goTo(page, 'res');
    await expect(page.locator('.summaryPeriodSelect.period option[value="12"]')).toHaveText('Diciembre');
    await settingsPage(page, 'money', 'currencies');
    await expect(page.locator('.kashCurrencyName span').first()).toHaveText('Peso argentino');
    await expect(page.locator('#kashCurrencyAdd option[value="USD"]')).toHaveText('USD · Dólar estadounidense');
  });

  test('TC-019 [R] Traducir mensajes de validación y confirmaciones', async ({ page }) => {
    await addExpense(page, { description: 'Gasto para validar mensajes', amount: '10' });
    for (const language of ['en', 'es']) {
      await changeLanguage(page, language);
      await goTo(page, 'gastos');
      await page.locator('[onclick="saveExpense(\'ARS\')"]').click();
      await expect(page.locator('#darkModal .darkModalTitle')).toHaveText(language === 'en' ? 'Missing information' : 'Faltan datos');
      await expect(page.locator('#darkModal .darkModalText')).toHaveText(language === 'en'
        ? 'Enter the month, description and amount in ARS.' : 'Completá mes, concepto y monto en ARS.');
      await expect(page.locator('#darkOk')).toHaveText(language === 'en' ? 'OK' : 'Aceptar');
      await page.locator('#darkOk').click();
      await page.locator('.expenseSection[data-expense-currency="ARS"] tr[data-expense-index] .trashbtn').click();
      await expect(page.locator('#darkModal .darkModalTitle')).toHaveText(language === 'en' ? 'Confirm' : 'Confirmar');
      await expect(page.locator('#darkModal .darkModalText')).toHaveText(language === 'en'
        ? 'Delete this expense in ARS?' : '¿Borrar este gasto en ARS?');
      await expect(page.locator('#darkCancel')).toHaveText(language === 'en' ? 'Cancel' : 'Cancelar');
      await page.locator('#darkCancel').click();
      expect((await projectSnapshot(page)).expenses).toHaveLength(1);
    }
  });

  test('TC-020 [R] Integración: actualizar la ayuda F1 mientras sigue abierta', async ({ page }) => {
    await page.keyboard.press('F1');
    await expect(page.locator('#kashLearning[data-kind="help"]')).toBeVisible();
    await page.locator('[data-help-topic="res"]').click();
    await expect(page.locator('.learnHelpArticle')).toContainText('Calculated balance');
    await changeLanguageWithOverlayOpen(page, 'es', 'help');
    await expect(page.locator('#learnTitle')).toHaveText('Ayuda de KA$H');
    await expect(page.locator('.learnHelpArticle')).toContainText('La tenencia calculada considera solo movimientos confirmados.');
    await expect(page.locator('[data-help-topic="res"].learnPrimary')).toHaveText('Resumen');
    await expect(page.locator('.learnHelpNav [data-help-topic]')).toHaveCount(9);
    await changeLanguageWithOverlayOpen(page, 'en', 'help');
    await expect(page.locator('#learnTitle')).toHaveText('KA$H help');
    await expect(page.locator('.learnHelpArticle')).toContainText('Calculated balance');
    await expect(page.locator('[data-help-topic="res"].learnPrimary')).toHaveText('Summary');
  });

  test('TC-021 [R] Integración: actualizar una guía activa sin reiniciarla', async ({ page }) => {
    await page.keyboard.press('F1');
    await page.locator('[data-help-topic="res"]').click();
    await page.locator('[data-help-guide="res"]').click();
    const tour = page.locator('#kashLearning[data-kind="tour"]');
    await expect(tour.locator('#learnTitle')).toHaveText('Choose a period');
    const step = await tour.locator('.learnNumber').innerText();
    await changeLanguageWithOverlayOpen(page, 'es', 'tour');
    await expect(tour.locator('#learnTitle')).toHaveText('Elegí el período');
    await expect(tour.locator('.learnNumber')).toHaveText(step);
    await expect(tour.locator('[data-learn="tour-next"]')).toHaveText('Siguiente');
    await changeLanguageWithOverlayOpen(page, 'en', 'tour');
    await expect(tour.locator('#learnTitle')).toHaveText('Choose a period');
    await expect(tour.locator('.learnNumber')).toHaveText(step);
    await expect(tour.locator('[data-learn="tour-next"]')).toHaveText('Next');
  });

  test('TC-022 [B] Alternar repetidamente entre ambos idiomas', async ({ page }) => {
    await settingsPage(page, 'appearance', 'language');
    const before = await projectSnapshot(page);
    for (const language of ['es', 'en', 'es', 'en', 'es', 'en', 'es', 'en']) {
      await page.locator('#ks_language').selectOption(language);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.locator('#ks_settings_title')).toHaveText(language === 'en' ? 'Appearance' : 'Apariencia');
      await expect(page.locator('#ks_language')).toHaveCount(1);
      await expect(page.locator('#kashLanguageDialog')).toHaveCount(0);
      expect(await projectSnapshot(page)).toEqual(before);
    }
  });

  test('TC-023 [R] Conservar nombres, notas y comentarios del usuario', async ({ page }) => {
    await addExpense(page, {
      description: 'Guardar & Save <b>Café</b>', amount: '150.75',
      note: 'Gastos / Notes / comentario "mañana"',
    });
    const ownNote = 'Resumen / Summary & Ahorros <b>USD</b>';
    await goTo(page, 'cu');
    await page.locator('#rt').fill(ownNote);
    await page.locator('[onclick="addOwnReminder()"]').click();
    await expect.poll(async () => (await savedProject(page)).rec.map(item => item.t)).toContain(ownNote);
    const before = await projectSnapshot(page);
    await changeLanguage(page, 'es');
    expect(await projectSnapshot(page)).toEqual(before);
    await goTo(page, 'gastos');
    await expect(page.getByText('Guardar & Save <b>Café</b>', { exact: true })).toBeVisible();
    await expect(page.getByText('Gastos / Notes / comentario "mañana"', { exact: true })).toBeVisible();
    await goTo(page, 'cu');
    await expect(page.getByText(ownNote, { exact: true })).toBeVisible();
    await changeLanguage(page, 'en');
    expect(await projectSnapshot(page)).toEqual(before);
    expect(await savedProject(page)).toEqual(before);
  });

  test('TC-024 [R] Mantener importes y saldos al cambiar de idioma', async ({ page }) => {
    test.slow(); // Prepara tres gastos y dos saldos usando exclusivamente la UI.
    await prepareFinancialData(page);
    const before = await projectSnapshot(page);
    const ars = page.locator('.kashActiveCurrencyCards > [data-estimate-currency="ARS"]');
    const usd = page.locator('.kashActiveCurrencyCards > [data-estimate-currency="USD"]');
    await expect(ars.locator('.holdingText > strong')).toHaveText('ARS 849.25');
    await expect(ars.locator('.currencyCardEstimate strong')).toHaveText('ARS 649');
    await expect(usd.locator('.holdingText > strong')).toHaveText('USD 89.5');
    await changeLanguage(page, 'es');
    await goTo(page, 'res');
    await expect(ars.locator('.holdingText > strong')).toHaveText('ARS 849,25');
    await expect(ars.locator('.currencyCardEstimate strong')).toHaveText('ARS 649');
    await expect(usd.locator('.holdingText > strong')).toHaveText('USD 89,5');
    expect(await projectSnapshot(page)).toEqual(before);
    await changeLanguage(page, 'en');
    await goTo(page, 'res');
    await expect(ars.locator('.holdingText > strong')).toHaveText('ARS 849.25');
    await expect(usd.locator('.holdingText > strong')).toHaveText('USD 89.5');
    expect(await projectSnapshot(page)).toEqual(before);
  });

  test('TC-025 [R] No generar cambios pendientes por cambiar sólo el idioma', async ({ page }) => {
    await page.reload(); // Proyecto persistido, sin nuevas ediciones en esta sesión.
    await expect(page.locator('#kfx-save .kfx-save-label')).toHaveText('Not saved');
    const before = await projectSnapshot(page);
    const diskBefore = await page.evaluate(() => localStorage.getItem('kash'));
    const historyButtons = page.locator('#nav .navActionBtn');
    await expect(historyButtons).toHaveCount(2);
    await expect(historyButtons.nth(0)).toBeDisabled();
    await expect(historyButtons.nth(1)).toBeDisabled();
    await changeLanguage(page, 'es');
    await expect(page.locator('#kfx-save .kfx-save-label')).toHaveText('Sin guardar');
    await expect(historyButtons.nth(0)).toBeDisabled();
    await expect(historyButtons.nth(1)).toBeDisabled();
    await changeLanguage(page, 'en');
    await expect(page.locator('#kfx-save .kfx-save-label')).toHaveText('Not saved');
    expect(await projectSnapshot(page)).toEqual(before);
    expect(await page.evaluate(() => localStorage.getItem('kash'))).toBe(diskBefore);
  });

  test('TC-026 [B] Conservar un formulario parcial al cambiar el idioma desde Ajustes', async ({ page }) => {
    await settingsPage(page, 'money', 'adjustments');
    const before = await projectSnapshot(page);
    const date = await page.locator('#taf').inputValue();
    await page.locator('#taa').fill('123.45');
    await page.locator('#tad').selectOption('minus');
    await page.locator('#tan').fill('Borrador & Draft <b>sin guardar</b>');
    await changeLanguage(page, 'es');
    await settingsPage(page, 'money', 'adjustments');
    await expect(page.locator('#taf')).toHaveValue(date);
    await expect(page.locator('#taa')).toHaveValue('123.45');
    await expect(page.locator('#tad')).toHaveValue('minus');
    await expect(page.locator('#tan')).toHaveValue('Borrador & Draft <b>sin guardar</b>');
    await expect(page.locator('[onclick="saveTenAdjustment()"]')).toHaveText('Agregar ajuste');
    expect(await projectSnapshot(page)).toEqual(before);
    expect((await savedProject(page)).tenAdjustments).toEqual([]);
    await changeLanguage(page, 'en');
    await settingsPage(page, 'money', 'adjustments');
    await expect(page.locator('#taa')).toHaveValue('123.45');
    await expect(page.locator('#tan')).toHaveValue('Borrador & Draft <b>sin guardar</b>');
    expect(await projectSnapshot(page)).toEqual(before);
  });
});
