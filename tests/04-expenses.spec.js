const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot, goTo } = require('../helpers/language');
const { addCurrency } = require('../helpers/currencies');
const {
  expenseSection, expenseRows, expenseRow, saveButton, readSavedProject,
  expectPersistedExpenses, openExpenses, fillExpense, createExpense,
  expectRejectedExpense, beginExpenseEdit, expectMonthlyTotals, nextMonth,
} = require('../helpers/expenses');

const errorsByPage = new WeakMap();
const test = base.extend({
  expensesApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanExpensesProject: [async ({ page, context, expensesApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(origin => {
      if (location.origin === origin) localStorage.setItem('kash_services_online', '0');
    }, new URL(app.url).origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(app.url).origin
      ? route.continue() : route.abort());
    await base.step('Preparación: abrir KA$H sin idioma ni proyecto previos', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
    });
    await base.step('Preparación: recorrer idioma y bienvenida por UI', async () => {
      await createLanguageProject(page);
    });
    await base.step('Preparación: abrir Gastos vacío', async () => {
      await openExpenses(page);
      await expect(expenseRows(page)).toHaveCount(0);
      await expectPersistedExpenses(page, []);
    });
    page.setDefaultTimeout(5_000);
    await testInfo.attach('expense-setup-timing', {
      body: JSON.stringify({ setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
        testTimeoutMs: testInfo.timeout, freshProject: true }), contentType: 'application/json',
    });
    await use();
  }, { auto: true, timeout: 60_000 }],
});

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('04 · Gastos · KA$H v0.677', () => {
  // Presupuesto común para CRUD y verificaciones en varias pantallas.
  // El wizard tiene otros 60 s propios; cada acción y expect conserva 5 s.
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', {
      body: JSON.stringify(errors, null, 2), contentType: 'application/json',
    });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const state = await page.evaluate(() => {
        const raw = localStorage.getItem('kash');
        return { storedExpenses: raw ? JSON.parse(raw).expenses : null,
          currentProject: typeof window.KASHGetProjectJson === 'function' ? JSON.parse(window.KASHGetProjectJson()) : null,
          modalText: document.querySelector('#darkModal')?.textContent ?? null,
          fields: [...document.querySelectorAll('.expenseForm input[id]')]
            .map(input => ({ id: input.id, value: input.value, checked: input.checked })) };
      });
      await testInfo.attach('expense-state-diagnostic', {
        body: JSON.stringify(state, null, 2), contentType: 'application/json',
      });
    }
  });

  test('TC-037 [P] Iniciar Gastos sin registros ni importes de ejemplo', async ({ page }) => {
    await expect(expenseRows(page)).toHaveCount(0);
    await expect(expenseSection(page).locator('.expenseNoMatch')).toContainText('No expenses');
    await expect(page.locator('#ec_ARS')).toHaveValue('');
    await expect(page.locator('#ea_ARS')).toHaveValue('');
    await expect(page.locator('#en_ARS')).toHaveValue('');
    await expect(page.locator('#epaid_ARS')).not.toBeChecked();
    await expect(page.locator('#erepeat_ARS')).not.toBeChecked();
    const project = await projectSnapshot(page);
    expect(project.expenses).toEqual([]);
    expect(project.expenseRecurrences).toEqual([]);
    expect(project.fx).toEqual([]);
    const month = await page.locator('#ef_ARS').inputValue();
    await expectMonthlyTotals(page, { month, expenses: 'ARS 0', calculated: 'ARS 0', projected: 'ARS 0' });
  });

  test('TC-038 [P] Agregar un gasto ARS pendiente y reflejarlo una sola vez en la planilla', async ({ page }) => {
    const record = await createExpense(page, { description: 'Café & Facturas!', amount: '150.75' });
    expect(record).toMatchObject({ m: 'ARS', c: 'Café & Facturas!', a: 150.75, paid: false, n: '' });
    await expect(expenseRows(page)).toHaveCount(1);
    await expect(expenseRow(page, 'ARS', record.c).locator('td').nth(2)).toHaveText('ARS 150.75');
    await expect(page.locator('#ec_ARS')).toHaveValue('');
    await expect(page.locator('#ea_ARS')).toHaveValue('');
    await expectMonthlyTotals(page, { month: record.f, expenses: 'ARS 150.75', calculated: 'ARS 0', projected: '-ARS 150.75' });
    const project = await projectSnapshot(page);
    expect(project.rub.filter(r => r.autoType === 'detail-expenses-ARS')).toHaveLength(1);
    expect(project.C[`${project.rub.find(r => r.autoType === 'detail-expenses-ARS').id}|${record.f}`].a).toBe(150.75);
  });

  test('TC-039 [R] Registrar ARS, EUR y USD sin mezclar importes ni monedas', async ({ page }) => {
    await addCurrency(page, 'USD');
    await addCurrency(page, 'EUR');
    const ars = await createExpense(page, { description: 'Compra local', amount: '100', paid: true });
    const eur = await createExpense(page, { currency: 'EUR', description: 'Servicio Europa', amount: '20.25', paid: true });
    const usd = await createExpense(page, { currency: 'USD', description: 'Servicio USA', amount: '10.50' });
    expect((await projectSnapshot(page)).expenses.map(x => ({ m: x.m, a: x.a, paid: x.paid })))
      .toEqual([{ m: 'ARS', a: 100, paid: true }, { m: 'EUR', a: 20.25, paid: true }, { m: 'USD', a: 10.5, paid: false }]);
    for (const [currency, record, expenses, calculated, projected] of [
      ['ARS', ars, 'ARS 100', '-ARS 100', '-ARS 100'],
      ['EUR', eur, 'EUR 20.25', '-EUR 20.25', '-EUR 20.25'],
      ['USD', usd, 'USD 10.5', 'USD 0', '-USD 10.5'],
    ]) await expectMonthlyTotals(page, { currency, month: record.f, expenses, calculated, projected });
    expect((await projectSnapshot(page)).fx).toEqual([]);
  });

  test('TC-040 [B] Conservar acentos, símbolos y etiquetas como texto literal', async ({ page }) => {
    const description = '<b>Café & Facturas!</b> "mañana" ☕';
    const note = 'Notas <strong>USD</strong> & café: "sin traducir"';
    const record = await createExpense(page, { description, amount: '15.25', note });
    expect(record).toMatchObject({ c: description, n: note, a: 15.25 });
    const row = expenseRow(page, 'ARS', description);
    await expect(row.locator('.expenseConceptText')).toHaveText(description);
    await expect(row.locator('.noteCell')).toHaveText(note);
    await expect(row.locator('.expenseConceptText b, .noteCell strong')).toHaveCount(0);
    await expectPersistedExpenses(page, [record]);
  });

  test('TC-041 [P] Permitir notas vacías y recortar espacios externos del concepto', async ({ page }) => {
    const record = await createExpense(page, { description: '   Compra sin nota   ', amount: '25', note: '   ' });
    expect(record).toMatchObject({ c: 'Compra sin nota', n: '', a: 25 });
    await expect(expenseRow(page, 'ARS', 'Compra sin nota').locator('.noteCell')).toHaveText('');
  });

  test('TC-042 [N] Rechazar concepto vacío o compuesto únicamente por espacios', async ({ page }) => {
    for (const description of ['', '   ']) await test.step(`Concepto inválido: ${JSON.stringify(description)}`, async () => {
      await expectRejectedExpense(page, { description, amount: '10' });
    });
  });

  test('TC-043 [N] Rechazar un gasto sin monto y conservar el borrador', async ({ page }) => {
    await expectRejectedExpense(page, { description: 'Borrador sin monto', note: 'No perder esta nota' });
    await expect(page.locator('#ec_ARS')).toHaveValue('Borrador sin monto');
    await expect(page.locator('#en_ARS')).toHaveValue('No perder esta nota');
    await expect(page.locator('#ea_ARS')).toHaveValue('');
  });

  test('TC-044 [N] Rechazar un gasto sin mes sin crear filas automáticas', async ({ page }) => {
    await expectRejectedExpense(page, { description: 'Sin período', amount: '10', month: '' });
    expect((await projectSnapshot(page)).rub).toEqual([]);
  });

  test('TC-045 [N] Rechazar monto cero sin generar movimientos', async ({ page }) => {
    await expectRejectedExpense(page, { description: 'Importe cero', amount: '0' });
    expect((await projectSnapshot(page)).C).toEqual({});
  });

  test('TC-046 [N] Rechazar texto e importes no finitos', async ({ page }) => {
    // La máscara elimina letras (1e309 se vuelve 1309). Para desbordamiento
    // se ingresan dígitos que permanecen en el campo y exceden Number.MAX_VALUE.
    const inputs = [
      { label: 'Letras', amount: 'abc', expectedAmountField: '' },
      { label: 'NaN', amount: 'NaN', expectedAmountField: '' },
      { label: 'Infinity', amount: 'Infinity', expectedAmountField: '' },
      { label: 'Número de 310 dígitos', amount: '9'.repeat(310), expectedAmountField: '9'.repeat(310) },
    ];
    for (const input of inputs) await test.step(`Monto inválido: ${input.label}`, async () => {
      await expectRejectedExpense(page, { description: 'No registrar importe inválido', ...input });
    });
    expect((await projectSnapshot(page)).rub).toEqual([]);
  });

  test('TC-047 [B] Conservar un gasto negativo como devolución y su efecto en los saldos', async ({ page }) => {
    const record = await createExpense(page, { description: 'Devolución de compra', amount: '-25.50', paid: true });
    expect(record).toMatchObject({ a: -25.5, m: 'ARS', paid: true });
    const amountCell = expenseRow(page, 'ARS', record.c).locator('td').nth(2);
    await expect(amountCell).toHaveText('-ARS 25.5');
    await expect(amountCell).toHaveClass(/kashNegativeAmount/);
    expect((await projectSnapshot(page)).rub.every(r => r.t === 'e')).toBe(true);
    await expectMonthlyTotals(page, { month: record.f, expenses: '-ARS 25.5', calculated: 'ARS 25.5', projected: 'ARS 25.5' });
  });

  test('TC-048 [B] Conservar varios decimales en los datos y redondear sólo su visualización', async ({ page }) => {
    const record = await createExpense(page, { description: 'Precisión decimal', amount: '150.7567' });
    expect(record.a).toBe(150.7567);
    await expect(expenseRow(page, 'ARS', record.c).locator('td').nth(2)).toHaveText('ARS 150.76');
    await expectMonthlyTotals(page, { month: record.f, expenses: 'ARS 150.76', calculated: 'ARS 0', projected: '-ARS 150.76' });
    expect((await readSavedProject(page)).expenses[0].a).toBe(150.7567);
  });

  test('TC-049 [R] Marcar y desmarcar pagado actualizando el saldo calculado', async ({ page }) => {
    const record = await createExpense(page, { description: 'Pago reversible', amount: '80.25' });
    for (const paid of [true, false]) await test.step(paid ? 'Confirmar pago' : 'Volver a pendiente', async () => {
      await openExpenses(page);
      await expenseRow(page, 'ARS', record.c).locator('.expensePaidCell input').setChecked(paid);
      await expect(expenseRow(page, 'ARS', record.c).locator('.expensePaidCell input')).toBeChecked({ checked: paid });
      const expected = { ...record, paid };
      expect((await projectSnapshot(page)).expenses).toEqual([expected]);
      await expectPersistedExpenses(page, [expected]);
      await expectMonthlyTotals(page, { month: record.f, expenses: 'ARS 80.25',
        calculated: paid ? '-ARS 80.25' : 'ARS 0', projected: '-ARS 80.25' });
    });
  });

  test('TC-050 [R] Editar concepto, monto y nota conservando el ID sin duplicar', async ({ page }) => {
    const record = await createExpense(page, { description: 'Original', amount: '10', note: 'Nota anterior', paid: true });
    await beginExpenseEdit(page, 'ARS', record.c);
    await fillExpense(page, { description: 'Editado & Café', amount: '35.75', note: 'Nota editada', paid: true });
    await saveButton(page).click();
    const expected = { ...record, c: 'Editado & Café', a: 35.75, n: 'Nota editada' };
    await expect(expenseRows(page)).toHaveCount(1);
    await expect(expenseRow(page, 'ARS', record.c)).toHaveCount(0);
    await expect(expenseRow(page, 'ARS', expected.c).locator('.noteCell')).toHaveText(expected.n);
    expect((await projectSnapshot(page)).expenses).toEqual([expected]);
    await expectPersistedExpenses(page, [expected]);
    await expect(saveButton(page)).toHaveText('Add expense');
    await expectMonthlyTotals(page, { month: record.f, expenses: 'ARS 35.75', calculated: '-ARS 35.75', projected: '-ARS 35.75' });
  });

  test('TC-051 [R] Cancelar una edición conserva el registro y su estado de pago', async ({ page }) => {
    const record = await createExpense(page, { description: 'No modificar', amount: '20', note: 'Nota original', paid: true });
    const before = await projectSnapshot(page);
    await beginExpenseEdit(page, 'ARS', record.c);
    await fillExpense(page, { description: 'Cambio descartado', amount: '999', note: 'Borrador', paid: false });
    await expenseSection(page).locator('[onclick="cancelExpense()"]').click();
    await expect(saveButton(page)).toHaveText('Add expense');
    await expect(expenseRow(page, 'ARS', record.c)).toBeVisible();
    await expect(expenseRow(page, 'ARS', 'Cambio descartado')).toHaveCount(0);
    await expect(expenseRow(page, 'ARS', record.c).locator('.expensePaidCell input')).toBeChecked();
    expect(await projectSnapshot(page)).toEqual(before);
    await expectPersistedExpenses(page, [record]);
  });

  test('TC-052 [R] Cambiar el mes mueve el gasto y actualiza ambas columnas sin duplicar', async ({ page }) => {
    const record = await createExpense(page, { description: 'Gasto trasladado', amount: '60.25' });
    const target = nextMonth(record.f);
    await beginExpenseEdit(page, 'ARS', record.c);
    await page.locator('#ef_ARS').fill(target);
    await saveButton(page).click();
    const expected = { ...record, f: target };
    expect((await projectSnapshot(page)).expenses).toEqual([expected]);
    await expectPersistedExpenses(page, [expected]);
    await expect(expenseRows(page)).toHaveCount(1);
    await expectMonthlyTotals(page, { month: record.f, expenses: 'ARS 0', calculated: 'ARS 0', projected: 'ARS 0' });
    await expectMonthlyTotals(page, { month: target, expenses: 'ARS 60.25', calculated: 'ARS 0', projected: '-ARS 60.25' });
  });

  test('TC-053 [R] Cancelar y confirmar el borrado conserva o elimina el gasto correctamente', async ({ page }) => {
    const record = await createExpense(page, { description: 'Gasto a borrar', amount: '45.25', paid: true });
    const before = await projectSnapshot(page);
    await test.step('Cancelar el borrado no modifica ningún registro', async () => {
      await expenseRow(page, 'ARS', record.c).locator('.trashbtn').click();
      await expect(page.locator('#darkModal .darkModalText')).toHaveText('Delete this expense in ARS?');
      await page.locator('#darkCancel').click();
      expect(await projectSnapshot(page)).toEqual(before);
      await expect(expenseRow(page, 'ARS', record.c)).toBeVisible();
      await expectPersistedExpenses(page, [record]);
    });
    await test.step('Confirmar elimina el gasto y deja los totales en cero', async () => {
      await expenseRow(page, 'ARS', record.c).locator('.trashbtn').click();
      await page.locator('#darkOk').click();
      await expect(expenseRows(page)).toHaveCount(0);
      expect((await projectSnapshot(page)).expenses).toEqual([]);
      await expectPersistedExpenses(page, []);
      await expectMonthlyTotals(page, { month: record.f, expenses: 'ARS 0', calculated: 'ARS 0', projected: 'ARS 0' });
    });
  });

  test('TC-054 [R] Recargar conserva gastos y proyecto sin insertar recordatorios predeterminados', async ({ page }, testInfo) => {
    const first = await createExpense(page, { description: 'Persistir pagado', amount: '10.25', note: 'Café & nota', paid: true });
    const second = await createExpense(page, { description: 'Persistir pendiente', amount: '20.50', note: 'Segunda nota' });
    const before = await projectSnapshot(page);
    await expectPersistedExpenses(page, [first, second]);
    await page.reload();
    await expect(page.locator('#kashLanguageDialog')).toHaveCount(0);
    await expect(page.locator('#kashLearning')).toHaveCount(0);
    await openExpenses(page);
    await expect(expenseRows(page)).toHaveCount(2);
    await expect(expenseRow(page, 'ARS', first.c).locator('.expensePaidCell input')).toBeChecked();
    await expect(expenseRow(page, 'ARS', second.c).locator('.expensePaidCell input')).not.toBeChecked();
    await expect(expenseRow(page, 'ARS', first.c).locator('.noteCell')).toHaveText(first.n);
    expect((await projectSnapshot(page)).expenses).toEqual([first, second]);
    await expectPersistedExpenses(page, [first, second]);
    await expectMonthlyTotals(page, { month: first.f, expenses: 'ARS 30.75', calculated: '-ARS 10.25', projected: '-ARS 30.75' });
    await test.step('La recarga debe preservar el proyecto sin agregar datos no ingresados', async () => {
      // QA-EXP-001: migrate() agrega Municipal Alsina, Municipal Belgrano y
      // Patente cuando recConfig estaba vacío. Mantener la expectativa activa.
      const after = await projectSnapshot(page);
      await testInfo.attach('reload-project-diff', {
        body: JSON.stringify({ beforeReminderNames: Object.keys(before.recConfig),
          afterReminderNames: Object.keys(after.recConfig),
          expenseIdsBefore: before.expenses.map(x => x.id), expenseIdsAfter: after.expenses.map(x => x.id),
          nextIdCounterBefore: before.nid, nextIdCounterAfter: after.nid }), contentType: 'application/json',
      });
      // El contador de próximos IDs se normaliza al cargar; no es un ID de gasto.
      // Los IDs existentes y el resto del proyecto sí deben permanecer iguales.
      const { nid: beforeNextId, ...expectedProject } = before;
      const { nid: afterNextId, ...actualProject } = after;
      expect(afterNextId).toBeGreaterThanOrEqual(beforeNextId);
      expect(after.recConfig, 'Recargar no debe insertar recordatorios no ingresados').toEqual(before.recConfig);
      expect(after.recMonthly).toEqual(before.recMonthly);
      expect(actualProject).toEqual(expectedProject);
    });
  });
});
