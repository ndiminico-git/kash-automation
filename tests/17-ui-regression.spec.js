const { test: base, expect } = require('@playwright/test');
const { startAppServer } = require('../helpers/app-server');
const { createLanguageProject, projectSnapshot, goTo, navigation, settingsPage, changeLanguage } = require('../helpers/language');
const { expectBudgetPersisted } = require('../helpers/monthly-budget');
const { createExpense, expenseRow, expenseRows, saveButton } = require('../helpers/expenses');
const { setOpeningBalance } = require('../helpers/balances');
const { addCurrency } = require('../helpers/currencies');
const { openSummary, summaryCard, flowCard, expectSummaryCard } = require('../helpers/summary');
const { setThemePreference, expectSettingsSelection } = require('../helpers/settings');
const { uiTime, uiMonth, unchangedUIProject, box, contained, separate, noClippedText,
  headerGeometry, noDocumentOverflow, setUIZoom, setCollapsedNavigation,
  assertTextContrast, visibleKeyboardFocus } = require('../helpers/ui-regression');

const errorsByPage = new WeakMap();
const measurementsByPage = new WeakMap();
async function timing(info, name, start, extra = {}) {
  await info.attach(`ui-${name}-timing`, { body: JSON.stringify({ setupDurationMs: Date.now()-start,
    setupTimeoutMs: 60_000, testTimeoutMs: info.timeout, ...extra }), contentType: 'application/json' });
}
const test = base.extend({
  uiApp: [async ({}, use) => {
    const app = await startAppServer();
    try { await use(app); } finally { await app.close(); }
  }, { scope: 'worker', timeout: 15_000 }],
  cleanUIProject: [async ({ page, context, uiApp: app }, use, info) => {
    const start = Date.now(), errors = [], origin = new URL(app.url).origin;
    errorsByPage.set(page, errors); measurementsByPage.set(page, []);
    page.on('pageerror', error => errors.push(error.message));
    // Reloj que avanza: los tooltips filtran foco justo después de pointerdown usando Date.now().
    await page.clock.install({ time: new Date(uiTime) });
    await context.addInitScript(value => {
      if (location.origin === value && localStorage.getItem('kash_services_online') === null)
        localStorage.setItem('kash_services_online','0');
    }, origin);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.goto(app.url);
    expect(await page.evaluate(() => localStorage.getItem('kash'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('kash_language'))).toBeNull();
    await createLanguageProject(page);
    const before = await projectSnapshot(page);
    expect(before.inicio).toBe(uiMonth); expect(before.expenses).toEqual([]); expect(before.C).toEqual({});
    await expectBudgetPersisted(page,before);
    const now = await page.evaluate(() => Date.now());
    await expect.poll(() => page.evaluate(() => Date.now())).toBeGreaterThan(now);
    page.setDefaultTimeout(5_000);
    await timing(info,'setup',start,{ freshProject: true, initialTime: uiTime, clockAdvances: true });
    await use();
  }, { auto: true, timeout: 60_000 }],
  sampleProject: [async ({ page, cleanUIProject }, use, info) => {
    const start = Date.now();
    await setOpeningBalance(page,'ARS','1000');
    await createExpense(page,{ description:'Café & Facturas!', amount:'25', paid:true, month:uiMonth, note:'Nota literal <b>Save</b>' });
    await createExpense(page,{ description:'Pendiente QA', amount:'75', paid:false, month:uiMonth });
    await openSummary(page,uiMonth);
    await expectSummaryCard(page,'ARS','ARS 975','ARS 900');
    await timing(info,'data',start);
    await use(await projectSnapshot(page));
  }, { timeout: 60_000 }],
  scrollProject: [async ({ page, sampleProject }, use, info) => {
    const start = Date.now();
    // Varias secciones provocan scroll de página, además del scroll interno de la tabla.
    await addCurrency(page,'USD');
    await addCurrency(page,'EUR');
    for (let i=1;i<=10;i++) await createExpense(page,{ description:`Fila desplazable ${i}`, amount:'1', paid:false, month:uiMonth });
    await timing(info,'scroll-data',start);
    await use(await projectSnapshot(page));
  }, { timeout: 60_000 }],
});

test.use({ storageState:{ cookies:[], origins:[] }, timezoneId:'America/Argentina/Buenos_Aires' });
test.describe('17 · Diseño y accesibilidad básica · KA$H v0.690', () => {
  test.setTimeout(60_000);
  test.afterEach(async ({ page }, info) => {
    const errors = errorsByPage.get(page) || [], measurements = measurementsByPage.get(page) || [];
    if (measurements.length) await info.attach('ui-measurements',{ body:JSON.stringify(measurements,null,2), contentType:'application/json' });
    if (errors.length) await info.attach('javascript-errors',{ body:JSON.stringify(errors), contentType:'application/json' });
    expect.soft(errors,'Sin errores JavaScript').toEqual([]);
    if (info.status !== info.expectedStatus && !page.isClosed()) {
      const diagnostic = await page.evaluate(() => ({
        viewport:{width:innerWidth,height:innerHeight}, language:document.documentElement.lang,
        theme:document.documentElement.dataset.kashTheme,
        focused:{tag:document.activeElement?.tagName,id:document.activeElement?.id,
          text:document.activeElement?.textContent?.trim().slice(0,120)},
        project:typeof window.KASHGetProjectJson==='function'?JSON.parse(window.KASHGetProjectJson()):null,
        modal:document.querySelector('#darkModal,#flowDetailOverlay,#kashLearning')?.textContent?.slice(0,600),
      })).catch(error=>({diagnosticError:error.message}));
      await info.attach('ui-diagnostic',{body:JSON.stringify(diagnostic,null,2),contentType:'application/json'});
    }
  });

  test('TC-187 [R] Seis secciones mantienen cabeceras legibles sin superposición ni desborde en escritorio', async ({ page }) => {
    const before=await projectSnapshot(page), evidence=measurementsByPage.get(page);
    for (const width of [1366,1920,2560]) {
      await page.setViewportSize({width,height:1080});
      for (const section of ['res','grid','fx','gastos','cu','set']) {
        await goTo(page,section);
        await expect(page.locator('.kashPageHeader h2')).toHaveText(navigation.en[section]);
        evidence.push({width,section,...await headerGeometry(page),document:await noDocumentOverflow(page)});
        await expect(page.locator('.kashPageHeader .kashHelpButton')).toHaveAccessibleName('KASH help, F1');
      }
    }
    await unchangedUIProject(page,before);
  });

  test('TC-188 [E] Una a cinco monedas acomodan tarjetas e importes grandes sin tapar textos ni otras tarjetas', async ({ page, sampleProject }) => {
    await setOpeningBalance(page,'ARS','123456789.12');
    const codes=['ARS','USD','EUR','BRL','JPY'], evidence=measurementsByPage.get(page);
    for (let count=1;count<=5;count++) {
      if(count>1) await addCurrency(page,codes[count-1]);
      const before=await projectSnapshot(page);
      for(const width of [1920,1366]) {
        await page.setViewportSize({width,height:1080});
        await openSummary(page,uiMonth);
        const container=page.locator('.kashActiveCurrencyCards'), cards=container.locator(':scope>[data-estimate-currency]');
        await expect(cards).toHaveCount(count);
        await expect(container).toHaveAttribute('data-currency-count',String(count));
        const outer=await box(container), boxes=[];
        for(let i=0;i<count;i++) {
          const card=cards.nth(i), rect=await box(card);
          contained(rect,outer,'Tarjeta dentro de su grilla');
          for(const old of boxes) separate(rect,old,'Las tarjetas no se superponen');
          boxes.push(rect);
          await noClippedText(card.locator('.currencyBalanceCaption,.holdingText>strong,.currencyCardEstimate>span,.approxValue'));
          for(const caption of ['.currencyBalanceCaption','.currencyCardEstimate>span'])
            expect(await card.locator(caption).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
        }
        await expectSummaryCard(page,'ARS','ARS 123,456,764.12','ARS 123,456,689.12');
        evidence.push({count,width,outer,cards:boxes});
        await noDocumentOverflow(page);
        await unchangedUIProject(page,before);
      }
    }
  });

  test('TC-189 [R] Inglés y español con zoom 80 y 125 conservan títulos, acciones y filtros dentro de su espacio', async ({ page }) => {
    const before=await projectSnapshot(page), evidence=measurementsByPage.get(page);
    await page.setViewportSize({width:1366,height:900});
    for(const language of ['en','es']) {
      await changeLanguage(page,language);
      for(const section of ['res','grid','gastos']) {
        await goTo(page,section);
        for(const zoom of [80,125]) {
          await setUIZoom(page,zoom);
          await expect(page.locator('.kashPageHeader h2')).toHaveText(navigation[language][section]);
          evidence.push({language,section,zoom,...await headerGeometry(page)});
          if(section==='gastos') {
            const fields=page.locator('#expenseSearch,#expensePeriodFilter,#expenseCurrencyFilter');
            await expect(fields).toHaveCount(3);
            const outer=await box(page.locator('.expenseFiltersBar'));
            for(let i=0;i<3;i++) contained(await box(fields.nth(i)),outer,'Filtro dentro de la barra');
          }
          await noDocumentOverflow(page);
        }
      }
    }
    await unchangedUIProject(page,before);
  });

  test('TC-190 [P] Campos y acciones de Gastos tienen nombre accesible y permiten registrar con Tab, Espacio y Enter', async ({ page }) => {
    await goTo(page,'gastos');
    // El nombre del buscador puede incluir su botón «Clear search», contenido en el mismo label.
    // La etiqueta visible debe estar al principio y el botón conserva su nombre independiente.
    for(const [id,name] of [['expenseSearch',/^Search by description(?:\s|$)/],['expensePeriodFilter','Period'],
      ['expenseCurrencyFilter','Currency'],['ef_ARS','Month'],['ec_ARS','Description'],['ea_ARS','Amount ARS'],['en_ARS','Notes']])
      await expect(page.locator(`#${id}`)).toHaveAccessibleName(name);
    await expect(page.locator('.expenseSearchInputWrap .searchClear')).toHaveAccessibleName('Clear search');
    await page.locator('#ec_ARS').focus();
    await page.keyboard.type('Teclado & Café');
    await page.keyboard.press('Tab'); await expect(page.locator('#ea_ARS')).toBeFocused();
    await page.keyboard.type('150.75');
    await page.keyboard.press('Tab'); await expect(page.locator('#en_ARS')).toBeFocused();
    await page.keyboard.type('Nota por teclado');
    await page.keyboard.press('Tab'); await expect(page.locator('#epaid_ARS')).toBeFocused();
    await page.keyboard.press('Space'); await expect(page.locator('#epaid_ARS')).toBeChecked();
    await page.keyboard.press('Tab'); await expect(page.locator('#erepeat_ARS')).toBeFocused();
    await expect(page.locator('#erepeat_ARS')).toHaveAccessibleName('Repeat monthly');
    await page.keyboard.press('Tab'); await visibleKeyboardFocus(saveButton(page));
    await page.keyboard.press('Enter');
    await expect(expenseRows(page)).toHaveCount(1);
    await expect(expenseRow(page,'ARS','Teclado & Café').locator('.noteCell')).toHaveText('Nota por teclado');
    const after=await projectSnapshot(page);
    expect(after.expenses).toHaveLength(1);
    expect(after.expenses[0]).toMatchObject({c:'Teclado & Café',a:150.75,n:'Nota por teclado',paid:true,m:'ARS',f:uiMonth});
    await expectBudgetPersisted(page,after);
    await expect(page.locator('#expenseFilterSummary')).toHaveAttribute('role','status');
    await expect(page.locator('#expenseFilterSummary')).toHaveAttribute('aria-live','polite');
    await openSummary(page,uiMonth); await expectSummaryCard(page,'ARS','-ARS 150.75','-ARS 150.75');
  });

  test('TC-191 [P] Tabs de Ajustes conectan nombres y paneles y muestran foco al navegar con teclado', async ({ page }) => {
    const before=await projectSnapshot(page);
    await settingsPage(page,'money','currencies');
    for(const [key,tab] of [['ArrowRight','balances'],['End','adjustments'],['Home','currencies']]) {
      await page.keyboard.press(key);
      await expectSettingsSelection(page,'money',tab);
      await visibleKeyboardFocus(page.locator(`[data-settings-tab="${tab}"]`));
    }
    await settingsPage(page,'features','summary');
    const charts=page.locator('[data-display-choice="charts"]');
    await expect(charts).toHaveAttribute('role','switch');
    await expect(charts).toHaveAccessibleName('Charts');
    await charts.focus(); await page.keyboard.press('Space'); await expect(charts).toBeChecked();
    await charts.focus(); await page.keyboard.press('Space'); await expect(charts).not.toBeChecked();
    await unchangedUIProject(page,before);
  });

  test('TC-192 [R] Textos principales y secundarios mantienen contraste básico en temas claro y oscuro', async ({ page, sampleProject:before }) => {
    const evidence=measurementsByPage.get(page);
    for(const theme of ['dark','light']) {
      await setThemePreference(page,theme);
      await openSummary(page,uiMonth);
      for(const selector of ['.kashPageHeader h2','.currencyBalanceCaption','.holdingText>strong','.currencyCardEstimate>span','.approxValue','.holdingText>.minor'])
        await assertTextContrast(page.locator(selector),`${theme}: ${selector}`,evidence);
      await goTo(page,'gastos');
      for(const selector of ['.kashPageHeader h2','.expenseSearchField>span','.expenseFilterLabel>span','.expenseForm>label','#expenseFilterSummary'])
        await assertTextContrast(page.locator(selector),`${theme}: ${selector}`,evidence);
      await unchangedUIProject(page,before);
    }
  });

  test('TC-193 [R] Ayudas al pasar el mouse y enfocar usan tooltip temático, relación accesible y Escape', async ({ page, sampleProject:before }) => {
    const evidence=measurementsByPage.get(page);
    for(const theme of ['dark','light']) {
      await setThemePreference(page,theme);
      await openSummary(page,uiMonth);
      const badge=summaryCard(page,'ARS').locator('.holdingVariation');
      await expect(badge).toBeVisible();
      await expect(badge).not.toHaveAttribute('title',/.*/);
      await badge.hover();
      const tooltip=page.locator('#kashAppTooltip');
      await expect(tooltip).toBeVisible(); await expect(tooltip).toHaveAttribute('role','tooltip');
      await expect(badge).toHaveAttribute('aria-describedby',/kashAppTooltip/);
      contained(await box(tooltip),{x:0,y:0,right:1920,bottom:1080},'Tooltip dentro de pantalla');
      await assertTextContrast(tooltip,`${theme}: tooltip`,evidence);
      await page.keyboard.press('Escape'); await expect(tooltip).toBeHidden();
      await expect(badge).not.toHaveAttribute('aria-describedby',/kashAppTooltip/);
      // El atajo de zoom tiene una ayuda disponible por foco sin activar su acción.
      const zoomOut=page.locator('.kashPageHeader .zoomControls button').first();
      await zoomOut.focus();
      await expect(tooltip).toBeVisible();
      await expect(zoomOut).toHaveAttribute('aria-describedby',/kashAppTooltip/);
      await page.keyboard.press('Escape'); await expect(tooltip).toBeHidden();
      await unchangedUIProject(page,before);
    }
  });

  test('TC-194 [R] Detalle modal centra su cierre, contiene el foco y lo devuelve al botón de origen', async ({ page, sampleProject:before }, info) => {
    await openSummary(page,uiMonth);
    const trigger=flowCard(page,'ARS','out').locator('.flowEyeBtn');
    await trigger.click();
    const dialog=page.locator('#flowDetailOverlay [role="dialog"]'), close=page.locator('.flowDetailClose');
    await expect(dialog).toBeVisible(); await expect(dialog).toHaveAttribute('aria-modal','true');
    await expect(dialog).toHaveAttribute('aria-labelledby','flowDetailHeading');
    await expect(close).toHaveAccessibleName('Close details'); await expect(close).toBeFocused();
    const button=await box(close), icon=await box(close.locator('svg'));
    expect(Math.abs((button.x+button.width/2)-(icon.x+icon.width/2))).toBeLessThanOrEqual(1);
    expect(Math.abs((button.y+button.height/2)-(icon.y+icon.height/2))).toBeLessThanOrEqual(1);
    await info.attach('ui-modal-before-tab',{body:await page.screenshot(),contentType:'image/png'});
    const focused=()=>page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,
      text:document.activeElement?.textContent?.trim().slice(0,120),
      insideDialog:!!document.activeElement?.closest('#flowDetailOverlay')}));
    await page.keyboard.press('Tab');
    await expect.soft(close,'Tab debe permanecer dentro del diálogo modal').toBeFocused();
    const afterTab=await focused();
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    await expect.soft(trigger,'Cerrar debe devolver el foco al botón que abrió el detalle').toBeFocused();
    measurementsByPage.get(page).push({kind:'modal-focus',button,icon,afterTab,afterClose:await focused()});
    await unchangedUIProject(page,before);
  });

  test('TC-195 [R] Desplazar Gastos y colapsar navegación conserva cabecera, filtros, accesos y datos con movimiento reducido', async ({ page, scrollProject:before }, info) => {
    await page.setViewportSize({width:1366,height:768});
    await page.emulateMedia({reducedMotion:'reduce'});
    await goTo(page,'gastos');
    expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    expect(await page.evaluate(()=>window.KASHVisualEffects.reducedMotion())).toBe(true);
    const transitionMs=await saveButton(page).evaluate(el=>getComputedStyle(el).transitionDuration.split(',')
      .map(value=>parseFloat(value)*(value.trim().endsWith('ms')?1:1000)));
    // CSS puede usar una duración prácticamente nula para conservar eventos de finalización.
    expect(Math.max(...transitionMs),'Transiciones reducidas a un máximo de 1 ms').toBeLessThanOrEqual(1);
    const beforeHead=await box(page.locator('.kashPageHeader'));
    const view=await box(page.locator('#v'));
    // Apuntar al margen de contenido evita que la tabla consuma el gesto en su scroll propio.
    await page.mouse.move(view.x+6,650); await page.mouse.wheel(0,900);
    await expect.poll(()=>page.evaluate(()=>scrollY+document.getElementById('v').scrollTop)).toBeGreaterThan(0);
    const head=await box(page.locator('.kashPageHeader'));
    expect(Math.abs(head.y-beforeHead.y),'Cabecera fija durante el scroll').toBeLessThanOrEqual(2);
    const filters=await box(page.locator('.expenseFiltersBar'));
    expect(filters.y,'Filtros debajo de cabecera').toBeGreaterThanOrEqual(head.bottom-2);
    await setCollapsedNavigation(page,true);
    const collapsed=await headerGeometry(page), nav=await box(page.locator('#nav'));
    expect(collapsed.header.x).toBeGreaterThanOrEqual(nav.right-2);
    await noDocumentOverflow(page);
    await unchangedUIProject(page,before);
    const accessibleMatches={};
    for(const section of ['res','grid','fx','gastos','cu'])
      accessibleMatches[section]=await page.locator('#nav .navPrimary').getByRole('button',{name:navigation.en[section],exact:true}).count();
    const buttons=await page.locator('#nav .navPrimary button').evaluateAll(nodes=>nodes.map(el=>({
      text:el.textContent.trim(),ariaLabel:el.getAttribute('aria-label'),
      labelVisible:!!el.querySelector('.lbl')?.getClientRects().length,
    })));
    measurementsByPage.get(page).push({kind:'collapsed-navigation',accessibleMatches,buttons,transitionMs,header:collapsed,nav});
    await info.attach('ui-collapsed-navigation',{body:await page.screenshot(),contentType:'image/png'});
    expect.soft(accessibleMatches,'El menú con iconos debe conservar nombres accesibles para sus cinco secciones')
      .toEqual({res:1,grid:1,fx:1,gastos:1,cu:1});
    // Continuar los checks de datos aunque se detecten nombres ausentes; no cambiar la app.
    await setCollapsedNavigation(page,false);
    await openSummary(page,uiMonth); await expectSummaryCard(page,'ARS','ARS 975','ARS 890');
  });
});
