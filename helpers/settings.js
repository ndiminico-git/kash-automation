const { expect } = require('@playwright/test');
const { settingsPage, projectSnapshot } = require('./language');
const { expectBudgetPersisted } = require('./monthly-budget');

const settingsTime = '2026-10-15T12:00:00-03:00';
const settingsMonth = '2026-10';
const visibleChoice = (page, key) => page.locator(`[data-display-choice="${key}"]`);
const trendPanel = page => page.locator('.summarySidePanel').filter({
  has: page.locator('.mockPanelHeading b', { hasText: /^(Projected balance trend|Evolución del Remanente)$/ }),
});
const requiredSettingsTabs = {
  money: ['currencies', 'balances', 'adjustments'],
  services: ['list', 'groups'],
  dates: ['calendar', 'reminders'],
  features: ['modules', 'summary', 'internet'],
  appearance: ['language', 'theme'],
  help: ['guides', 'manual'],
};

function outsideVisibility(project) { const { displayOptions, ...rest } = project; return rest; }
function outsideVisibilityAndCounter(project) { const { displayOptions, nid, ...rest } = project; return rest; }

async function expectOnlyVisibilityChanged(page, before, { allowCounter = false } = {}) {
  const after = await projectSnapshot(page);
  if (allowCounter) {
    expect(outsideVisibilityAndCounter(after)).toEqual(outsideVisibilityAndCounter(before));
    expect(after.nid).toBeGreaterThanOrEqual(before.nid);
  } else expect(outsideVisibility(after)).toEqual(outsideVisibility(before));
  await expectBudgetPersisted(page, after);
  return after;
}

async function setVisibleChoice(page, key, on) {
  const tab = key === 'quotas' ? 'modules' : 'summary';
  await settingsPage(page, 'features', tab);
  const before = await projectSnapshot(page), input = visibleChoice(page, key);
  await expect(input).toBeEnabled();
  if (await input.isChecked() !== on) await input.locator('..').click();
  await expect(input).toBeChecked({ checked: on });
  const after = await expectOnlyVisibilityChanged(page, before);
  // Una preferencia omitida equivale a su valor predeterminado, pero un cambio real queda persistido.
  if (Object.prototype.hasOwnProperty.call(after.displayOptions, key)) expect(after.displayOptions[key]).toBe(on);
  return after;
}

async function setOnlinePreference(page, on) {
  await settingsPage(page, 'features', 'internet');
  const before = await projectSnapshot(page), input = page.locator('#ks_online');
  if (await input.isChecked() !== on) await input.locator('..').click();
  await expect(input).toBeChecked({ checked: on });
  expect(await page.evaluate(() => localStorage.getItem('kash_services_online'))).toBe(on ? '1' : '0');
  expect(await projectSnapshot(page)).toEqual(before);
  await expectBudgetPersisted(page, before);
}

async function setThemePreference(page, mode) {
  await settingsPage(page, 'appearance', 'theme');
  const before = await projectSnapshot(page), select = page.locator('[data-settings-theme-select]');
  await select.selectOption(mode);
  await expect(select).toHaveValue(mode);
  await expect(page.locator('html')).toHaveAttribute('data-kash-theme-mode', mode);
  const resolved = mode === 'system'
    ? await page.evaluate(() => matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : mode;
  await expect(page.locator('html')).toHaveAttribute('data-kash-theme', resolved);
  expect(await page.evaluate(() => localStorage.getItem('kash_ui_theme'))).toBe(mode);
  expect(await projectSnapshot(page)).toEqual(before);
  await expectBudgetPersisted(page, before);
}

async function expectSettingsSelection(page, group, tab) {
  await expect(page.locator('.kashSettingsShell')).toHaveAttribute('data-page', `${group}:${tab}`);
  await expect(page.locator('.kashSettingsNav [aria-current="true"]')).toHaveCount(1);
  await expect(page.locator(`[data-settings-section="${group}"]`)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.kashSettingsTabs [aria-selected="true"]')).toHaveCount(1);
  await expect(page.locator(`[data-settings-tab="${tab}"]`)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#ks_settings_content')).toHaveAttribute('role', 'tabpanel');
  await expect(page.locator('#ks_settings_content')).toHaveAttribute('aria-labelledby', `ks_tab_${tab}`);
  await expect(page.locator(`#ks_tab_${tab}`)).toHaveAttribute('aria-controls', 'ks_settings_content');
}

async function expectChartsVisible(page, visible) {
  for (const panel of [page.locator('.distributionPanel'), page.locator('.flowChartPanel'),
    page.locator('.principalExpensesPanel'), trendPanel(page)]) {
    if (visible) await expect(panel).toBeVisible();
    else await expect(panel).not.toBeVisible();
  }
}

module.exports = {
  settingsTime, settingsMonth, visibleChoice, requiredSettingsTabs, outsideVisibility,
  outsideVisibilityAndCounter, expectOnlyVisibilityChanged, setVisibleChoice,
  setOnlinePreference, setThemePreference, expectSettingsSelection, expectChartsVisible,
};
