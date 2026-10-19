const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot, goTo, settingsPage, changeLanguage } = require('../helpers/language');
const { expectBudgetPersisted } = require('../helpers/monthly-budget');
const { createExpense, readSavedProject } = require('../helpers/expenses');
const { setOpeningBalance } = require('../helpers/balances');
const { expectSummaryCard } = require('../helpers/summary');
const { trackerTime, trackerMonth, installmentNames, installmentName, installmentRow, installmentSave,
  ownNote, trackerPeriod, previousTrackerMonth, outsideInstallments, outsideNotes, outsideTracker,
  openTracker, fillInstallment, createInstallment, expectInstallmentProgress, shiftTrackerMonth,
  beginInstallmentEdit, expectInstallmentRejected, addOwnNote, beginNoteEdit } = require('../helpers/installments-notes');

const errorsByPage = new WeakMap();
const test = base.extend({
  trackerApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanTrackerProject: [async ({ page, context, trackerApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    const origin = new URL(app.url).origin;
    await page.clock.setFixedTime(new Date(trackerTime));
    await context.addInitScript(value => {
      if (location.origin === value) localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await base.step('Preparación desde cero: idioma, proyecto vacío y guías automáticas desactivadas desde F1', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
      await createLanguageProject(page);
      const project = await projectSnapshot(page);
      expect(project.inicio).toBe(trackerMonth);
      expect(project.cu).toEqual([]);
      expect(project.rec).toEqual([]);
      expect(project.notes).toEqual([]);
      expect(project.expenses).toEqual([]);
      expect(project.C).toEqual({});
      await expectBudgetPersisted(page, project);
      await openTracker(page);
    });
    page.setDefaultTimeout(5_000);
    await testInfo.attach('tracker-setup-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
      testTimeoutMs: testInfo.timeout, fixedTime: trackerTime, freshProject: true,
    }), contentType: 'application/json' });
    await use();
  }, { auto: true, timeout: 60_000 }],
  twoPlans: [async ({ page, cleanTrackerProject }, use, testInfo) => {
    const started = Date.now();
    const first = await createInstallment(page, { description: 'Café & <b>Notebook</b>', total: 6 });
    const second = await createInstallment(page, { description: 'Seguro QA', total: 3 });
    await testInfo.attach('tracker-plans-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000, testTimeoutMs: testInfo.timeout,
    }), contentType: 'application/json' });
    await use({ first, second });
  }, { timeout: 60_000 }],
  twoNotes: [async ({ page, cleanTrackerProject }, use, testInfo) => {
    const started = Date.now();
    const first = await addOwnNote(page, 'Revisar Café & <b>QA</b>');
    const second = await addOwnNote(page, 'Segunda nota / Save');
    await testInfo.attach('tracker-notes-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000, testTimeoutMs: testInfo.timeout,
    }), contentType: 'application/json' });
    await use({ first, second });
  }, { timeout: 60_000 }],
  financialProject: [async ({ page, cleanTrackerProject }, use, testInfo) => {
    const started = Date.now();
    await setOpeningBalance(page, 'ARS', '1000');
    await createExpense(page, { description: 'Pago QA', amount: '50.25', note: 'Nota literal Save & Gastos', paid: true, month: trackerMonth });
    await createExpense(page, { description: 'Pendiente QA', amount: '20.50', paid: false, month: trackerMonth });
    const data = await projectSnapshot(page);
    await goTo(page, 'res');
    await expectSummaryCard(page, 'ARS', 'ARS 949.75', 'ARS 929.25');
    await testInfo.attach('tracker-financial-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000, testTimeoutMs: testInfo.timeout,
    }), contentType: 'application/json' });
    await use(data);
  }, { timeout: 60_000 }],
});

