const { expect } = require('@playwright/test');
const { projectSnapshot, settingsPage } = require('./language');
const { expectBudgetPersisted } = require('./monthly-budget');
const { waitForStableLayout } = require('./interaction-stability');

const GEOMETRY_TOLERANCE_PX = 2;

const uiTime = '2026-10-15T12:00:00-03:00';
const uiMonth = '2026-10';

async function unchangedUIProject(page, before) {
  expect(await projectSnapshot(page), 'La presentación no debe modificar el proyecto').toEqual(before);
  await expectBudgetPersisted(page, before);
}

async function box(locator) {
  return waitForStableLayout(locator);
}

async function centeredIcon(button) {
  await waitForStableLayout(button);
  let result;
  await expect(async () => {
    // Botón e icono se miden en el mismo frame; no mezclar posiciones de una animación.
    result = await button.evaluate(el => {
      const rect = node => {
        const r = node.getBoundingClientRect();
        return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom };
      };
      const button = rect(el), icon = rect(el.querySelector('svg'));
      return { button, icon, dx:Math.abs(button.x + button.width/2 - icon.x - icon.width/2),
        dy:Math.abs(button.y + button.height/2 - icon.y - icon.height/2) };
    });
    expect(result.dx, 'Centrado horizontal de la X, tolerancia 2 CSS px').toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
    expect(result.dy, 'Centrado vertical de la X, tolerancia 2 CSS px').toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
  }).toPass({ timeout:5_000, intervals:[100,200,500] });
  return result;
}

function contained(inner, outer, label, tolerance = 2) {
  expect(inner.x, `${label}: borde izquierdo`).toBeGreaterThanOrEqual(outer.x - tolerance);
  expect(inner.right, `${label}: borde derecho`).toBeLessThanOrEqual(outer.right + tolerance);
  expect(inner.y, `${label}: borde superior`).toBeGreaterThanOrEqual(outer.y - tolerance);
  expect(inner.bottom, `${label}: borde inferior`).toBeLessThanOrEqual(outer.bottom + tolerance);
}

function separate(a, b, label) {
  const overlapWidth = Math.min(a.right, b.right) - Math.max(a.x, b.x);
  const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
  expect(overlapWidth <= 1 || overlapHeight <= 1, label).toBe(true);
}

async function noClippedText(locator, measurements) {
  let data;
  // Repetir sólo la lectura/assert hasta que termine el layout; conservar 2 px
  // de tolerancia y fallar si el desborde permanece. No reducir fuentes ni importes.
  try {
    await expect(async () => {
      data = await locator.evaluateAll(nodes => nodes.filter(el => el.getClientRects().length).map(el => ({
        text: el.textContent.trim().slice(0, 90), id: el.id, width: el.clientWidth, scrollWidth: el.scrollWidth,
        height: el.clientHeight, scrollHeight: el.scrollHeight,
        font: getComputedStyle(el).font, viewport: { width:innerWidth, height:innerHeight },
        currency:el.closest('[data-estimate-currency]')?.dataset.estimateCurrency,
        currencyCount:el.closest('[data-currency-count]')?.dataset.currencyCount,
        className:el.className,
      })));
      expect(data.length, 'La muestra de textos no puede estar vacía').toBeGreaterThan(0);
      for (const item of data) {
        expect(item.scrollWidth, `Texto cortado horizontalmente: ${item.text}`).toBeLessThanOrEqual(item.width + 2);
        expect(item.scrollHeight, `Texto cortado verticalmente: ${item.text}`).toBeLessThanOrEqual(item.height + 2);
      }
    }).toPass({ timeout:5_000, intervals:[100,200,500] });
  } finally {
    if (measurements) measurements.push({ kind:'text-fit', data });
  }
  return data;
}

async function headerGeometry(page) {
  const header = page.locator('.kashPageHeader');
  await expect(header).toHaveCount(1);
  const title = header.locator('.kashPageTitle'), tools = header.locator('.kashPageTools');
  const h = await box(header), t = await box(title), p = await box(tools);
  contained(t, h, 'Título dentro de cabecera');
  contained(p, h, 'Acciones dentro de cabecera');
  separate(t, p, 'Título y acciones no se superponen');
  expect(h.x).toBeGreaterThanOrEqual(0);
  expect(h.right).toBeLessThanOrEqual((await page.viewportSize()).width + 2);
  await noClippedText(header.locator('h2, .kashHelpButton, .zoomControls button'));
  return { header: h, title: t, tools: p };
}

