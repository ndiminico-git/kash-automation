const { test, expect } = require('@playwright/test');
const path = require('path');

// --- CASO 1: HAPPY PATH (Carga exitosa) ---
test('Flujo de configuración inicial y carga de gasto en KA\$H', async ({ page }) => {
  const rutaIndex = path.resolve(__dirname, '../App/index.html');
  await page.goto(`file://${rutaIndex}`);

  await page.getByRole('button', { name: 'Crear proyecto vacío' }).click();
  await page.getByRole('button', { name: 'Omitir bienvenida' }).click();
  await page.getByRole('button', { name: 'Omitir' }).click();

  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('button', { name: 'Omitir' }).click();
  await page.getByRole('tab', { name: 'Monedas' }).click();
  await page.getByLabel('Moneda para agregar').selectOption('USD');
  await page.getByRole('button', { name: 'Agregar' }).click();

  await expect(page.locator('text=USD')).toBeVisible();

  await page.getByRole('button', { name: 'Gastos' }).click();
  await page.getByRole('button', { name: 'Omitir' }).click();
  
  await page.locator('#ec_ARS').click();
  await page.locator('#ec_ARS').fill('Test1');
  await page.getByRole('textbox', { name: 'Monto ARS' }).click();
  await page.getByRole('textbox', { name: 'Monto ARS' }).fill('100');
  await page.getByRole('button', { name: 'Agregar gasto' }).first().click();

  const gastoRegistrado = page.locator('text=Test1');
  await expect(gastoRegistrado).toBeVisible();

  const celdaPlanilla = page.getByRole('cell', { name: 'ARS 100' });
  await expect(celdaPlanilla).toBeVisible();
});

// --- CASO 2: NEGATIVE TESTING REAL (Validación de Alerta) ---
test('Debería mostrar un cartel de error al intentar agregar un gasto sin monto', async ({ page }) => {
  const rutaIndex = path.resolve(__dirname, '../App/index.html');
  await page.goto(`file://${rutaIndex}`);

  // Flujo rápido para llegar a la sección de Gastos
  await page.getByRole('button', { name: 'Crear proyecto vacío' }).click();
  await page.getByRole('button', { name: 'Omitir bienvenida' }).click();
  await page.getByRole('button', { name: 'Omitir' }).click();
  await page.getByRole('button', { name: 'Gastos' }).click();
  await page.getByRole('button', { name: 'Omitir' }).click();
  
  // Ponemos el nombre pero dejamos el monto en blanco
  await page.locator('#ec_ARS').click();
  await page.locator('#ec_ARS').fill('Gasto Invalido');
  
  // Intentamos agregar el gasto
  await page.getByRole('button', { name: 'Agregar gasto' }).first().click();

  // VERIFICACIÓN INTEGRAL DE ERROR:
  // 1. Validamos que el cartel con el título "Faltan datos" aparezca en pantalla
  const cartelError = page.locator('text=Faltan datos');
  await expect(cartelError).toBeVisible();

  // 2. Cerramos el cartel haciendo clic en el botón "Aceptar" que vimos en la foto
  await page.getByRole('button', { name: 'Aceptar' }).click();

  // 3. Confirmamos que tras cerrar todo, el gasto NO se sumó a la planilla
  const gastoInvalido = page.locator('text=Gasto Invalido');
  await expect(gastoInvalido).not.toBeVisible();
});
