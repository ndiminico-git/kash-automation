const { gridMoney } = require('../helpers/money-presentation');
const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot } = require('../helpers/language');
const { addCurrency } = require('../helpers/currencies');
const { createExpense, expectMonthlyTotals, nextMonth } = require('../helpers/expenses');
const {
  budgetRow, budgetCell, openMonthlyBudget, selectBudgetYear, expectBudgetPersisted,
  createMonthlyGroup, createMonthlyService, createBudgetService, beginBudgetEdit,
  writeBudgetAmount, toggleBudgetPaid, expectBudgetUnchanged, openBudgetExpensePayments,
} = require('../helpers/monthly-budget');

const errorsByPage = new WeakMap();
const test = base.extend({
  budgetApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanBudgetProject: [async ({ page, context, budgetApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    const origin = new URL(app.url).origin;
    await context.addInitScript(value => {
      if (location.origin === value) localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await base.step('Preparación: instalación limpia, idioma, bienvenida y planilla vacía', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
      await createLanguageProject(page);
      await openMonthlyBudget(page);
      const project = await projectSnapshot(page);
      expect(project.rub).toEqual([]);
      expect(project.groups).toEqual([]);
      expect(project.C).toEqual({});
      await expectBudgetPersisted(page, project);
    });
    page.setDefaultTimeout(5_000);
    await testInfo.attach('monthly-budget-setup-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, freshProject: true }), contentType: 'application/json',
    });
    await use();
  }, { auto: true, timeout: 60_000 }],
});

test.use({ storageState: { cookies: [], origins: [] } });
test.describe('07 · Consumos Mensuales · KA$H v0.690', () => {
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', {
      body: JSON.stringify(errors), contentType: 'application/json',
    });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const diagnostic = await page.evaluate(() => ({
        project: typeof window.KASHGetProjectJson === 'function' ? JSON.parse(window.KASHGetProjectJson()) : null,
        persisted: JSON.parse(localStorage.getItem('kash') || 'null'),
        year: document.querySelector('.yearNavLabel')?.textContent,
        selected: document.querySelector('#gw td[aria-selected="true"]')?.getAttribute('data-key'),
        amountDraft: document.querySelector('#gw .quickAmount')?.value,
        modal: document.querySelector('#darkModal')?.textContent
          ?? document.querySelector('#expensePaymentPopup')?.textContent ?? null,
      }));
      await testInfo.attach('monthly-budget-diagnostic', {
        body: JSON.stringify(diagnostic, null, 2), contentType: 'application/json',
      });
    }
  });

  test('TC-074 [P] Abrir planilla vacía con doce meses y totales cero sin movimientos inventados', async ({ page }) => {
    const before = await projectSnapshot(page), year = before.inicio.slice(0, 4);
    await expect(page.locator('#gw tr.data-row')).toHaveCount(0);
    expect(await page.locator('#gw th[data-period]').evaluateAll(xs => xs.map(x => x.dataset.period)))
      .toEqual(Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`));
    for (const kind of ['expenses', 'estimated', 'confirmed']) {
      await expect(page.locator(`#gw tr[data-total-currency="ARS"][data-total-kind="${kind}"] td[data-total-month]`))
        .toHaveText(Array(12).fill('ARS 0.00'));
    }
    await expect(page.locator('#gw .realDisplay')).toHaveText(Array(12).fill('—'));
    await expectBudgetUnchanged(page, before);
  });

  test('TC-075 [P] Crear rubros y servicios de ingreso y egreso separando importes ARS y USD', async ({ page }) => {
    await addCurrency(page, 'USD');
    const income = await createMonthlyGroup(page, { name: 'Ingresos QA', type: 'i' });
    const out = await createMonthlyGroup(page, { name: 'Servicios QA', type: 'e' });
    const salary = await createMonthlyService(page, { name: 'Sueldo', group: income });
    const ars = await createMonthlyService(page, { name: 'Internet ARS', group: out });
    const usd = await createMonthlyService(page, { name: 'Servicio USD', group: out, currency: 'USD' });
    await writeBudgetAmount(page, salary, salary.from, '200');
    await writeBudgetAmount(page, ars, ars.from, '50.25');
    await writeBudgetAmount(page, usd, usd.from, '20.50');
    const project = await projectSnapshot(page);
    expect(project.rub.map(r => ({ n: r.n, t: r.t, m: r.m, g: r.g }))).toEqual([
      { n: 'Sueldo', t: 'i', m: 'ARS', g: income.id },
      { n: 'Internet ARS', t: 'e', m: 'ARS', g: out.id },
      { n: 'Servicio USD', t: 'e', m: 'USD', g: out.id },
    ]);
    expect(project.expenses).toEqual([]); // Los servicios directos no inventan gastos detallados.
    await expectMonthlyTotals(page, { month: ars.from, expenses: 'ARS 50.25', calculated: 'ARS 0', projected: 'ARS 149.75' });
    await expectMonthlyTotals(page, { currency: 'USD', month: usd.from, expenses: 'USD 20.5', calculated: 'USD 0', projected: '-USD 20.5' });
  });

  test('TC-076 [N] Rechazar rubro vacío y duplicado sin impedir el mismo nombre en otra sección', async ({ page }) => {
    let before = await projectSnapshot(page);
    for (const name of ['', '   ']) {
      await page.locator('#grn').fill(name);
      await page.locator('.addGroupBtn').click();
      await expect(page.locator('#darkModal .darkModalText')).toHaveText('Enter a category name.');
      await page.locator('#darkOk').click();
      await expectBudgetUnchanged(page, before);
    }
    const group = await createMonthlyGroup(page, { name: 'Servicios', type: 'e' });
    before = await projectSnapshot(page);
    await page.locator('#grn').fill('  SERVICIOS  ');
    await page.locator('.addGroupBtn').click();
    await expect(page.locator('#darkModal .darkModalText')).toHaveText('A category with this name already exists in this section.');
    await page.locator('#darkOk').click();
    await expectBudgetUnchanged(page, before);
    const income = await createMonthlyGroup(page, { name: 'Servicios', type: 'i' });
    expect(income.id).not.toBe(group.id);
    expect((await projectSnapshot(page)).groups).toHaveLength(2);
  });

  test('TC-077 [N] Rechazar servicio sin rubro o sin nombre sin crear filas ni celdas', async ({ page }) => {
    let before = await projectSnapshot(page);
    await page.locator('#nr').fill('Servicio sin destino');
    await page.locator('.addServiceBtn').click();
    await expect(page.locator('#darkModal .darkModalText')).toHaveText('Create and select a category for the item first.');
    await page.locator('#darkOk').click();
    await expectBudgetUnchanged(page, before);
    await createMonthlyGroup(page, { name: 'Destino válido' });
    before = await projectSnapshot(page);
    for (const name of ['', '   ']) {
      await page.locator('#nr').fill(name);
      await page.locator('.addServiceBtn').click();
      await expect(page.locator('#darkModal .darkModalText')).toHaveText('Enter an item name.');
      await page.locator('#darkOk').click();
      await expectBudgetUnchanged(page, before);
    }
    await expect(page.locator('#gw tr.data-row')).toHaveCount(0);
  });

  test('TC-078 [P] Cargar decimales con doble clic y reemplazarlos por teclado sin duplicar datos', async ({ page }) => {
    const service = await createBudgetService(page), month = service.from, key = `${service.id}|${month}`;
    await writeBudgetAmount(page, service, month, '150.75');
    expect((await projectSnapshot(page)).C).toEqual({ [key]: { a: 150.75, p: false, n: '' } });
    await expect(budgetCell(page, service, month).locator('.val')).toHaveText('ARS 150.75');
    await writeBudgetAmount(page, service, month, '200.50', 'keyboard');
    const project = await projectSnapshot(page);
    expect(project.C).toEqual({ [key]: { a: 200.5, p: false, n: '' } });
    expect(project.rub).toEqual([service]);
    await expectMonthlyTotals(page, { month, expenses: 'ARS 200.5', calculated: 'ARS 0', projected: '-ARS 200.5' });
  });

  test('TC-079 [R] Escape descarta el borrador y salir del campo confirma una única modificación', async ({ page }) => {
    const service = await createBudgetService(page), month = service.from;
    await writeBudgetAmount(page, service, month, '10.25');
    const before = await projectSnapshot(page);
    let field = await beginBudgetEdit(page, service, month);
    await field.fill('999');
    await field.press('Escape');
    await expect(page.locator('.quickAmount')).toHaveCount(0);
    await expectBudgetUnchanged(page, before);
    field = await beginBudgetEdit(page, service, month);
    await field.fill('20.50');
    await page.locator('.yearNavLabel').click();
    const after = await projectSnapshot(page);
    expect(after.C).toEqual({ [`${service.id}|${month}`]: { a: 20.5, p: false, n: '' } });
    expect(after.rub).toEqual(before.rub);
    await expectBudgetPersisted(page, after);
  });

  test('TC-080 [R] Confirmar y desmarcar pago cambia la tenencia calculada sin alterar el importe ni la proyección', async ({ page }) => {
    const service = await createBudgetService(page), month = service.from, key = `${service.id}|${month}`;
    const empty = await projectSnapshot(page);
    await toggleBudgetPaid(page, service, month);
    await expectBudgetUnchanged(page, empty); // Cero no se puede marcar pagado.
    await writeBudgetAmount(page, service, month, '100');
    await expectMonthlyTotals(page, { month, expenses: 'ARS 100', calculated: 'ARS 0', projected: '-ARS 100' });
    await toggleBudgetPaid(page, service, month);
    expect((await projectSnapshot(page)).C[key]).toEqual({ a: 100, p: true, n: '' });
    await expect(budgetCell(page, service, month).locator('.pk')).toHaveClass(/\bon\b/);
    await expectMonthlyTotals(page, { month, expenses: 'ARS 100', calculated: '-ARS 100', projected: '-ARS 100' });
    await toggleBudgetPaid(page, service, month);
    expect((await projectSnapshot(page)).C[key]).toEqual({ a: 100, p: false, n: '' });
    await expectMonthlyTotals(page, { month, expenses: 'ARS 100', calculated: 'ARS 0', projected: '-ARS 100' });
  });

  test('TC-081 [B] Poner cero o pulsar Delete limpia el importe y su pago conservando el servicio', async ({ page }) => {
    const service = await createBudgetService(page), month = service.from, key = `${service.id}|${month}`;
    for (const method of ['zero', 'delete']) {
      await writeBudgetAmount(page, service, month, '25.50');
      await toggleBudgetPaid(page, service, month);
      if (method === 'zero') await writeBudgetAmount(page, service, month, '0');
      else {
        await budgetCell(page, service, month).click();
        await page.keyboard.press('Delete');
      }
      const project = await projectSnapshot(page);
      expect(project.C[key]).toEqual({ a: 0, p: false, n: '' });
      expect(project.rub).toEqual([service]);
      await expectBudgetPersisted(page, project);
      await expectMonthlyTotals(page, { month, expenses: 'ARS 0', calculated: 'ARS 0', projected: 'ARS 0' });
    }
  });

  test('TC-082 [B] Conservar un egreso negativo como devolución y reflejar su signo en los totales', async ({ page }) => {
    const service = await createBudgetService(page, 'Devolución QA'), month = service.from;
    await writeBudgetAmount(page, service, month, '-25.50');
    expect((await projectSnapshot(page)).C[`${service.id}|${month}`]).toEqual({ a: -25.5, p: false, n: '' });
    await expectMonthlyTotals(page, { month, expenses: '-ARS 25.5', calculated: 'ARS 0', projected: 'ARS 25.5' });
    await toggleBudgetPaid(page, service, month);
    await expectMonthlyTotals(page, { month, expenses: '-ARS 25.5', calculated: 'ARS 25.5', projected: 'ARS 25.5' });
    expect((await projectSnapshot(page)).rub.filter(r => r.t === 'i')).toEqual([]);
  });

  test('TC-083 [R] Navegar con flechas respeta fila, mes y límites sin modificar movimientos', async ({ page }) => {
    const group = await createMonthlyGroup(page, { name: 'Teclado QA' });
    const a = await createMonthlyService(page, { name: 'A Internet', group });
    const b = await createMonthlyService(page, { name: 'B Telefonía', group });
    const year = Number(a.from.slice(0, 4)) + 1;
    await selectBudgetYear(page, year);
    const before = await projectSnapshot(page);
    await budgetCell(page, a, `${year}-10`).click();
    for (const [key, service, month] of [
      ['ArrowRight', a, '11'], ['ArrowDown', b, '11'], ['ArrowLeft', b, '10'], ['ArrowUp', a, '10'],
    ]) {
      await page.keyboard.press(key);
      await expect(budgetCell(page, service, `${year}-${month}`)).toHaveAttribute('aria-selected', 'true');
      await expect(budgetCell(page, service, `${year}-${month}`)).toBeFocused();
    }
    for (const [month, key] of [['01', 'ArrowLeft'], ['12', 'ArrowRight']]) {
      await budgetCell(page, a, `${year}-${month}`).click();
      await page.keyboard.press(key);
      await expect(budgetCell(page, a, `${year}-${month}`)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.yearNavLabel')).toHaveText(String(year));
    }
    await expectBudgetUnchanged(page, before);
  });

  test('TC-084 [R] Copiar y pegar una celda conserva importe y pago sin crear otro servicio', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const service = await createBudgetService(page), month = service.from, later = nextMonth(month);
    await writeBudgetAmount(page, service, month, '45.75');
    await toggleBudgetPaid(page, service, month);
    await budgetCell(page, service, month).click();
    await page.keyboard.press('Control+c');
    await selectBudgetYear(page, Number(later.slice(0, 4)));
    await budgetCell(page, service, later).click();
    await page.keyboard.press('Control+v');
    const project = await projectSnapshot(page);
    expect(project.C).toEqual({
      [`${service.id}|${month}`]: { a: 45.75, p: true, n: '' },
      [`${service.id}|${later}`]: { a: 45.75, p: true, n: '' },
    });
    expect(project.rub).toEqual([service]);
    await expectBudgetPersisted(page, project);
    for (const period of [month, later]) await expectMonthlyTotals(page, { month: period, expenses: 'ARS 45.75' });
  });

  test('TC-085 [R] Fila automática de Gastos conserva su nota y bloquea edición directa; el check paga todos sus ítems', async ({ page }) => {
    const first = await createExpense(page, { description: 'Café & facturas', amount: '10.25', note: 'Nota propia intacta' });
    const second = await createExpense(page, { description: 'Taxi', amount: '20.50' });
    const before = await projectSnapshot(page), service = before.rub.find(r => r.autoType === 'detail-expenses-ARS');
    await openMonthlyBudget(page);
    const cell = budgetCell(page, service, first.f);
    await expect(cell).toHaveAttribute('data-editable', '0');
    await cell.locator('.val').dblclick();
    await page.keyboard.press('Escape');
    await cell.click();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Delete');
    await expect(page.locator('#gw .quickAmount')).toHaveCount(0);
    await expectBudgetUnchanged(page, before);
    expect(before.C[`${service.id}|${first.f}`].n).toBe('Café & facturas: ARS 10.25\nTaxi: ARS 20.5');
    await expect(cell.locator('.dot')).toBeVisible();
    await toggleBudgetPaid(page, service, first.f);
    const after = await projectSnapshot(page);
    expect(after.expenses).toEqual([{ ...first, paid: true }, { ...second, paid: true }]);
    await expectMonthlyTotals(page, { month: first.f, expenses: 'ARS 30.75', calculated: '-ARS 30.75', projected: '-ARS 30.75' });
  });

  test('TC-086 [R] Detalle de pagos permite cancelar o guardar una selección parcial sin cambiar importes ni notas', async ({ page }) => {
    const first = await createExpense(page, { description: 'Pago A', amount: '100', paid: true, note: 'Conservar nota A' });
    const second = await createExpense(page, { description: 'Pago B', amount: '50' });
    const before = await projectSnapshot(page), service = before.rub.find(r => r.autoType === 'detail-expenses-ARS');
    await openBudgetExpensePayments(page, service, first.f);
    const item = name => page.locator('#expensePaymentPopup .expensePaymentItem').filter({ has: page.getByText(name, { exact: true }) });
    await expect(page.locator('[data-payment-loaded]')).toHaveText('ARS 150');
    await expect(page.locator('[data-payment-paid]')).toHaveText('ARS 100');
    await expect(page.locator('[data-payment-pending]')).toHaveText('ARS 50');
    await item('Pago A').locator('input').uncheck();
    await page.locator('[data-payment-cancel]').click();
    await expectBudgetUnchanged(page, before);
    await openBudgetExpensePayments(page, service, first.f);
    await item('Pago A').locator('input').uncheck();
    await item('Pago B').locator('input').check();
    await expect(page.locator('[data-payment-paid]')).toHaveText('ARS 50');
    await expect(page.locator('[data-payment-pending]')).toHaveText('ARS 100');
    await page.locator('[data-payment-save]').click();
    await expect(page.locator('#expensePaymentPopup')).toHaveCount(0);
    const after = await projectSnapshot(page);
    expect(after.expenses).toEqual([{ ...first, paid: false }, { ...second, paid: true }]);
    expect(after.C[`${service.id}|${first.f}`]).toEqual({ ...before.C[`${service.id}|${first.f}`], p: false });
    await expectBudgetPersisted(page, after);
    await expectMonthlyTotals(page, { month: first.f, expenses: 'ARS 150', calculated: '-ARS 50', projected: '-ARS 150' });
  });

  test('TC-087 [R] Renombrar el servicio trata símbolos como texto y conserva importes y pagos en todos los meses', async ({ page }) => {
    const service = await createBudgetService(page), month = service.from, later = nextMonth(month);
    await writeBudgetAmount(page, service, month, '10.25');
    await toggleBudgetPaid(page, service, month);
    await writeBudgetAmount(page, service, later, '20.50');
    const before = await projectSnapshot(page), name = '<b>Café & Luz!</b>';
    await budgetRow(page, service).locator('td').first().dblclick();
    await expect(page.locator('#renameRubroTitle')).toHaveText('Edit item name');
    await page.locator('#renameRubroInput').fill('Cancelar este nombre');
    await page.locator('#renameRubroCancel').click();
    await expectBudgetUnchanged(page, before);
    await budgetRow(page, service).locator('td').first().dblclick();
    await page.locator('#renameRubroInput').fill(name);
    await page.locator('#renameRubroSave').click();
    const after = await projectSnapshot(page);
    expect(after.rub).toEqual([{ ...service, n: name }]);
    expect(after.C).toEqual(before.C);
    await expect(budgetRow(page, service).locator('td').first()).toHaveText(name);
    await expect(budgetRow(page, service).locator('.rubroCellLabel b')).toHaveCount(0);
    await expectBudgetPersisted(page, after);
  });

  test('TC-088 [R] Navegar años y recargar conserva estructura, celdas e IDs sin repetir el wizard', async ({ page }) => {
    const service = await createBudgetService(page, 'Persistencia mensual'), month = service.from, later = nextMonth(month);
    await writeBudgetAmount(page, service, month, '10.25');
    await toggleBudgetPaid(page, service, month);
    await writeBudgetAmount(page, service, later, '20.50');
    const before = await projectSnapshot(page), firstYear = Number(month.slice(0, 4));
    await selectBudgetYear(page, firstYear + 1);
    await expect(page.locator('#gw th[data-period]')).toHaveCount(12);
    await selectBudgetYear(page, firstYear);
    await page.locator('.monthNav > button').first().click();
    await expect(page.locator('.yearNavLabel')).toHaveText(String(firstYear));
    await expectBudgetUnchanged(page, before);
    await page.reload();
    await expect(page.locator('#kashLanguageDialog')).toHaveCount(0);
    await expect(page.locator('#kashLearning')).toHaveCount(0);
    await openMonthlyBudget(page);
    const after = await projectSnapshot(page);
    const { nid: beforeNextId, ...expected } = before;
    const { nid: afterNextId, ...actual } = after;
    expect(afterNextId).toBeGreaterThanOrEqual(beforeNextId);
    expect(actual).toEqual(expected);
    for (const [period, value] of [[month, '10.25'], [later, '20.5']]) {
      await selectBudgetYear(page, Number(period.slice(0, 4)));
      await expect(budgetCell(page, service, period).locator('.val')).toHaveText(gridMoney(`ARS ${value}`));
      await expectMonthlyTotals(page, { month: period, expenses: `ARS ${value}` });
    }
  });
});


