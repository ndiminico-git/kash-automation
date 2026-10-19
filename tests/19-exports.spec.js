const { test, expect } = require('../helpers/upgrade-fixture');
const { projectSnapshot, goTo, changeLanguage } = require('../helpers/language');
const { createExpense, openExpenses } = require('../helpers/expenses');
const { setExpenseFilters } = require('../helpers/expense-filters');
const { setOpeningBalance, writeVerifiedBalance } = require('../helpers/balances');
const { openSummary } = require('../helpers/summary');
const { expectBudgetUnchanged, openMonthlyBudget } = require('../helpers/monthly-budget');

// Independent parser: assert actual downloaded bytes, not the app's makeCsv() result.
function parseCsv(source) {
  const rows = []; let row = [], field = '', quoted = false;
  const text = source.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (char === ';' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\r' || char === '\n') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  expect(quoted, 'CSV con comillas cerradas').toBe(false);
  if (field || row.length) rows.push([...row, field]);
  return rows;
}
async function downloadCsv(page) {
  const pending = page.waitForEvent('download');
  await page.locator('[data-export-kind="csv"]').click();
  const download = await pending;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  const stream = await download.createReadStream(), chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  expect([...buffer.subarray(0, 3)]).toEqual([239, 187, 191]);
  return parseCsv(buffer.toString('utf8'));
}
async function openExport(page) {
  await page.locator('.kashExportHeaderButton').click();
  await expect(page.locator('#kashExportModal [role="dialog"]')).toBeVisible();
}

test.describe('19 · Exportaciones CSV y documento mensual · KA$H v0.690', () => {
  test.setTimeout(60_000);
  test('TC-207 [N] Gastos vacíos o filtros sin resultados deshabilitan CSV sin crear registros', async ({ page }) => {
    await openExpenses(page);
    const button = page.locator('.kashExportHeaderButton');
    await expect(button).toBeDisabled();
    await createExpense(page, { description: 'Gasto único', amount: '5' });
    await expect(button).toBeEnabled();
    const before = await projectSnapshot(page);
    await setExpenseFilters(page, { query: 'No existe' });
    await expect(button).toBeDisabled();
    await expectBudgetUnchanged(page, before);
  });

  test('TC-208 [B] CSV respeta filtros y protege fórmulas, comillas y separadores', async ({ page }) => {
    const description = '=1+1; Café "QA"';
    const note = '@usuario; "nota"';
    await createExpense(page, { description, amount: '150.75', note, paid: true });
    await createExpense(page, { description: 'Excluir del CSV', amount: '99' });
    await setExpenseFilters(page, { query: 'Café' });
    const before = await projectSnapshot(page);
    await openExport(page);
    const rows = await downloadCsv(page);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(['Date', 'Description', 'Currency', 'Amount', 'Status', 'Notes']);
    expect(rows[1]).toEqual(['2026-10', "'" + description, 'ARS', '150.75', 'Paid', "'" + note]);
    await expectBudgetUnchanged(page, before);
  });

  test('TC-209 [R] CSV de totales distingue un cierre cero de un cierre ausente y conserva el cálculo', async ({ page }) => {
    await setOpeningBalance(page, 'ARS', '100');
    await createExpense(page, { month: '2026-10', description: 'Pendiente CSV', amount: '10' });
    await writeVerifiedBalance(page, 'ARS', '2026-10', '0');
    await openMonthlyBudget(page);
    const before = await projectSnapshot(page);
    await openExport(page);
    await page.locator('#kashExportContent').selectOption('totals');
    const rows = await downloadCsv(page);
    expect(rows).toHaveLength(4); // October through December; no periods before project start.
    expect(rows[1]).toEqual(['2026-10', 'ARS', '0', '10', '100', '90', '0', '100']);
    expect(rows[2][0]).toBe('2026-11');
    expect(rows[2][6]).toBe('');
    await expectBudgetUnchanged(page, before);
  });

  test('TC-210 [R] Documento mensual muestra saldos independientes y cierre ausente sin ejecutar impresoras', async ({ page }) => {
    await setOpeningBalance(page, 'ARS', '100');
    await createExpense(page, { description: 'Pendiente reporte', amount: '150' });
    await openSummary(page, '2026-10');
    const before = await projectSnapshot(page);
    await openExport(page);
    const report = page.locator('#kashPrintSheet');
    await expect(report).toBeVisible();
    await expect(report.locator('.kashPrintCurrency h2')).toHaveText('ARS');
    expect(await report.locator('[data-export-value]').evaluateAll(xs => xs.map(x => Number(x.dataset.exportValue))))
      .toEqual([100, 0, 150, 100, -50]);
    await expect(report.locator('.kashPrintLine').last()).toContainText('Not recorded');
    await expect(report.locator('.kashPrintNegative')).toHaveText('-ARS 50');
    await expect(page.locator('[data-export-kind="print"]')).toBeEnabled();
    await expect(page.locator('[data-export-kind="pdf"]')).toBeEnabled();
    // Chromium web invokes the OS print dialog; native PDF persistence requires desktop QA.
    await page.keyboard.press('Escape');
    await expect(page.locator('#kashExportModal')).toHaveCount(0);
    await expect(page.locator('.kashExportHeaderButton')).toBeFocused();
    await expectBudgetUnchanged(page, before);
  });

  test('TC-211 [R] Exportación española usa coma decimal y cerrar restaura el foco sin guardar cambios', async ({ page }) => {
    await createExpense(page, { description: 'Café ES', amount: '10.25' });
    await changeLanguage(page, 'es');
    await goTo(page, 'gastos');
    const before = await projectSnapshot(page);
    await openExport(page);
    const rows = await downloadCsv(page);
    expect(rows[0]).toEqual(['Fecha', 'Concepto', 'Moneda', 'Importe', 'Estado', 'Notas']);
    expect(rows[1]).toEqual(['2026-10', 'Café ES', 'ARS', '10,25', 'Pendiente', '']);
    await page.keyboard.press('Escape');
    await expect(page.locator('.kashExportHeaderButton')).toBeFocused();
    await expect(page.locator('body')).not.toHaveClass(/kashPrintReady/);
    await expectBudgetUnchanged(page, before);
  });
});
