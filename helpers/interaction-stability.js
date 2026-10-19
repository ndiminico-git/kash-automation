const { expect } = require('@playwright/test');

// Las dos capas flotantes de la planilla se cierran en eventos de scroll.
// Esperar el layout ANTES del gesto evita confundir ese cierre con una carga lenta.
// Sólo lee el DOM: no modifica estilos, animaciones, foco ni estado de la app.
async function waitForStableLayout(locator) {
  await expect(locator).toBeVisible();
  let previous, consecutive = 0, last;
  await expect.poll(async () => {
    const state = await locator.evaluate(el => {
      const r = el.getBoundingClientRect();
      const ancestors = [];
      let animating = false;
      for (let node = el; node; node = node.parentElement) {
        ancestors.push([node.scrollLeft, node.scrollTop, node.clientWidth, node.clientHeight]);
        animating ||= node.getAnimations().some(animation =>
          ['running', 'pending'].includes(animation.playState) &&
          Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)));
      }
      return { rect: { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom },
        ancestors, animating, fontsReady: document.fonts.status === 'loaded' };
    });
    last = state.rect;
    const signature = JSON.stringify([state.rect, state.ancestors]);
    consecutive = !state.animating && state.fontsReady && signature === previous ? consecutive + 1 : 0;
    previous = signature;
    return consecutive >= 2;
  }, { timeout:10_000, intervals:[50,100,100],
    message:'Esperar geometría, fuentes y scroll estables antes de interactuar o medir' }).toBe(true);
  return last;
}

async function preparePointerTarget(page, locator) {
  // Salir primero garantiza un nuevo pointerover, incluso si el scroll dejó el
  // elemento bajo el puntero y ya produjo/cerró una vista previa.
  await page.mouse.move(0, 0);
  await locator.scrollIntoViewIfNeeded();
  await waitForStableLayout(locator);
}

module.exports = { waitForStableLayout, preparePointerTarget };
