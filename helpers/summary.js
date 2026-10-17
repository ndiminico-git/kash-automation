const { expect } = require('@playwright/test');
const { goTo, settingsPage, projectSnapshot } = require('./language');
const { expectBudgetPersisted } = require('./monthly-budget');

const summaryCards = page => page.locator('.kashActiveCurrencyCards > .kashCurrencyBalanceCard');
const summaryCard = (page, currency) => page.locator(`.kashActiveCurrencyCards > [data-estimate-currency="${currency}"]`);
const flowCard = (page, currency, kind) => page.locator(`.flowTile[data-currency="${currency}"][data-flow-kind="${kind}"]`);

async function openSummary(page, month) {
  if (!await page.locator('.summaryDashboard').isVisible()) await goTo(page, 'res');
  if (month) {
    const year = page.locator('.summaryPeriodSelect.year'), period = page.locator('.summaryPeriodSelect.period');
    if (await year.inputValue() !== month.slice(0, 4)) await year.selectOption(month.slice(0, 4));
    if (await period.inputValue() !== month.slice(5, 7)) await period.selectOption(month.slice(5, 7));
    await expect(year).toHaveValue(month.slice(0, 4));
    await expect(period).toHaveValue(month.slice(5, 7));
  }
}

async function expectSummaryCard(page, currency, calculated, projected) {
  const card = summaryCard(page, currency);
  await expect(card.locator('.holdingText > strong')).toHaveText(calculated);
  await expect(card.locator('.currencyCardEstimate .approxValue')).toHaveText(projected);
}

async function expectSummaryOrder(page, codes) {
  await expect(summaryCards(page)).toHaveCount(codes.length);
  expect(await summaryCards(page).evaluateAll(cards => cards.map(card => card.dataset.estimateCurrency))).toEqual(codes);
  await expect(page.locator('.kashActiveCurrencyCards')).toHaveAttribute('data-currency-count', String(codes.length));
}

async function setSummaryFeatures(page, choices) {
  await settingsPage(page, 'features', 'summary');
  for (const [key, checked] of Object.entries(choices)) {
    const input = page.locator(`[data-display-choice="${key}"]`);
    if (await input.isChecked() !== checked) await input.locator('..').click();
    if (checked) await expect(input).toBeChecked();
    else await expect(input).not.toBeChecked();
  }
  await expectBudgetPersisted(page, await projectSnapshot(page));
}

async function enableSummaryConverter(page) {
  await settingsPage(page, 'features', 'internet');
  const input = page.locator('#ks_online');
  if (!await input.isChecked()) await input.locator('..').click();
  await expect(input).toBeChecked();
  await setSummaryFeatures(page, { converter: true });
  await openSummary(page);
  await expect(page.locator('.quickConverter')).toBeVisible();
}

function summaryFinancialState(project) {
  const { displayOptions, summaryCurrencyOrder, ...financial } = project;
  return financial;
}

async function expectFlow(page, currency, { income, out, net }) {
  for (const [kind, text] of Object.entries({ income, out, net })) {
    await expect(flowCard(page, currency, kind).locator('.flowText strong')).toHaveText(text);
  }
}

async function openFlowDetails(page, currency, kind, total) {
  await flowCard(page, currency, kind).locator('.flowEyeBtn').click();
  await expect(page.locator('#flowDetailOverlay [role="dialog"]')).toBeVisible();
  await expect(page.locator('.flowDetailFooter strong')).toHaveText(total);
  await expect(page.locator('.flowDetailClose')).toBeFocused();
}

async function expectHoldingLine(page, label, value) {
  const row = page.locator('#holdingDetails .holdingBreakdown tr').filter({
    has: page.locator('td:first-child').getByText(label, { exact: true }),
  });
  await expect(row).toHaveCount(1);
  await expect(row.locator('td').nth(1)).toHaveText(value);
}

async function startSummaryDrag(page, from, to) {
  const source = summaryCard(page, from), target = summaryCard(page, to);
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const a = await source.boundingBox(), b = await target.boundingBox();
  expect(a).toBeTruthy();
  expect(b).toBeTruthy();
  // Movimiento real del mouse: no se despachan handlers ni se modifica el DOM.
  await page.mouse.move(a.x + 24, a.y + 24);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + 24, { steps: 12 });
  await expect(page.locator('.kashCurrencyDragGhost')).toBeVisible();
  await expect(page.locator('.kashCurrencyDragGhost')).toBeInViewport();
  await expect.poll(() => page.locator('.kashCurrencyDragGhost')
    .evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0);
  await expect(page.locator('.kashCurrencyDragGhost')).toHaveAttribute('aria-hidden', 'true');
  await expect(target).toHaveClass(/kashCardDropTarget/);
}

async function expectFiniteCharts(page) {
  const data = await page.locator('.summarySideCol svg.donutSvg, .summarySideCol svg.barSvg').evaluateAll(svgs =>
    svgs.flatMap(svg => [svg.textContent, ...[svg, ...svg.querySelectorAll('*')].flatMap(el =>
      ['d', 'x', 'y', 'cx', 'cy', 'height', 'width', 'viewBox', 'transform']
        .filter(name => el.hasAttribute(name)).map(name => el.getAttribute(name)))]));
  expect(data.length).toBeGreaterThan(0);
  expect(data.join(' ')).not.toMatch(/NaN|Infinity/);
}

module.exports = {
  summaryCards, summaryCard, flowCard, openSummary, expectSummaryCard, expectSummaryOrder,
  setSummaryFeatures, enableSummaryConverter, summaryFinancialState, expectFlow,
  openFlowDetails, expectHoldingLine, startSummaryDrag, expectFiniteCharts,
};
