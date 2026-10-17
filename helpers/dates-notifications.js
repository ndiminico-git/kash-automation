const { test, expect } = require('@playwright/test');
const { settingsPage, projectSnapshot } = require('./language');
const { expectBudgetPersisted } = require('./monthly-budget');

// Fecha deliberadamente fija: las fechas de negocio no dependen del día del runner.
// setFixedTime existe en Playwright 1.45.0 y no detiene timers de UI/autoguardado.
const fixedTime = '2026-10-15T12:00:00-03:00';
const fixedMonth = '2026-10';
const datesSave = page => page.locator('[onclick="saveServiceDates()"]');
const notices = page => page.locator('#serviceNotificationPanel .serviceNotice');
const notice = (page, { service, kind = 'due', date, month = fixedMonth }) =>
  notices(page).filter({ has: page.locator(
    `[onclick="openServiceNotice('${service.id}|${kind}|${month}|${date}')"]`) });

function unrelatedToDates(project) {
  // Fechas y avisos son los únicos metadatos que estos flujos pueden modificar.
  const { serviceDates, serviceNotifications, ...rest } = project;
  return rest;
}

async function openDates(page, service, month = fixedMonth) {
  await settingsPage(page, 'dates', 'calendar');
  if (!service) return;
  if (await page.locator('#sd_search').inputValue()) {
    await page.locator('[onclick="clearServiceDatesSearch()"]').click();
  }
  await page.locator('#sd_service').selectOption(String(service.id));
  await expect(page.locator('#sd_service')).toHaveValue(String(service.id));
  if (await page.locator('#sd_month').inputValue() !== month) {
    await page.locator('#sd_month').fill(month);
    await page.locator('#sd_month').press('Tab');
  }
  await expect(page.locator('#sd_month')).toHaveValue(month);
}

async function fillDateKind(page, kind, values = {}) {
  const { on = true, date, repeat = false, day, offset } = values;
  // Click sobre la etiqueta visible del switch, sin force ni cambiar checked por JS.
  const input = page.locator(`#sd_${kind}_on`);
  if (await input.isChecked() !== on) await input.locator('..').click();
  await expect(input).toBeChecked({ checked: on });
  if (!on) return;
  await page.locator(`#sd_${kind}_repeat`).setChecked(repeat);
  if (repeat) {
    if (offset !== undefined) await page.locator(`#sd_${kind}_offset`).selectOption(String(offset));
    if (day !== undefined) await page.locator(`#sd_${kind}_day`).fill(String(day));
  }
  // Un valor puntual puede ser una excepción a la regla mensual.
  if (date !== undefined) await page.locator(`#sd_${kind}_date`).fill(date);
}

async function configureDates(page, { service, month = fixedMonth, close, due, lead = 2 }) {
  return test.step(`Fechas de ${service.n}, columna ${month}`, async () => {
    await openDates(page, service, month);
    const before = await projectSnapshot(page);
    if (close !== undefined) await fillDateKind(page, 'close', close);
    if (due !== undefined) await fillDateKind(page, 'due', due);
    await page.locator('#sd_lead').selectOption(String(lead));
    await datesSave(page).click();
    await expect(page.locator('#darkModal')).toHaveCount(0);
    const after = await projectSnapshot(page);
    expect(after.serviceDates[String(service.id)]).toBeTruthy();
    expect(unrelatedToDates(after)).toEqual(unrelatedToDates(before));
    await expectBudgetPersisted(page, after);
    await expect(page.locator('#serviceDatesStatus')).toHaveText('✓ Dates applied · project not saved');
    return after;
  });
}

async function openNotices(page) {
  if (!await page.locator('#serviceNotificationPanel').isVisible()) await page.locator('#serviceBell').click();
  await expect(page.locator('#serviceNotificationPanel')).toBeVisible();
  await expect(page.locator('#serviceBell')).toHaveAttribute('aria-expanded', 'true');
}

async function filterNotices(page, filter, count) {
  await openNotices(page);
  const button = page.locator(`[data-notice-filter="${filter}"]`);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(notices(page)).toHaveCount(count);
}

async function expectUnread(page, count) {
  if (count) {
    await expect(page.locator('#serviceUnread')).toBeVisible();
    await expect(page.locator('#serviceUnread')).toHaveText(String(count));
  } else await expect(page.locator('#serviceUnread')).toBeHidden();
}

async function expectDateRejected(page, before, message) {
  await datesSave(page).click();
  await expect(page.locator('#darkModal')).toBeVisible();
  await expect(page.locator('#darkModal .darkModalText')).toHaveText(message);
  expect(await projectSnapshot(page)).toEqual(before);
  await page.locator('#darkOk').click();
  await expect(page.locator('#darkModal')).toHaveCount(0);
  await expectBudgetPersisted(page, before);
}

module.exports = {
  fixedTime, fixedMonth, datesSave, notices, notice, unrelatedToDates,
  openDates, fillDateKind, configureDates, openNotices, filterNotices,
  expectUnread, expectDateRejected,
};
