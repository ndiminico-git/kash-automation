const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot, goTo, settingsPage, changeLanguage } = require('../helpers/language');
const { createMonthlyGroup, createMonthlyService, createBudgetService, writeBudgetAmount,
  toggleBudgetPaid, budgetCell, expectBudgetPersisted, selectBudgetYear } = require('../helpers/monthly-budget');
const { reloadBalanceProject } = require('../helpers/balances');
const { addCurrency } = require('../helpers/currencies');
const { readSavedProject } = require('../helpers/expenses');
const { fixedTime, fixedMonth, datesSave, notices, notice, unrelatedToDates, openDates,
  fillDateKind, configureDates, openNotices, filterNotices, expectUnread, expectDateRejected } =
  require('../helpers/dates-notifications');

const errorsByPage = new WeakMap();
const test = base.extend({
  datesApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanDatesProject: [async ({ page, context, datesApp: app }, use, testInfo) => {
    const started = Date.now(), errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    const origin = new URL(app.url).origin;
    await page.clock.setFixedTime(new Date(fixedTime));
    await context.addInitScript(value => {
      if (location.origin === value) localStorage.setItem('kash_services_online', '0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await base.step('Preparación limpia: idioma inglés y proyecto vacío por su wizard', async () => {
      await page.goto(app.url);
      expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
      await createLanguageProject(page);
      const project = await projectSnapshot(page);
      expect(project.inicio).toBe(fixedMonth);
      expect(project.C).toEqual({});
      expect(project.expenses).toEqual([]);
      expect(project.serviceDates).toEqual({});
      expect(project.serviceNotifications).toEqual([]);
      expect(project.recConfig).toEqual({});
      await settingsPage(page, 'features', 'summary');
      const enabled = page.locator('[data-display-choice="reminders"]');
      await expect(enabled).not.toBeChecked();
      await enabled.locator('..').click();
      await expect(enabled).toBeChecked();
      const after = await projectSnapshot(page);
      const { displayOptions: beforeOptions, ...beforeData } = project;
      const { displayOptions: afterOptions, ...afterData } = after;
      expect(afterData).toEqual(beforeData);
      expect(afterOptions.reminders).toBe(true);
      await expectBudgetPersisted(page, after);
      await expect(page.locator('#serviceBell')).toBeVisible();
    });
    page.setDefaultTimeout(5_000);
    await testInfo.attach('dates-setup-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000,
      testTimeoutMs: testInfo.timeout, fixedTime, freshProject: true,
    }), contentType: 'application/json' });
    await use();
  }, { auto: true, timeout: 60_000 }],
  datedService: [async ({ page, cleanDatesProject }, use, testInfo) => {
    const started = Date.now();
    const service = await createBudgetService(page, 'Tarjeta Café & <b>QA</b>');
    await testInfo.attach('dates-service-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000, testTimeoutMs: testInfo.timeout,
    }), contentType: 'application/json' });
    await use(service);
  }, { timeout: 60_000 }],
  secondService: [async ({ page, datedService }, use, testInfo) => {
    const started = Date.now();
    const group = (await projectSnapshot(page)).groups.find(g => g.id === datedService.g);
    const service = await createMonthlyService(page, { name: 'Expensas Belgrano', group });
    await testInfo.attach('dates-second-service-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000, testTimeoutMs: testInfo.timeout,
    }), contentType: 'application/json' });
    await use(service);
  }, { timeout: 60_000 }],
  usdService: [async ({ page, datedService }, use, testInfo) => {
    const started = Date.now();
    await addCurrency(page, 'USD');
    const group = (await projectSnapshot(page)).groups.find(g => g.id === datedService.g);
    const service = await createMonthlyService(page, { name: 'Servicio USD / Save', group, currency: 'USD' });
    await testInfo.attach('dates-usd-service-timing', { body: JSON.stringify({
      setupDurationMs: Date.now() - started, setupTimeoutMs: 60_000, testTimeoutMs: testInfo.timeout,
    }), contentType: 'application/json' });
    await use(service);
  }, { timeout: 60_000 }],
});