const { test: upgradeTest } = require('../helpers/upgrade-fixture');
upgradeTest.describe('07 · Selección de importes · KA$H v0.690', () => {
  upgradeTest.setTimeout(60_000);
  upgradeTest('TC-198 [R] Selección con Shift suma un negativo y un cero cargado sin editar datos', async ({ page }) => {
    const service = await createBudgetService(page, 'Selección QA');
    await writeBudgetAmount(page, service, '2026-10', '12.3456');
    await writeBudgetAmount(page, service, '2026-11', '-2.3456');
    await writeBudgetAmount(page, service, '2026-12', '0');
    const before = await projectSnapshot(page);
    await expect(budgetCell(page, service, '2026-10').locator('.val')).toHaveText('ARS 12.35');
    expect(before.C[`${service.id}|2026-10`].a).toBe(12.3456);
    await budgetCell(page, service, '2026-10').click();
    await budgetCell(page, service, '2026-12').click({ modifiers: ['Shift'] });
    const bar = page.locator('#kashGridSelectionBar');
    await expect(bar.locator('.kashGridSelectionGroups strong')).toHaveText('ARS 10');
    await expect(bar.locator('.kashGridSelectionGroups')).toContainText('Count: 3');
    await expect(bar.locator('.kashGridSelectionActions > span')).toHaveText('3 selected cells');
    await bar.getByRole('button', { name: 'Clear selection', exact: true }).click();
    await expect(bar.locator('.kashGridSelectionGroups strong')).toHaveText('—');
    await expectBudgetUnchanged(page, before);
  });
  upgradeTest('TC-199 [R] Selección discontinua con Ctrl separa ARS y USD y Escape la limpia', async ({ page }) => {
    await require('../helpers/currencies').addCurrency(page, 'USD');
    const group = await createMonthlyGroup(page, { name: 'Dos monedas QA' });
    const ars = await createMonthlyService(page, { name: 'ARS QA', group });
    const usd = await createMonthlyService(page, { name: 'USD QA', group, currency: 'USD' });
    await writeBudgetAmount(page, ars, '2026-10', '10');
    await writeBudgetAmount(page, usd, '2026-10', '20');
    const before = await projectSnapshot(page);
    await budgetCell(page, ars, '2026-10').click();
    await budgetCell(page, usd, '2026-10').click({ modifiers: ['Control'] });
    const bar = page.locator('#kashGridSelectionBar');
    await expect(bar.locator('.kashGridSelectionGroups strong')).toHaveText(['ARS 10', 'USD 20']);
    await page.keyboard.press('Escape');
    await expect(bar.locator('.kashGridSelectionGroups strong')).toHaveText('—');
    await expectBudgetUnchanged(page, before);
  });
});
