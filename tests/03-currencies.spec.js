const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { savedProject } = require('../helpers/onboarding');
const { createLanguageProject, goTo, settingsPage, projectSnapshot } = require('../helpers/language');
const {
  catalogCodes, activeRows, inactiveRow, balanceCard, optionCodes, openCurrencies,
  addCurrency, deactivateCurrency, expectActiveCurrencies, expectNewTransactionCurrencies,
  prepareUsdHistory, financialRecords,
} = require('../helpers/currencies');

const errorsByPage = new WeakMap();
const test = base.extend({
  // Cada worker usa su propio servidor de lectura, cerrado al finalizar.
  currenciesApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],

  // El wizard NO consume ahora el presupuesto del caso. Playwright admite
  // un timeout independiente para la preparación de una fixture.
  cleanCurrencyProject: [async ({ page, context, currenciesApp: app }, use, testInfo) => {
    const started = Date.now();
    const errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(origin => {
      if (location.origin === origin) localStorage.setItem('kash_services_online', '0');
    }, new URL(app.url).origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(app.url).origin
      ? route.continue() : route.abort());
    await base.step('Preparación: comprobar un inicio sin idioma ni proyecto guardados', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
    });
    await base.step('Preparación: completar idioma y wizard mediante la interfaz', async () => {
      await createLanguageProject(page);
    });
    await base.step('Preparación: abrir Monedas en Ajustes', async () => { await openCurrencies(page); });
    // Las acciones que se traben deben señalar el control, sin esperar un minuto.
    page.setDefaultTimeout(5_000);
    await testInfo.attach('currency-setup-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, freshProject: true }), contentType: 'application/json',
    });
    await use();
  }, { auto: true, timeout: 60_000 }],
});

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('03 · Monedas · KA$H v0.690', () => {
  test.setTimeout(30_000);

  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', {
      body: JSON.stringify(errors, null, 2), contentType: 'application/json',
    });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const state = await page.evaluate(() => {
        const raw = localStorage.getItem('kash');
        const current = typeof window.KASHGetProjectJson === 'function'
          ? JSON.parse(window.KASHGetProjectJson()) : null;
        return { persistedCurrencies: raw ? JSON.parse(raw).enabledCurrencies : null,
          liveCurrencies: current?.enabledCurrencies ?? null,
          visibleCurrencyCodes: [...document.querySelectorAll('.kashCurrencyList .kashCurrencyName b')]
            .map(node => node.textContent), settingsPage: document.querySelector('.kashSettingsShell')?.dataset.page ?? null };
      });
      await testInfo.attach('currency-save-diagnostic', {
        body: JSON.stringify(state, null, 2), contentType: 'application/json',
      });
      const detail = await page.locator('.kashInactiveBalanceDetails').evaluateAll(nodes => nodes.map(node => {
        const ancestors = [];
        for (let el = node; el; el = el.parentElement) {
          const style = getComputedStyle(el), rect = el.getBoundingClientRect();
          ancestors.push({ tag: el.tagName, className: el.className, hidden: el.hidden,
            display: style.display, visibility: style.visibility, width: rect.width, height: rect.height });
        }
        return { html: node.outerHTML, ancestors };
      }));
      await testInfo.attach('inactive-currency-dom', {
        body: JSON.stringify(detail, null, 2), contentType: 'application/json',
      });
    }
  });

  test('TC-027 [P] Ofrecer 20 códigos con nombre y bandera local cargada', async ({ page }) => {
    await expectActiveCurrencies(page, ['ARS']);
    const add = page.locator('#kashCurrencyAdd');
    expect(await optionCodes(add)).toEqual(catalogCodes.filter(code => code !== 'ARS'));
    const arsFlag = activeRows(page).locator('.flagSvg[aria-label="ARS"] img');
    await expect(arsFlag).toHaveAttribute('src', /^data:image\/svg\+xml;base64,/);
    await expect.poll(() => arsFlag.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    for (const code of catalogCodes.filter(c => c !== 'ARS')) {
      await test.step(`Nombre y bandera embebida: ${code}`, async () => {
        await expect(add.locator(`option[value="${code}"]`)).toHaveText(new RegExp(`^${code} · .+`));
        await add.selectOption(code);
        const flag = add.locator('..').locator(`.kashSelectFlag .flagSvg[aria-label="${code}"] img`);
        await expect(flag).toHaveAttribute('src', /^data:image\/svg\+xml;base64,/);
        await expect.poll(() => flag.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      });
    }
    // Explorar el catálogo no agrega monedas ni registros financieros.
    expect((await savedProject(page)).enabledCurrencies).toEqual(['ARS']);
    expect((await projectSnapshot(page)).expenses).toEqual([]);
  });

  test('TC-028 [R] Ordenar códigos A–Z en Ajustes, Resumen y nuevas operaciones', async ({ page }) => {
    for (const code of ['USD', 'EUR', 'BRL']) await addCurrency(page, code);
    const expected = ['ARS', 'BRL', 'EUR', 'USD'];
    await expectActiveCurrencies(page, expected);
    expect(await optionCodes(page.locator('#kashCurrencyAdd'))).toEqual(catalogCodes.filter(c => !expected.includes(c)));
    await goTo(page, 'res');
    await expect(page.locator('.kashActiveCurrencyCards > [data-estimate-currency] .holdingText > span:first-child'))
      .toHaveText(expected);
    await expectNewTransactionCurrencies(page, expected);
  });

  test('TC-029 [P] Agregar USD y habilitar sus campos sin crear movimientos', async ({ page }) => {
    await addCurrency(page, 'USD');
    await expectActiveCurrencies(page, ['ARS', 'USD']);
    await goTo(page, 'gastos');
    await expect(page.locator('#ec_USD')).toBeEditable();
    await expect(page.locator('#ea_USD')).toBeEditable();
    await settingsPage(page, 'money', 'balances');
    await expect(page.locator('#bh_USD')).toHaveValue('0');
    await goTo(page, 'res');
    await expect(balanceCard(page, 'USD').locator('.holdingText > strong')).toHaveText('USD 0');
    await expect(balanceCard(page, 'USD').locator('.currencyCardEstimate strong')).toHaveText('USD 0');
    const project = await projectSnapshot(page);
    expect(project.expenses).toEqual([]);
    expect(project.fx).toEqual([]);
    expect(project.tenAdjustments).toEqual([]);
  });

  test('TC-030 [N] Impedir duplicados y no alterar datos al agregar sin selección', async ({ page }) => {
    await addCurrency(page, 'USD');
    await test.step('Excluir las monedas activas del catálogo para impedir duplicados', async () => {
      await expect(page.locator('#kashCurrencyAdd option[value="USD"]')).toHaveCount(0);
      await expect(page.locator('#kashCurrencyAdd option[value="ARS"]')).toHaveCount(0);
    });
    await test.step('Agregar sin selección debe conservar monedas y proyecto completo', async () => {
      await page.locator('#kashCurrencyAdd').selectOption('');
      const before = await projectSnapshot(page);
      await page.locator('[onclick="addConfiguredCurrency()"]').click();
      await expectActiveCurrencies(page, ['ARS', 'USD']);
      expect(await projectSnapshot(page)).toEqual(before);
    });
  });

  test('TC-031 [B] Permitir cinco monedas y bloquear la incorporación de una sexta', async ({ page }) => {
    for (const code of ['USD', 'EUR', 'BRL', 'JPY']) await addCurrency(page, code);
    const expected = ['ARS', 'BRL', 'EUR', 'JPY', 'USD'];
    await expectActiveCurrencies(page, expected);
    await expect(page.locator('.kashCurrencyHead')).toContainText('5 / 5');
    await expect(page.locator('#kashCurrencyAdd')).toBeDisabled();
    await expect(page.locator('[onclick="addConfiguredCurrency()"]')).toBeDisabled();
    // No se fuerza un clic sobre controles deshabilitados ni se llama a funciones internas.
    await goTo(page, 'res');
    await expect(page.locator('.kashActiveCurrencyCards > [data-estimate-currency]')).toHaveCount(5);
    expect((await projectSnapshot(page)).enabledCurrencies).toEqual(expected);
  });

  test('TC-032 [B] Rechazar la desactivación de la última moneda', async ({ page }) => {
    const before = await projectSnapshot(page);
    await deactivateCurrency(page, 'ARS');
    await expect(page.locator('#darkModal .darkModalTitle')).toHaveText('Active currencies');
    await expect(page.locator('#darkModal .darkModalText')).toHaveText('At least one currency must remain active.');
    await page.locator('#darkOk').click();
    await expectActiveCurrencies(page, ['ARS']);
    await expect(activeRows(page).getByRole('switch')).toBeChecked();
    expect(await projectSnapshot(page)).toEqual(before);
  });

  test('TC-033 [R] Desactivar USD conservando gastos, saldo e histórico consultable', async ({ page }) => {
    // El wizard tiene su propia fixture; el caso conserva 30 s, como el resto.
    const before = await test.step('Preparar USD 100 y un gasto pagado de USD 10.50', async () =>
      prepareUsdHistory(page));

    await test.step('Desactivar USD y comprobar que queda únicamente ARS activa', async () => {
      await deactivateCurrency(page, 'USD');
      await expectActiveCurrencies(page, ['ARS']);
      await expect(inactiveRow(page, 'USD')).toBeVisible();
    });

    await test.step('Abrir el histórico de USD desde Ajustes', async () => {
      const button = inactiveRow(page, 'USD').locator('[onclick="openCurrencyHistory(\'USD\')"]');
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      await button.click({ timeout: 5_000 });
      await expect(page.locator('#darkModal .kashCurrencyHistory')).toBeVisible();
    });

    await test.step('Verificar saldo y gasto históricos; cerrar el detalle', async () => {
      const history = page.locator('#darkModal .kashCurrencyHistory');
      await expect(history).toContainText('Café & viaje <b>USD</b>');
      await expect(history).toContainText('USD 10.5');
      await expect(history).toContainText('USD 100');
      await page.locator('#currencyHistoryClose').click({ timeout: 5_000 });
      await expect(history).toHaveCount(0);
    });

    await test.step('Excluir USD de nuevas operaciones de cambio, ajuste y servicio', async () => {
      await expectNewTransactionCurrencies(page, ['ARS']);
    });

    await test.step('Consultar el gasto USD inactivo sin permitir su edición', async () => {
      await goTo(page, 'gastos');
      await expect(page.locator('#ec_USD')).toHaveCount(0);
      await expect(page.locator('#expenseCurrencyFilter')).toBeVisible();
      await page.locator('#expenseCurrencyFilter').selectOption('USD', { timeout: 5_000 });
      await expect(page.locator('#expenseCurrencyFilter option[value="USD"]')).toContainText('Inactive');
      const row = page.locator('.expenseSection[data-expense-currency="USD"] tr[data-expense-index]');
      await expect(row).toContainText('Café & viaje <b>USD</b>');
      await expect(row.locator('.editbtn')).toBeDisabled();
    });

    await test.step('Comparar todos los registros financieros con los originales', async () => {
      expect(financialRecords(await projectSnapshot(page))).toEqual(before);
    });
  });

  test('TC-034 [R] Reactivar USD recuperando edición y saldo sin duplicar gastos', async ({ page }) => {
    const before = await prepareUsdHistory(page);
    await deactivateCurrency(page, 'USD');
    await expectActiveCurrencies(page, ['ARS']);
    await inactiveRow(page, 'USD').locator('[onclick="setCurrencyEnabled(\'USD\',true)"]').click();
    await expectActiveCurrencies(page, ['ARS', 'USD']);
    await expect(inactiveRow(page, 'USD')).toHaveCount(0);
    await goTo(page, 'gastos');
    await expect(page.locator('#ec_USD')).toBeEditable();
    const rows = page.locator('.expenseSection[data-expense-currency="USD"] tr[data-expense-index]');
    await expect(rows).toHaveCount(1);
    await expect(rows.locator('.editbtn')).toBeEnabled();
    await expect(rows.locator('input[type="checkbox"]')).toBeChecked();
    await goTo(page, 'res');
    await expect(balanceCard(page, 'USD').locator('.holdingText > strong')).toHaveText('USD 89.5');
    await expect(balanceCard(page, 'USD').locator('.currencyCardEstimate strong')).toHaveText('USD 89.5');
    expect(financialRecords(await projectSnapshot(page))).toEqual(before);
  });

  test('TC-035 [B] Sustituir una moneda al límite de cinco sin convertir su histórico', async ({ page }) => {
    const before = await prepareUsdHistory(page);
    for (const code of ['BRL', 'EUR', 'JPY']) await addCurrency(page, code);
    await deactivateCurrency(page, 'USD');
    await expectActiveCurrencies(page, ['ARS', 'BRL', 'EUR', 'JPY']);
    await addCurrency(page, 'MXN');
    await expectActiveCurrencies(page, ['ARS', 'BRL', 'EUR', 'JPY', 'MXN']);
    await expect(inactiveRow(page, 'USD').locator('[onclick="setCurrencyEnabled(\'USD\',true)"]')).toBeDisabled();
    await expectNewTransactionCurrencies(page, ['ARS', 'BRL', 'EUR', 'JPY', 'MXN']);
    expect(financialRecords(await projectSnapshot(page))).toEqual(before);
    await goTo(page, 'res');
    await expect(balanceCard(page, 'MXN').locator('.holdingText > strong')).toHaveText('MXN 0');
    await expect(balanceCard(page, 'USD')).toHaveCount(0);
    await expect(page.locator('.kashInactiveBalanceDetails > summary')).toBeVisible();
    await page.locator('.kashInactiveBalanceDetails > summary').click();
    await expect(page.locator('.kashInactiveCurrencyCards [data-estimate-currency="USD"] .holdingText > strong'))
      .toHaveText('USD 89.5');
  });

  test('TC-036 [R] Conservar monedas activas e histórico después de recargar', async ({ page }) => {
    const before = await prepareUsdHistory(page);
    await addCurrency(page, 'EUR');
    await deactivateCurrency(page, 'USD');
    await expectActiveCurrencies(page, ['ARS', 'EUR']);
    await page.reload();
    await expect(page.locator('#kashLanguageDialog')).toHaveCount(0);
    await expect(page.locator('#kashLearning')).toHaveCount(0);
    await openCurrencies(page);
    await expectActiveCurrencies(page, ['ARS', 'EUR']);
    await expect(inactiveRow(page, 'USD')).toBeVisible();
    expect(financialRecords(await projectSnapshot(page))).toEqual(before);
    expect(financialRecords(await savedProject(page))).toEqual(before);
    await expectNewTransactionCurrencies(page, ['ARS', 'EUR']);
  });
});
