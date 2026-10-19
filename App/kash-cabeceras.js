/* Monthly layout is presentation state; it never writes to D. */
function refreshMonthlyGridLayout(){
 const view=document.getElementById('v'),grid=document.getElementById('gw');if(!view||S.cur!=='grid'||!grid)return;
 const head=view.querySelector('.kashPageHeader'),headerHeight=head?head.getBoundingClientRect().height:70;
 grid.style.setProperty('--kash-grid-max-height',Math.max(160,innerHeight-headerHeight-(view.querySelector('#kashGridSelectionBar')?.getBoundingClientRect().height||0)-70)+'px');
 const font=parseFloat(getComputedStyle(grid).getPropertyValue('--gridValueFontPx'))||11.5;
 grid.style.setProperty('--kash-month-min-width',((S.rubroColWidth||300)+12*Math.ceil(136*font/11.5))+'px');
 grid.setAttribute('role','region');grid.setAttribute('aria-label',KashI18n.text('Consumos Mensuales'));
 const current=currentGridPeriod();for(const table of view.querySelectorAll('.monthtable')){
  const heads=[...table.querySelectorAll('tr:first-child th')],column=heads.findIndex(th=>th.dataset.period===current);
  for(const row of table.rows)for(const cell of row.cells)cell.classList.toggle('currentMonthColumn',column>=0&&cell.cellIndex===column&&row.cells.length===heads.length);
 }
 grid.kashProject=D;
}
/* v0.665: reuse existing controls; pin the section chrome without changing D. */
(function(){
'use strict';
let observer=null;
function cssValue(el,key,value){if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value)}
function offsets(){
 const view=document.getElementById('v'),header=view?.querySelector('.kashPageHeader');if(!header)return;
 const inset=getComputedStyle(view);
 cssValue(view,'--kash-page-left',inset.paddingLeft);
 cssValue(view,'--kash-page-right',inset.paddingRight);
 const quotes=header.querySelector('.kashHeaderQuotes');
 header.classList.toggle('kashQuotesStacked',!!quotes&&header.clientWidth<1200);
 const height=Math.ceil(header.getBoundingClientRect().height);
 cssValue(view,'--kash-header-height',height+'px');
 cssValue(document.documentElement,'--kash-header-height',height+'px');
 const filters=view.querySelector('.expenseSearchBar');
 cssValue(view,'--kash-filter-height',(filters?Math.ceil(filters.getBoundingClientRect().height):0)+'px');
 refreshMonthlyGridLayout();
}
function pinSection(){
 observer?.disconnect();observer=null;
 const view=document.getElementById('v'),header=view?.querySelector('.kashPageHeader');
 if(!D||!header){document.documentElement.style.removeProperty('--kash-header-height');return}
 header.dataset.kashSection=S.cur;
 const tools=header.querySelector('.kashPageTools');
 if(S.cur==='grid'){
  const selection=view.querySelector('#kashGridSelectionBar');if(selection)header.after(selection);
  const nav=view.querySelector('.monthNav');
  if(nav){nav.querySelector('.marketTicker')?.remove();header.insertBefore(nav,tools)}
 }
 if(S.cur==='res'){
  const period=view.querySelector('.summaryPeriodNav');if(period)header.insertBefore(period,tools);
  const empty=view.querySelector('.summaryHeaderWide');if(empty&&!empty.textContent.trim()&&!empty.querySelector('input,button,select'))empty.remove();
 }
 if(S.cur==='fx'){
  const html=marketTickerHtml(true);if(html){const quotes=document.createElement('div');quotes.className='kashHeaderQuotes';quotes.setAttribute('aria-label',KashI18n.text('Cotizaciones de referencia'));quotes.innerHTML=html;header.insertBefore(quotes,tools);quotes.querySelector('.tickerRefresh')?.setAttribute('aria-label',KashI18n.text('Actualizar cotizaciones'))}
 }
 if(S.cur==='gastos')for(const panel of view.querySelectorAll('.mockExpenseFormPanel')){
  if(panel.parentElement.classList.contains('kashExpenseEntry'))continue;
  const strip=document.createElement('div');strip.className='kashExpenseEntry';panel.before(strip);strip.append(panel);
 }
 offsets();
 if(window.ResizeObserver){observer=new ResizeObserver(offsets);observer.observe(header);const selection=view.querySelector('#kashGridSelectionBar');if(selection)observer.observe(selection);const filters=view.querySelector('.expenseSearchBar');if(filters)observer.observe(filters)}
}
const original=window.render;window.render=function(){const oldGrid=document.getElementById('gw'),period=oldGrid?.querySelector('th[data-period]')?.dataset.period?.slice(0,4),keep=oldGrid&&oldGrid.kashProject===D&&S.cur==='grid'&&period===String(S.gridI).slice(0,4)?{top:oldGrid.scrollTop,left:oldGrid.scrollLeft}:null;const result=original.apply(this,arguments);pinSection();if(keep){const grid=document.getElementById('gw');if(grid){grid.scrollTop=keep.top;grid.scrollLeft=keep.left}}return result};
window.addEventListener('resize',offsets);
pinSection();
})();