test.use({ storageState: { cookies: [], origins: [] }, timezoneId: 'America/Argentina/Buenos_Aires' });
test.describe('13 · Cuotas y notas · KA$H v0.690', () => {
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', { body: JSON.stringify(errors), contentType: 'application/json' });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const data = await page.evaluate(() => {
        let persisted = null;
        try { persisted = JSON.parse(localStorage.getItem('kash') || 'null'); } catch {}
        return { url: location.href, project: typeof window.KASHGetProjectJson === 'function'
          ? JSON.parse(window.KASHGetProjectJson()) : null, persisted,
          form: ['cd', 'ct', 'ci', 'rt', 'ownReminderText'].map(id => ({ id, value: document.getElementById(id)?.value })),
          visiblePlans: [...document.querySelectorAll('.cuotaNameCell')].map(el => ({ index: el.dataset.cuotaIndex ?? el.dataset.installmentIndex, text: el.textContent })),
          notes: [...document.querySelectorAll('.ownrem>span:first-child')].map(el => el.textContent),
          modal: document.querySelector('#darkModal')?.innerText };
      }).catch(error => ({ diagnosticError: error.message }));
      await testInfo.attach('tracker-diagnostic', { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
    }
  });

  test('TC-147 [P] Inicio vacío muestra formularios sin cuotas ni notas y no permite retroceder antes del proyecto', async ({ page }) => {
    const before = await projectSnapshot(page);
    await expect(page.locator('#v h2')).toHaveText('Installments & notes');
    await expect(installmentNames(page)).toHaveCount(0);
    await expect(page.locator('.ownrem')).toHaveCount(0);
    await expect(page.locator('#cd')).toHaveValue('');
    await expect(page.locator('#ct')).toHaveValue('');
    await expect(page.locator('#ci')).toHaveValue(trackerMonth);
    await expect(installmentSave(page)).toHaveText('Add installment plan');
    await expect(trackerPeriod(page)).toHaveText('Showing from September / October 2026');
    await previousTrackerMonth(page).click();
    await expect(trackerPeriod(page)).toHaveText('Showing from September / October 2026');
    expect(await projectSnapshot(page)).toEqual(before);
    await expectBudgetPersisted(page, before);
  });

  test('TC-148 [P] Agregar compra con caracteres especiales muestra seis avances sin crear gastos ni pagos', async ({ page }) => {
    const before = await projectSnapshot(page);
    await createInstallment(page, { description: '  Café & <b>Notebook</b> "QA" 💻  ', total: 6 });
    await expect(installmentName(page, 0)).toHaveText('Café & <b>Notebook</b> "QA" 💻');
    await expect(installmentName(page, 0).locator('b, script')).toHaveCount(0);
    await expectInstallmentProgress(page, 0, ['1/6', '2/6', '3/6', '4/6', '5/6', '6/6']);
    await expect(installmentRow(page, 0).locator('td.cuotaFinalFirst')).toHaveCount(0);
    const after = await projectSnapshot(page);
    expect(outsideInstallments(after)).toEqual(outsideInstallments(before));
    expect(after.expenses).toEqual([]);
    expect(after.C).toEqual({});
    expect(after.notes).toEqual([]);
  });

  test('TC-149 [N] Nombre vacío, cantidad vacía o no positiva y mes ausente se rechazan sin insertar planes', async ({ page }) => {
    const before = await projectSnapshot(page);
    const invalid = [
      { description: '   ', total: 3 },
      { description: 'Compra QA', total: '' },
      { description: 'Compra QA', total: '0' },
      { description: 'Compra QA', total: '-2' },
      { description: 'Compra QA', total: '3', start: '' },
    ];
    for (const values of invalid) {
      await test.step('Rechazar ' + JSON.stringify(values), async () => {
        await fillInstallment(page, values);
        await expectInstallmentRejected(page, before);
        await expect(installmentNames(page)).toHaveCount(0);
      });
    }
    await createInstallment(page, { description: 'Compra corregida', total: 3 });
    await expectInstallmentProgress(page, 0, ['1/3', '2/3', '3/3', '·', '·', '·']);
  });

  test('TC-150 [B] Cuota única, redondeo de cantidad y planes futuros respetan fin de plan y diciembre a enero', async ({ page }) => {
    await createInstallment(page, { description: 'Una sola cuota', total: 1 });
    await createInstallment(page, { description: 'Cantidad normalizada', total: '2.5', expectedTotal: 3 });
    await createInstallment(page, { description: 'Compra de diciembre', total: 2, start: '2026-12' });
    const before = await projectSnapshot(page);
    await expectInstallmentProgress(page, 0, ['1/1', '·', '·', '·', '·', '·']);
    await expect(installmentRow(page, 0).locator('td.cuotaFinalFirst')).toHaveText('1/1');
    await expectInstallmentProgress(page, 1, ['1/3', '2/3', '3/3', '·', '·', '·']);
    await expect(installmentName(page, 2)).toHaveCount(0);
    await shiftTrackerMonth(page, 1, 'Showing from October / November 2026');
    await expect(installmentName(page, 0)).toHaveCount(0);
    await expect(installmentName(page, 2)).toHaveCount(0);
    await expectInstallmentProgress(page, 1, ['2/3', '3/3', '·', '·', '·', '·']);
    await shiftTrackerMonth(page, 1, 'Showing from November / December 2026');
    await expect(installmentRow(page, 1).locator('td.cuotaFinalFirst')).toHaveText('3/3');
    await expectInstallmentProgress(page, 2, ['1/2', '2/2', '·', '·', '·', '·']);
    await shiftTrackerMonth(page, 1, 'Showing from December / January 2027');
    await expect(installmentName(page, 1)).toHaveCount(0);
    await expect(installmentRow(page, 2).locator('td.cuotaFinalFirst')).toHaveText('2/2');
    await shiftTrackerMonth(page, 1, 'Showing from January / February 2027');
    await expect(installmentNames(page)).toHaveCount(0);
    expect(await projectSnapshot(page)).toEqual(before);
    await expectBudgetPersisted(page, before);
  });

  test('TC-151 [R] Editar por botón y doble clic reemplaza sólo el plan elegido y Cancelar o Escape descarta borradores', async ({ page, twoPlans: { first, second } }) => {
    const before = await projectSnapshot(page);
    await beginInstallmentEdit(page, first.index);
    await expect(page.locator('#cd')).toHaveValue(first.record.d);
    await expect(page.locator('#ct')).toHaveValue('6');
    await fillInstallment(page, { description: 'Notebook corregida & QA', total: 4, start: '2026-09' });
    await page.locator('#cd').press('Enter');
    await expect(installmentSave(page)).toHaveText('Add installment plan');
    await expect(installmentName(page, first.index)).toBeFocused();
    await expectInstallmentProgress(page, first.index, ['2/4', '3/4', '4/4', '·', '·', '·']);
    const after = await projectSnapshot(page);
    expect(after.cu).toEqual([{ d: 'Notebook corregida & QA', tot: 4, ini: '2026-09' }, second.record]);
    expect(outsideInstallments(after)).toEqual(outsideInstallments(before));
    for (const cancel of ['button', 'Escape']) {
      await beginInstallmentEdit(page, first.index, 'double-click');
      await page.locator('#cd').fill('Borrador que no debe guardarse');
      if (cancel === 'button') await page.locator('[onclick="cancelCuota()"]') .click();
      else await page.locator('#cd').press('Escape');
      await expect(installmentSave(page)).toHaveText('Add installment plan');
      await expect(installmentName(page, first.index)).toBeFocused();
      expect(await projectSnapshot(page)).toEqual(after);
    }
    await expectBudgetPersisted(page, after);
  });

  test('TC-152 [R] Borrar una cuota exige confirmación y renumera acciones sin editar o eliminar el plan vecino', async ({ page, twoPlans: { first, second } }) => {
    const before = await projectSnapshot(page);
    const remove = () => installmentRow(page, first.index).locator(`[onclick="delCuota(${first.index})"]`).click();
    for (const cancel of ['button', 'Escape']) {
      await remove();
      await expect(page.locator('#darkModal .darkModalTitle')).toHaveText('Delete installment plan');
      await expect(page.locator('#darkModal .darkModalText')).toContainText(first.record.d);
      await expect(page.locator('#darkModal .darkModalText b')).toHaveCount(0);
      if (cancel === 'button') await page.locator('#darkCancel').click();
      else await page.keyboard.press('Escape');
      expect(await projectSnapshot(page)).toEqual(before);
    }
    await remove();
    await page.locator('#darkOk').click();
    await expect(page.locator('#darkModal')).toHaveCount(0);
    await expect(installmentNames(page)).toHaveText([second.record.d]);
    expect((await projectSnapshot(page)).cu).toEqual([second.record]);
    await beginInstallmentEdit(page, 0);
    await page.locator('#cd').fill('Seguro restante corregido');
    await installmentSave(page).click();
    const after = await projectSnapshot(page);
    expect(after.cu).toEqual([{ ...second.record, d: 'Seguro restante corregido' }]);
    expect(outsideInstallments(after)).toEqual(outsideInstallments(before));
    await expectBudgetPersisted(page, after);
  });

  test('TC-153 [R] Flechas, Enter, F2 y Escape operan sólo sobre filas visibles aunque sus índices no sean consecutivos', async ({ page }) => {
    await createInstallment(page, { description: 'Finalizada en septiembre', total: 1, start: '2026-09' });
    await createInstallment(page, { description: 'Visible A', total: 6 });
    await createInstallment(page, { description: 'Futura en noviembre', total: 3, start: '2026-11' });
    await createInstallment(page, { description: 'Visible B', total: 2 });
    const before = await projectSnapshot(page);
    expect(await installmentNames(page).evaluateAll(nodes => nodes.map(el => el.dataset.cuotaIndex ?? el.dataset.installmentIndex))).toEqual(['1', '3']);
    await installmentName(page, 1).click();
    for (const [key, index] of [['ArrowDown', 3], ['ArrowDown', 3], ['ArrowUp', 1], ['ArrowUp', 1]]) {
      await page.keyboard.press(key);
      await expect(installmentName(page, index)).toBeFocused();
      await expect(installmentName(page, index)).toHaveClass(/cuotaActive/);
    }
    expect(await projectSnapshot(page)).toEqual(before);
    await beginInstallmentEdit(page, 3, 'Enter');
    await page.locator('#cd').fill('Visible B editada con teclado');
    await page.locator('#ct').press('Enter');
    await expect(installmentName(page, 3)).toBeFocused();
    const after = await projectSnapshot(page);
    expect(after.cu).toEqual([before.cu[0], before.cu[1], before.cu[2], { ...before.cu[3], d: 'Visible B editada con teclado' }]);
    await beginInstallmentEdit(page, 3, 'F2');
    await page.locator('#cd').fill('Cambio cancelado con teclado');
    await page.locator('#cd').press('Escape');
    await expect(installmentName(page, 3)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.cuotaNameCell.cuotaActive')).toHaveCount(0);
    expect(await projectSnapshot(page)).toEqual(after);
    expect(outsideInstallments(after)).toEqual(outsideInstallments(before));
    await expectBudgetPersisted(page, after);
  });

  test('TC-154 [P] Notas por botón y Enter conservan texto literal; vacío se rechaza y borrar respeta la nota vecina', async ({ page }) => {
    const initial = await projectSnapshot(page);
    for (const text of ['', '   ']) {
      await page.locator('#rt').fill(text);
      await page.locator('[onclick="addOwnReminder()"]') .click();
      await expect(page.locator('#darkModal .darkModalText')).toHaveText('Enter some reminder text.');
      await page.locator('#darkOk').click();
      expect(await projectSnapshot(page)).toEqual(initial);
    }
    await addOwnNote(page, '  Café & <b>Recordatorio</b> "QA" 📝  ');
    await addOwnNote(page, 'Revisar seguro / Save / Gastos', 'Enter');
    await expect(page.locator('.ownrem')).toHaveCount(2);
    await expect(ownNote(page, 0).locator('b, script')).toHaveCount(0);
    const after = await projectSnapshot(page);
    expect(after.rec).toEqual([{ t: 'Café & <b>Recordatorio</b> "QA" 📝' }, { t: 'Revisar seguro / Save / Gastos' }]);
    expect(outsideNotes(after)).toEqual(outsideNotes(initial));
    expect(after.recConfig).toEqual({});
    expect(after.recMonthly).toEqual({});
    expect(after.notes).toEqual([]);
    await ownNote(page, 0).locator('.trashbtn').click();
    await expect(page.locator('#darkModal')).toHaveCount(0);
    await expect(page.locator('.ownrem')).toHaveCount(1);
    await expect(ownNote(page, 0).locator('> span').first()).toHaveText('Revisar seguro / Save / Gastos');
    await beginNoteEdit(page, 0);
    await expect(page.locator('#ownReminderText')).toHaveValue('Revisar seguro / Save / Gastos');
    await page.locator('#darkCancel').click();
    const remaining = await projectSnapshot(page);
    expect(remaining.rec).toEqual([{ t: 'Revisar seguro / Save / Gastos' }]);
    expect(outsideNotes(remaining)).toEqual(outsideNotes(initial));
    await expectBudgetPersisted(page, remaining);
  });

  test('TC-155 [N] Editar nota vacía conserva el texto y permite continuar con Enter sin reabrir validaciones anteriores', async ({ page, twoNotes: { first, second } }) => {
    const before = await projectSnapshot(page);
    await beginNoteEdit(page, first);
    await page.locator('#ownReminderText').fill('Borrador cancelado');
    await page.locator('#darkCancel').click();
    expect(await projectSnapshot(page)).toEqual(before);
    await beginNoteEdit(page, first);
    await page.locator('#ownReminderText').fill('Texto editado & <b>Guardar</b>');
    await page.locator('#ownReminderText').press('Enter');
    await expect(page.locator('#darkModal')).toHaveCount(0);
    const edited = await projectSnapshot(page);
    expect(edited.rec).toEqual([{ t: 'Texto editado & <b>Guardar</b>' }, before.rec[second]]);
    expect(outsideNotes(edited)).toEqual(outsideNotes(before));
    await beginNoteEdit(page, second);
    await page.locator('#ownReminderText').fill('   ');
    await page.locator('#ownReminderSave').click();
    await expect(page.locator('#darkModal .darkModalText')).toHaveText('Enter some reminder text.');
    expect(await projectSnapshot(page)).toEqual(edited);
    await page.locator('#darkOk').click();
    await expect(page.locator('#darkModal')).toHaveCount(0);
    // QA-NOTE-001: recuperación después del error, sin recargar para ocultar el listener obsoleto.
    await addOwnNote(page, 'Nota nueva después de corregir', 'Enter');
    const after = await projectSnapshot(page);
    expect(after.rec).toEqual([...edited.rec, { t: 'Nota nueva después de corregir' }]);
    expect(outsideNotes(after)).toEqual(outsideNotes(before));
    await expectBudgetPersisted(page, after);
  });

  test('TC-156 [R] Ocultar y restaurar sección, cambiar idioma y recargar conserva cuotas, notas, gastos y saldos', async ({ page, financialProject: financial }) => {
    await createInstallment(page, { description: 'Notebook / Save & Café', total: 6 });
    await createInstallment(page, { description: 'Compra futura', total: 3, start: '2026-11' });
    await addOwnNote(page, 'Texto personal: Gastos & <b>USD</b>');
    await addOwnNote(page, 'Recordatorio secundario', 'Enter');
    await beginNoteEdit(page, 1);
    await page.locator('#ownReminderText').fill('Borrador descartado');
    await page.keyboard.press('Escape');
    const populated = await projectSnapshot(page);
    expect(outsideTracker(populated)).toEqual(outsideTracker(financial));
    await settingsPage(page, 'features', 'modules');
    await page.locator('[data-display-choice="quotas"]').locator('..').click();
    await expect(page.locator('[data-display-choice="quotas"]')).not.toBeChecked();
    await expect(page.locator('#nav').getByRole('button', { name: 'Installments & notes', exact: true })).toHaveCount(0);
    await page.locator('[data-display-choice="quotas"]').locator('..').click();
    await expect(page.locator('[data-display-choice="quotas"]')).toBeChecked();
    const restored = await projectSnapshot(page);
    const { displayOptions: oldOptions, ...oldData } = populated;
    const { displayOptions: newOptions, ...newData } = restored;
    expect(newData).toEqual(oldData);
    expect(newOptions.quotas).toBe(true);
    await expectBudgetPersisted(page, restored);
    await changeLanguage(page, 'es');
    await openTracker(page);
    await expect(page.locator('#cd')).toHaveAttribute('placeholder', 'Qué compraste');
    await expect(installmentName(page, 0)).toHaveText('Notebook / Save & Café');
    await expect(installmentNames(page)).toHaveCount(1); // la futura no comienza todavía, pero sigue guardada.
    await expect(page.locator('.ownrem')).toHaveCount(2);
    const beforeReload = await projectSnapshot(page);
    expect(beforeReload).toEqual(restored);
    // Sólo este resumen automático de gastos se regenera con el separador decimal del idioma.
    // Las notas manuales de gastos y recordatorios se comparan sin normalizarlas.
    const keys = Object.keys(financial.C);
    expect(keys).toHaveLength(1);
    const expenseKey = keys[0], englishDetail = 'Pago QA: ARS 50.25\nPendiente QA: ARS 20.5';
    const spanishDetail = 'Pago QA: ARS 50,25\nPendiente QA: ARS 20,5';
    expect(beforeReload.C[expenseKey].n).toBe(englishDetail);
    await page.reload();
    await expect(page.locator('#kashLanguageDialog, #kashLearning')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await openTracker(page);
    await expect(installmentName(page, 0)).toHaveText('Notebook / Save & Café');
    await expect(ownNote(page, 0).locator('> span').first()).toHaveText('Texto personal: Gastos & <b>USD</b>');
    await expect(page.locator('.ownrem')).toHaveCount(2);
    const after = await projectSnapshot(page), { nid: oldCounter, ...expected } = beforeReload, { nid, ...actual } = after;
    expected.C = { ...expected.C, [expenseKey]: { ...expected.C[expenseKey], n: spanishDetail } };
    expect(nid).toBeGreaterThanOrEqual(oldCounter);
    expect(actual).toEqual(expected);
    expect(after.expenses).toEqual(financial.expenses);
    expect(after.C).toEqual(expected.C);
    await expect.poll(async () => {
      const stored = await readSavedProject(page);
      if (!stored) return null;
      const { nid: storedCounter, ...data } = stored;
      const detail = data.C?.[expenseKey]?.n;
      if (![englishDetail, spanishDetail].includes(detail)) return { unexpectedAutomaticDetail: detail };
      return { ...data, C: { ...data.C, [expenseKey]: { ...data.C[expenseKey], n: spanishDetail } } };
    }).toEqual(actual);
    const stored = await readSavedProject(page);
    expect(stored.nid).toBeGreaterThanOrEqual(oldCounter);
    expect(stored.nid).toBeLessThanOrEqual(nid);
    await goTo(page, 'res');
    await expectSummaryCard(page, 'ARS', 'ARS 949,75', 'ARS 929,25');
  });
});