async function noDocumentOverflow(page) {
  const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth }));
  expect(size.scroll, 'La página no debe exigir scroll horizontal; las tablas sí pueden tenerlo interno').toBeLessThanOrEqual(size.client + 2);
  return size;
}

async function setUIZoom(page, target) {
  const controls = page.locator('.kashPageHeader .zoomControls');
  const read = async () => Number((await controls.locator('#zoomPct').innerText()).replace('%',''));
  for (let step = 0; step < 10; step++) {
    const current = await read();
    if (current === target) return;
    await controls.locator('button').nth(current < target ? 1 : 0).click();
    await expect(controls.locator('#zoomPct')).toHaveText(`${current + (current < target ? 5 : -5)}%`);
  }
  expect(await read()).toBe(target);
}

async function setCollapsedNavigation(page, on) {
  const actual = await page.locator('body').evaluate(el => el.classList.contains('nav-collapsed'));
  if (actual !== on) await page.locator('[onclick="toggleNav()"]').click();
  await expect.poll(() => page.locator('body').evaluate(el => el.classList.contains('nav-collapsed'))).toBe(on);
}

async function readTextContrast(locator) {
  // Cálculo independiente sobre fondos sólidos compuestos: no usa tokens ni calculadores de la app.
  return locator.evaluateAll(nodes => nodes.filter(el => el.getClientRects().length).map(el => {
    const rgba = text => (text.match(/[\d.]+/g) || []).map(Number);
    const over = (fg, bg) => {
      const a = fg[3] ?? 1;
      return [0,1,2].map(i => fg[i] * a + bg[i] * (1-a));
    };
    const linear = value => { const s = value/255; return s <= .04045 ? s/12.92 : ((s+.055)/1.055)**2.4; };
    const luminance = rgb => .2126*linear(rgb[0]) + .7152*linear(rgb[1]) + .0722*linear(rgb[2]);
    const layers = [];
    for (let node = el; node; node = node.parentElement) {
      const style = getComputedStyle(node), color = rgba(style.backgroundColor);
      layers.push({ color, image: style.backgroundImage, opacity: Number(style.opacity) });
      if ((color[3] ?? 1) === 1) break;
    }
    let background = [255,255,255];
    for (const layer of [...layers].reverse()) background = over(layer.color, background);
    const style = getComputedStyle(el), foreground = over(rgba(style.color), background);
    const l1 = luminance(foreground), l2 = luminance(background);
    const size = parseFloat(style.fontSize), weight = parseFloat(style.fontWeight);
    return { text: el.textContent.trim().slice(0,90), size, weight, foreground, background,
      ratio: (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05),
      minimum: size >= 24 || (size >= 18.6667 && weight >= 700) ? 3 : 4.5,
      supported: layers.every(layer => layer.image === 'none' && layer.opacity === 1) };
  }));
}

async function assertTextContrast(locator, label, measurements) {
  // Esperar al fin de las entradas animadas antes de medir contraste estático.
  // No cambiar colores ni desactivar animaciones para obtener un resultado favorable.
  let data;
  await expect.poll(async () => {
    data = await readTextContrast(locator);
    return data.length > 0 && data.every(item => item.supported);
  }, { message: `${label}: esperar fondos sólidos y opacidad estable` }).toBe(true);
  expect(data.length, `${label}: muestra no vacía`).toBeGreaterThan(0);
  measurements.push({ label, data });
  for (const item of data) {
    expect(item.supported, `${label}: medición requiere fondo sólido y opacidad completa`).toBe(true);
    expect.soft(item.ratio, `${label}: «${item.text}», contraste mínimo ${item.minimum}:1`).toBeGreaterThanOrEqual(item.minimum);
  }
}

async function visibleKeyboardFocus(locator) {
  await expect(locator).toBeFocused();
  const focus = await locator.evaluate(el => {
    const style = getComputedStyle(el);
    return { visible: el.matches(':focus-visible'), outline: style.outlineStyle,
      width: parseFloat(style.outlineWidth), shadow: style.boxShadow };
  });
  expect(focus.visible, 'Foco visible por teclado').toBe(true);
  expect((focus.width > 0 && focus.outline !== 'none') || focus.shadow !== 'none', 'El foco debe tener indicador visual').toBe(true);
}

module.exports = { uiTime, uiMonth, unchangedUIProject, box, centeredIcon, contained, separate,
  noClippedText, headerGeometry, noDocumentOverflow, setUIZoom, setCollapsedNavigation,
  readTextContrast, assertTextContrast, visibleKeyboardFocus };
