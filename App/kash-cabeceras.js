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
}
function pinSection(){
 observer?.disconnect();observer=null;
 const view=document.getElementById('v'),header=view?.querySelector('.kashPageHeader');
 if(!D||!header){document.documentElement.style.removeProperty('--kash-header-height');return}
 header.dataset.kashSection=S.cur;
 const tools=header.querySelector('.kashPageTools');
 if(S.cur==='grid'){
  const nav=view.querySelector('.monthNav');
  if(nav){nav.querySelector('.marketTicker')?.remove();header.insertBefore(nav,tools)}
 }
 if(S.cur==='res'){
  const period=view.querySelector('.summaryPeriodNav');if(period)header.insertBefore(period,tools);
  const empty=view.querySelector('.summaryHeaderWide');if(empty&&!empty.textContent.trim()&&!empty.querySelector('input,button,select'))empty.remove();
 }
 if(S.cur==='fx'){
  const html=marketTickerHtml();if(html){const quotes=document.createElement('div');quotes.className='kashHeaderQuotes';quotes.setAttribute('aria-label','Cotizaciones de referencia');quotes.innerHTML=html;header.insertBefore(quotes,tools);quotes.querySelector('.tickerRefresh')?.setAttribute('aria-label','Actualizar cotizaciones')}
 }
 if(S.cur==='gastos')for(const panel of view.querySelectorAll('.mockExpenseFormPanel')){
  if(panel.parentElement.classList.contains('kashExpenseEntry'))continue;
  const strip=document.createElement('div');strip.className='kashExpenseEntry';panel.before(strip);strip.append(panel);
 }
 offsets();
 if(window.ResizeObserver){observer=new ResizeObserver(offsets);observer.observe(header);const filters=view.querySelector('.expenseSearchBar');if(filters)observer.observe(filters)}
}
const original=window.render;window.render=function(){const result=original.apply(this,arguments);pinSection();return result};
window.addEventListener('resize',offsets);
pinSection();
})();
