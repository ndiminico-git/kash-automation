const { defineConfig } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false, // Primero los leemos y ejecutamos en el orden del archivo.
  workers: 1,
  retries: 0, // Un fallo queda visible; no lo ocultamos con reintentos.
  forbidOnly: Boolean(process.env.CI),
  timeout: 30_000,
  outputDir: path.join(__dirname, 'test-results'),
  expect: { timeout: 5_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.join(__dirname, 'playwright-report') }],
    ['json', { outputFile: path.join(__dirname, 'test-results/results.json') }],
  ],
  use: {
    browserName: 'chromium',
    // "bundled" usa el Chromium instalado por esta versión de Playwright.
    channel: process.env.KASH_BROWSER_CHANNEL === 'bundled'
      ? undefined : (process.env.KASH_BROWSER_CHANNEL || 'msedge'),
    headless: true,
    locale: 'en-US',
    viewport: { width: 1920, height: 1080 },
    storageState: { cookies: [], origins: [] },
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