test.use({ storageState: { cookies: [], origins: [] }, timezoneId: 'America/Argentina/Buenos_Aires' });
test.describe('12 · Cierres, vencimientos y avisos · KA$H v0.677', () => {
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, testInfo) => {
    const errors = errorsByPage.get(page) || [];
    if (errors.length) await testInfo.attach('javascript-errors', { body: JSON.stringify(errors), contentType: 'application/json' });
    expect.soft(errors, 'Sin errores JavaScript').toEqual([]);
    // La preparación puede fallar antes de navegar: no tapar ese error con localStorage en about:blank.
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const data = await page.evaluate(() => {
        let persisted = null;
        try { persisted = JSON.parse(localStorage.getItem('kash') || 'null'); } catch {}
        return { url: location.href, project: typeof window.KASHGetProjectJson === 'function'
          ? JSON.parse(window.KASHGetProjectJson()) : null, persisted,
          form: [...document.querySelectorAll('[id^="sd_"]')].map(el => ({ id: el.id, value: el.value, checked: el.checked, disabled: el.disabled })),
          status: document.querySelector('#serviceDatesStatus')?.textContent,
          notifications: document.querySelector('#serviceNotificationPanel')?.innerText,
          validation: document.querySelector('#darkModal')?.innerText };
      }).catch(error => ({ diagnosticError: error.message }));
      await testInfo.attach('dates-diagnostic', { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
    }
  });

  test('TC-135 [P] Proyecto vacío no inventa fechas ni avisos y la campana vacía se cierra con X y Escape', async ({ page }) => {
    const before = await projectSnapshot(page);
    await openDates(page);
    await expect(page.locator('#sd_service')).toHaveCount(0);
    await expect(page.locator('.serviceDatesCard')).toContainText('No enabled expense items');
    await expectUnread(page, 0);
    await openNotices(page);
    await expect(notices(page)).toHaveCount(0);
    await expect(page.locator('.serviceNoticeEmpty')).toHaveText('No notifications.');
    await page.locator('#serviceNotificationPanel .closex').click();
    await expect(page.locator('#serviceBell')).toBeFocused();
    await openNotices(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#serviceNotificationPanel')).toHaveCount(0);
    await expect(page.locator('#serviceBell')).toHaveAttribute('aria-expanded', 'false');
    expect(await projectSnapshot(page)).toEqual(before);
    await expectBudgetPersisted(page, before);
  });

  test('TC-136 [P] Guardar cierre y vencimiento puntuales conserva mes, nombre literal y datos financieros', async ({ page, datedService: service }) => {
    const before = await projectSnapshot(page);
    await openDates(page, service);
    for (const kind of ['close', 'due']) {
      await expect(page.locator(`#sd_${kind}_on`)).not.toBeChecked();
      await expect(page.locator(`#sd_${kind}_date`)).toBeDisabled();
    }
    const after = await configureDates(page, { service, close: { date: '2026-10-14' }, due: { date: '2026-10-20' }, lead: 7 });
    expect(after.serviceDates[service.id]).toMatchObject({
      rules: [{ from: fixedMonth, lead: 7, close: { on: true, repeat: false }, due: { on: true, repeat: false } }],
      months: { '2026-10': { close: '2026-10-14', due: '2026-10-20' } },
    });
    expect(unrelatedToDates(after)).toEqual(unrelatedToDates(before));
    const tag = page.locator('.serviceDatesConfigured button');
    await expect(tag).toHaveCount(1);
    await expect(tag).toContainText(service.n);
    await expect(tag.locator('b')).toHaveCount(0);
    await expect(tag).toContainText('14/10/2026');
    await expect(tag).toContainText('20/10/2026');
    await goTo(page, 'res');
    await openDates(page, service);
    await expect(page.locator('#sd_close_date')).toHaveValue('2026-10-14');
    await expect(page.locator('#sd_due_date')).toHaveValue('2026-10-20');
    expect(await projectSnapshot(page)).toEqual(after);
  });

  test('TC-137 [N] Fecha obligatoria y días 0 o 32 se rechazan sin guardar parcialmente la configuración', async ({ page, datedService: service }) => {
    await openDates(page, service);
    const before = await projectSnapshot(page);
    await fillDateKind(page, 'close', { date: '2026-10-14' });
    await fillDateKind(page, 'due', { date: '' });
    await expectDateRejected(page, before, /valid.*due|due.*valid/i);
    await fillDateKind(page, 'due', { date: '2026-10-20', repeat: true, day: 20, offset: 0 });
    for (const invalid of ['0', '32']) {
      await page.locator('#sd_due_day').fill(invalid);
      await expectDateRejected(page, before, /between 1 and 31/i);
    }
    await page.locator('#sd_due_day').fill('20');
    await datesSave(page).click();
    const after = await projectSnapshot(page);
    expect(after.serviceDates[service.id].rules[0].due.day).toBe(20);
    expect(unrelatedToDates(after)).toEqual(unrelatedToDates(before));
    await expectBudgetPersisted(page, after);
  });

  test('TC-138 [B] Repetir el día 31 usa fin de mes en febrero, año bisiesto y abril sin perder la regla original', async ({ page, datedService: service }) => {
    await configureDates(page, { service, due: { date: '2026-10-31', repeat: true, day: 31, offset: 0 } });
    const before = await projectSnapshot(page);
    for (const [month, date] of [['2027-02', '2027-02-28'], ['2028-02', '2028-02-29'], ['2027-04', '2027-04-30'], ['2027-05', '2027-05-31']]) {
      await openDates(page, service, month);
      await expect(page.locator('#sd_due_date')).toHaveValue(date);
      await expect(page.locator('#sd_due_day')).toHaveValue('31');
      await expect(page.locator('#sd_due_repeat')).toBeChecked();
    }
    expect(await projectSnapshot(page)).toEqual(before);
    await expectBudgetPersisted(page, before);
  });

  test('TC-139 [B] Cierre del mes anterior y vencimiento del siguiente cruzan diciembre sin mover la columna financiera', async ({ page, datedService: service }) => {
    const after = await configureDates(page, { service, month: '2026-12',
      close: { repeat: true, day: 28, offset: -1, date: '2026-11-28' },
      due: { repeat: true, day: 10, offset: 1, date: '2027-01-10' }, lead: 5 });
    expect(after.serviceDates[service.id].rules[0]).toMatchObject({
      from: '2026-12', close: { day: 28, offset: -1 }, due: { day: 10, offset: 1 },
    });
    expect(after.serviceDates[service.id].months['2026-12']).toEqual({ close: '2026-11-28', due: '2027-01-10' });
    await openDates(page, service, '2027-01');
    await expect(page.locator('#sd_close_date')).toHaveValue('2026-12-28');
    await expect(page.locator('#sd_due_date')).toHaveValue('2027-02-10');
    await expect(page.locator('#sd_month')).toHaveValue('2027-01');
    expect(await projectSnapshot(page)).toEqual(after);
  });

  test('TC-140 [R] Buscar sin acentos y alternar tags carga el servicio correcto y conserva borradores sin guardar por un clic', async ({ page, datedService: first, secondService: second }) => {
    await configureDates(page, { service: first, due: { date: '2026-10-20' } });
    await configureDates(page, { service: second, due: { date: '2026-10-22' } });
    const before = await projectSnapshot(page);
    await openDates(page, first);
    await page.locator('#sd_search').fill('cafe');
    await expect(page.locator('#sd_service option')).toHaveCount(1);
    await expect(page.locator('#sd_service')).toHaveValue(String(first.id));
    await page.locator('#sd_search').fill('zz_no_existe_qa');
    await expect(page.locator('#sd_service')).toBeDisabled();
    await expect(page.locator('.serviceDatesFields')).toBeHidden();
    await page.locator('[onclick="clearServiceDatesSearch()"]').click();
    await expect(page.locator('#sd_service')).toBeEnabled();
    await page.locator('.serviceDatesConfigured button').filter({ hasText: first.n }).click();
    await page.locator('#sd_due_date').fill('2026-10-21');
    await expect(page.locator('#serviceDatesStatus')).toHaveText('● Unsaved changes');
    await page.locator('.serviceDatesConfigured button').filter({ hasText: second.n }).click();
    await expect(page.locator('#sd_service')).toHaveValue(String(second.id));
    await expect(page.locator('#sd_due_date')).toHaveValue('2026-10-22');
    await expect(page.locator('#serviceDatesStatus')).toHaveText('✓ Dates applied · project not saved');
    await page.locator('.serviceDatesConfigured button').filter({ hasText: first.n }).click();
    await expect(page.locator('#sd_due_date')).toHaveValue('2026-10-21');
    await expect(page.locator('#serviceDatesStatus')).toHaveText('● Unsaved changes');
    expect(await projectSnapshot(page)).toEqual(before);
    await expectBudgetPersisted(page, before);
  });

  test('TC-141 [B] Avisos respetan anticipación, límite de siete días vencidos y no se duplican al consultar', async ({ page, datedService: first, secondService: second }) => {
    await configureDates(page, { service: first, due: { date: '2026-10-18' }, lead: 2 });
    await configureDates(page, { service: second, close: { date: '2026-10-07' }, due: { date: '2026-10-08' }, lead: 0 });
    let project = await projectSnapshot(page);
    expect(project.serviceNotifications).toHaveLength(1);
    expect(project.serviceNotifications[0]).toMatchObject({ serviceId: second.id, kind: 'due', date: '2026-10-08', month: fixedMonth });
    await expectUnread(page, 1);
    // Avanza sólo Date; abrir la campana ejecuta la sincronización real de la app.
    await page.clock.setFixedTime(new Date('2026-10-16T12:00:00-03:00'));
    await openNotices(page);
    await expectUnread(page, 2);
    await expect(notices(page)).toHaveCount(2);
    project = await projectSnapshot(page);
    expect(project.serviceNotifications.filter(n => n.serviceId === first.id)).toHaveLength(1);
    expect(project.serviceNotifications.some(n => n.date === '2026-10-07')).toBe(false);
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Escape');
      await openNotices(page);
    }
    expect(await projectSnapshot(page)).toEqual(project);
    await expectBudgetPersisted(page, project);
  });

  test('TC-142 [R] Filtros leído y sin leer, leer todos y borrar conservan avisos sin recrear el eliminado', async ({ page, datedService: service }) => {
    await configureDates(page, { service, close: { date: '2026-10-15' }, due: { date: '2026-10-16' } });
    const before = await projectSnapshot(page);
    await expectUnread(page, 2);
    await filterNotices(page, 'close', 1);
    await filterNotices(page, 'due', 1);
    await filterNotices(page, 'all', 2);
    await notice(page, { service, kind: 'close', date: '2026-10-15' }).locator('[onclick^="setServiceNoticeRead"]').click();
    await expectUnread(page, 1);
    await filterNotices(page, 'unread', 1);
    await expect(notices(page).locator('.serviceNoticeTitle strong')).toContainText('Due');
    await filterNotices(page, 'all', 2);
    await notice(page, { service, kind: 'close', date: '2026-10-15' }).locator('[onclick^="setServiceNoticeRead"]').click();
    await expectUnread(page, 2);
    await page.locator('[onclick="readAllServiceNotices()"]') .click();
    await expectUnread(page, 0);
    await filterNotices(page, 'unread', 0);
    await filterNotices(page, 'all', 2);
    await notice(page, { service, kind: 'close', date: '2026-10-15' }).locator('.serviceNoticeDelete').click();
    await expect(notices(page)).toHaveCount(1);
    const after = await projectSnapshot(page);
    expect(unrelatedToDates(after)).toEqual(unrelatedToDates(before));
    expect(after.serviceDates).toEqual(before.serviceDates);
    expect(after.serviceNotifications).toHaveLength(2);
    expect(after.serviceNotifications.find(n => n.kind === 'close')).toMatchObject({ read: true, deleted: true });
    await expectBudgetPersisted(page, after);
    await reloadBalanceProject(page, after);
    await openNotices(page);
    await expect(notices(page)).toHaveCount(1);
    await expectUnread(page, 0);
  });

  test('TC-143 [R] Leer no paga y Ver en planilla abre la columna asociada aunque el vencimiento sea de otro mes', async ({ page, datedService: service }) => {
    await writeBudgetAmount(page, service, '2026-11', '125.50');
    await configureDates(page, { service, month: '2026-11', due: { date: '2026-10-15' }, lead: 0 });
    const before = await projectSnapshot(page);
    expect(before.C[service.id + '|2026-11']).toMatchObject({ a: 125.5 });
    await openNotices(page);
    const row = notice(page, { service, date: '2026-10-15', month: '2026-11' });
    await expect(row.locator('.serviceNoticePeriod')).toContainText('November 2026');
    await expect(row.locator('.serviceNoticePayment')).toContainText('Pending');
    await row.locator('[onclick^="setServiceNoticeRead"]').click();
    await expectUnread(page, 0);
    expect((await projectSnapshot(page)).C).toEqual(before.C);
    await row.locator('.serviceNoticeOpen').click();
    await expect(page.locator('#serviceNotificationPanel')).toHaveCount(0);
    await expect(budgetCell(page, service, '2026-11')).toHaveClass(/serviceNoticeTarget/);
    await expect(budgetCell(page, service, '2026-11')).toHaveClass(/sel|sc/);
    await toggleBudgetPaid(page, service, '2026-11');
    await openNotices(page);
    await expect(row.locator('.serviceNoticePayment')).toContainText('Paid');
    const after = await projectSnapshot(page);
    expect(after.C[service.id + '|2026-11']).toMatchObject({ a: 125.5, p: true });
    expect(after.serviceDates).toEqual(before.serviceDates);
    expect(after.serviceNotifications).toHaveLength(1);
    await expectBudgetPersisted(page, after);
  });

  test('TC-144 [R] Modificar o desactivar una fecha cancela el aviso anterior y reactivarla conserva su identidad y lectura', async ({ page, datedService: service }) => {
    await configureDates(page, { service, due: { date: '2026-10-15' } });
    await openNotices(page);
    await notice(page, { service, date: '2026-10-15' }).locator('[onclick^="setServiceNoticeRead"]').click();
    const before = await projectSnapshot(page), original = before.serviceNotifications[0];
    await page.keyboard.press('Escape');
    await configureDates(page, { service, due: { date: '2026-10-16' } });
    let after = await projectSnapshot(page);
    expect(after.serviceNotifications).toHaveLength(2);
    expect(after.serviceNotifications.find(n => n.id === original.id)).toMatchObject({ read: true, status: 'cancelled' });
    await expectUnread(page, 1);
    await openNotices(page);
    await expect(notice(page, { service, date: '2026-10-15' })).toHaveClass(/cancelled/);
    await page.keyboard.press('Escape');
    await configureDates(page, { service, due: { on: false } });
    await expect(page.locator('#sd_due_date')).toBeDisabled();
    after = await projectSnapshot(page);
    expect(after.serviceNotifications.every(n => n.status === 'cancelled')).toBe(true);
    await expectUnread(page, 0);
    await configureDates(page, { service, due: { date: '2026-10-15' } });
    after = await projectSnapshot(page);
    expect(after.serviceNotifications).toHaveLength(2);
    expect(after.serviceNotifications.find(n => n.id === original.id)).toMatchObject({ read: true, status: 'active', deleted: false });
    expect(unrelatedToDates(after)).toEqual(unrelatedToDates(before));
    await expectUnread(page, 0);
  });

  test('TC-145 [R] Popover de fechas admite hover, foco y fijación por clic con diseño propio y cierre sin escrituras', async ({ page, datedService: service }) => {
    await configureDates(page, { service, close: { date: '2026-10-14' }, due: { date: '2026-10-20' }, lead: 7 });
    const before = await projectSnapshot(page);
    await selectBudgetYear(page, 2026);
    await budgetCell(page, service, fixedMonth).click();
    const icon = page.locator(`[data-service-dates="${service.id}"]`), popup = page.locator('#serviceDatesHover');
    await icon.hover();
    await expect(popup).toBeVisible();
    await expect(popup).toHaveAttribute('role', 'dialog');
    await expect(popup.locator('h3')).toHaveText(service.n + ' · ARS');
    await expect(popup.locator('h3 b')).toHaveCount(0);
    await expect(popup).toContainText('14/10/2026');
    await expect(popup).toContainText('20/10/2026');
    expect(await popup.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgb(255, 255, 255)');
    await popup.locator('.serviceHoverClose').hover();
    await expect(popup).toBeVisible();
    await popup.locator('.serviceHoverClose').click();
    await expect(popup).toHaveCount(0);
    await icon.focus();
    await expect(popup).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await icon.click();
    await page.locator('.yearNavLabel').hover();
    await expect(popup).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    expect(await projectSnapshot(page)).toEqual(before);
    await expectBudgetPersisted(page, before);
  });

  test('TC-146 [R] Recargar conserva fechas ARS y USD, avisos y pagos; cambiar idioma no traduce nombres del usuario', async ({ page, datedService: ars, usdService: usd }) => {
    await writeBudgetAmount(page, ars, fixedMonth, '100');
    await writeBudgetAmount(page, usd, fixedMonth, '20.25');
    await toggleBudgetPaid(page, usd, fixedMonth);
    await configureDates(page, { service: ars, due: { date: '2026-10-15', repeat: true, day: 15, offset: 0 } });
    await configureDates(page, { service: usd, close: { date: '2026-10-14' }, due: { date: '2026-10-16' }, lead: 3 });
    await openNotices(page);
    await expect(notices(page)).toHaveCount(3);
    await expect(notice(page, { service: usd, date: '2026-10-16' }).locator('.serviceNoticePayment')).toContainText('Paid');
    await notice(page, { service: ars, date: '2026-10-15' }).locator('[onclick^="setServiceNoticeRead"]').click();
    await notice(page, { service: usd, kind: 'close', date: '2026-10-14' }).locator('.serviceNoticeDelete').click();
    await page.keyboard.press('Escape');
    const before = await projectSnapshot(page);
    await expectBudgetPersisted(page, before);
    await reloadBalanceProject(page, before);
    await openDates(page, usd);
    await expect(page.locator('#sd_due_date')).toHaveValue('2026-10-16');
    await expect(page.locator('#sd_lead')).toHaveValue('3');
    await changeLanguage(page, 'es');
    await openDates(page, ars);
    await expect(page.locator('#sd_due_repeat')).toBeChecked();
    await expect(page.locator('#sd_due_date')).toHaveValue('2026-10-15');
    await openNotices(page);
    await expect(notices(page)).toHaveCount(2);
    await expect(notice(page, { service: ars, date: '2026-10-15' }).locator('.serviceNoticeTitle strong')).toContainText(ars.n);
    await expect(notice(page, { service: usd, date: '2026-10-16' }).locator('.serviceNoticeTitle strong')).toContainText(usd.n);
    await expectUnread(page, 1);
    const after = await projectSnapshot(page), { nid: oldCounter, ...expected } = before, { nid, ...actual } = after;
    expect(nid).toBeGreaterThanOrEqual(oldCounter);
    expect(actual).toEqual(expected);
    expect(after.recConfig).toEqual({});
    expect(after.recMonthly).toEqual({});
    // Al cargar, migrate normaliza nid en memoria sin reescribirlo si sólo consultamos.
    // Ya comprobamos la identidad de todos los datos: la persistencia permite sólo ese contador.
    await expect.poll(async () => {
      const stored = await readSavedProject(page);
      if (!stored) return null;
      const { nid: storedCounter, ...data } = stored;
      return data;
    }).toEqual(actual);
    const stored = await readSavedProject(page);
    expect(stored.nid).toBeGreaterThanOrEqual(oldCounter);
    expect(stored.nid).toBeLessThanOrEqual(nid);
  });
});
