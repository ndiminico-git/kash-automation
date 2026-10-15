const { test, expect } = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

// Carpeta App del portable. Se puede indicar mediante KASH_APP_DIR.
const APP_DIR = path.resolve(
  process.env.KASH_APP_DIR || path.join(__dirname, '../App')
);

let server, url;

test.use({
  browserName: 'chromium',
  channel: 'msedge',
  viewport: { width: 1920, height: 1080 },
  storageState: { cookies: [], origins: [] }, // Sin datos previos.
});

// Sirve los archivos reales usando un puerto temporal disponible.
test.beforeAll(async () => {
  await fs.access(path.join(APP_DIR, 'index.html'));

  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };

  server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, 'http://localhost').pathname
      );
      const file = path.resolve(
        APP_DIR,
        '.' + (pathname === '/' ? '/index.html' : pathname)
      );

      if (!file.startsWith(APP_DIR + path.sep)) {
        res.writeHead(403).end();
        return;
      }

      const body = await fs.readFile(file);
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  url = `http://127.0.0.1:${server.address().port}/index.html`;
});

test.afterAll(async () => {
  if (server?.listening) {
    await new Promise(resolve => server.close(resolve));
  }
});

async function omitirRecorrido(page) {
  const guia = page.locator('#kashLearning[data-kind="tour"]');
  await expect(guia).toBeVisible();
  await guia.locator('[data-learn="tour-close"]').click();
  await expect(guia).toHaveCount(0);
}

test('Primer gasto: caracteres especiales, decimales y pago en la planilla', async ({ page }) => {
  const erroresJS = [];
  page.on('pageerror', error => erroresJS.push(error.message));

  const concepto = 'Café & Facturas! <b>promo</b>';
  const nota = 'Primera carga: "mañana" & café.';
  const importeVisible = 'ARS 150,75';

  // 1. Crear el proyecto desde cero y omitir los asistentes reales.
  await page.goto(url);

  expect(
    await page.evaluate(() => localStorage.getItem('kash'))
  ).toBeNull();

  await page.getByRole('button', {
    name: 'Crear proyecto vacío',
    exact: true,
  }).click();

  const bienvenida = page.locator('#kashLearning[data-kind="welcome"]');
  await expect(bienvenida).toBeVisible();
  await bienvenida.getByRole('button', {
    name: 'Omitir bienvenida',
    exact: true,
  }).click();

  await omitirRecorrido(page); // Recorrido de Resumen.

  // 2. Entrar a Gastos y omitir su recorrido inicial.
  const nav = page.locator('#nav');
  await nav.getByRole('button', { name: 'Gastos', exact: true }).click();
  await omitirRecorrido(page);

  const seccion = page.locator(
    'section.expenseSection[data-expense-currency="ARS"]'
  );
  const fila = seccion.locator('tbody tr[data-expense-index]');

  await expect(fila).toHaveCount(0);

  // Usar el mes actual del formulario evita fechas fijas que luego caduquen.
  const mes = await page.locator('#ef_ARS').inputValue();
  expect(mes).toMatch(/^\d{4}-\d{2}$/);

  await page.locator('#ef_ARS').fill(mes);
  await page.locator('#ec_ARS').fill(concepto);
  await page.locator('#ea_ARS').fill('150.75');
  await page.locator('#en_ARS').fill(nota);

  await expect(page.locator('#epaid_ARS')).not.toBeChecked();
  await expect(page.locator('#erepeat_ARS')).not.toBeChecked();

  await seccion.getByRole('button', {
    name: 'Agregar gasto',
    exact: true,
  }).click();

  // 3. Un registro, importe correcto y HTML mostrado como texto literal.
  await expect(fila).toHaveCount(1);
  await expect(fila.locator('.expenseConceptText')).toHaveText(concepto);
  await expect(fila.locator('.expenseConceptText b')).toHaveCount(0);
  await expect(fila.locator('td').nth(2)).toHaveText(importeVisible);
  await expect(fila.locator('.noteCell')).toHaveText(nota);
  await expect(fila.getByRole('checkbox')).not.toBeChecked();

  // 4. Validar importe y estado pendiente en Consumos Mensuales.
  await nav.getByRole('button', {
    name: 'Consumos Mensuales',
    exact: true,
  }).click();
  await omitirRecorrido(page);

  const celda = page.locator(
    `#gw td[data-expense-currency="ARS"][data-month="${mes}"]`
  );
  const total = page.locator(
    `#gw tr[data-total-currency="ARS"][data-total-kind="expenses"] ` +
    `td[data-total-month="${mes}"]`
  );

  // Identificación por moneda y mes, sin asumir un ID numérico de rubro.
  await expect(celda).toHaveCount(1);
  await expect(celda.locator('.valw')).toHaveText(importeVisible);
  await expect(celda).toHaveClass(/\bpe\b/);
  await expect(celda.locator('.pk')).not.toHaveClass(/\bon\b/);
  await expect(total).toHaveText(importeVisible);

  // 5. Marcar el pago: cambia el estado, pero no duplica el total.
  await nav.getByRole('button', { name: 'Gastos', exact: true }).click();
  await fila.getByRole('checkbox').check();

  await expect(fila.getByRole('checkbox')).toBeChecked();
  await expect(fila).toHaveCount(1);

  await nav.getByRole('button', {
    name: 'Consumos Mensuales',
    exact: true,
  }).click();

  await expect(celda).toHaveClass(/\bok\b/);
  await expect(celda.locator('.pk')).toHaveClass(/\bon\b/);
  await expect(total).toHaveText(importeVisible);

  // 6. Esperar el guardado del navegador, sin pausas arbitrarias.
  await expect.poll(() => page.evaluate(() => {
    const proyecto = JSON.parse(localStorage.getItem('kash') || 'null');
    return proyecto?.expenses?.[0]?.paid;
  })).toBe(true);

  const guardado = await page.evaluate(
    () => JSON.parse(localStorage.getItem('kash'))
  );

  expect(guardado.expenses).toHaveLength(1);
  expect(guardado.expenses[0]).toMatchObject({
    c: concepto,
    n: nota,
    m: 'ARS',
    f: mes,
    paid: true,
  });
  expect(guardado.expenses[0].a).toBe(150.75); // Nunca 15075.

  // 7. Recargar y comprobar que importe y pago se conservaron.
  await page.reload();
  await nav.getByRole('button', {
    name: 'Consumos Mensuales',
    exact: true,
  }).click();

  await expect(celda.locator('.valw')).toHaveText(importeVisible);
  await expect(celda.locator('.pk')).toHaveClass(/\bon\b/);
  await expect(total).toHaveText(importeVisible);

  expect(erroresJS).toEqual([]);
});