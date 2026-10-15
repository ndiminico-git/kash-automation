// Tanda 2: presentation only. Existing controls keep their handlers and data.
(function(){
'use strict';
function summaryZoom(){const dash=document.querySelector('#v .summaryDashboard');if(dash){dash.style.zoom=String(currentZoom());syncSummarySideColumn()}}
function headerWidth(){const view=document.getElementById('v'),head=view?.querySelector('.kashPageHeader');if(!head)return;const style=getComputedStyle(view),padding=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight),left=Math.max(view.getBoundingClientRect().left,S.navCollapsed?72:248),width=Math.max(0,Math.floor(Math.min(view.clientWidth-padding,document.documentElement.clientWidth-left-padding))),value=width+'px';if(head.style.width!==value)head.style.width=value}
function summaryPeriodLabels(){const select=document.querySelector('#v .summaryPeriodNav .summaryPeriodSelect.period');if(!select)return;for(const option of select.options){const month=Number(option.value);if(month>=1&&month<=12)option.textContent=MN[month-1]}select.setAttribute('aria-label','Mes del resumen')}
function helpAppearance(button){if(!button)return;button.innerHTML='<span class="kashHelpGlyph" aria-hidden="true">?</span><span>Ayuda</span><kbd>F1</kbd>';button.setAttribute('aria-label','Ayuda de KASH, F1')}
function decorateKash(){
 const view=document.getElementById('v');if(!view)return;
 document.body.classList.toggle('kashModern',!!D);
 const help=view.querySelector('.kashHelpButton');helpAppearance(help);
 if(!D||view.querySelector('.kashPageHeader'))return;
 let title;
 if(S.cur==='res'){
  const h=view.querySelector('.summaryTitleBlock>h2');if(!h)return;
  h.textContent='Resumen';title=document.createElement('div');title.className='kashSummaryHeading';
  const icon=document.createElement('span');icon.className='kashTitleIcon';icon.innerHTML=navIcon('res');title.append(icon,h);
 }else title=view.querySelector(S.cur==='grid'?'.gridTitle':S.cur==='set'?'.settingsPageHeader':'.pageHeadingRow');
 if(!title)return;
 if(S.cur==='grid'){const icon=document.createElement('span');icon.className='kashTitleIcon';icon.innerHTML=navIcon('grid');title.prepend(icon)}
 const header=document.createElement('header');header.className='kashPageHeader';
 title.classList.add('kashPageTitle');
 const tools=document.createElement('div');tools.className='kashPageTools';tools.setAttribute('aria-label','Zoom y Ayuda');
 let zoom=view.querySelector('.zoomControls');
 if(!zoom){const holder=document.createElement('div');holder.innerHTML=zoomControlsHtml();zoom=holder.firstElementChild}
 if(zoom){zoom.querySelectorAll('button').forEach((b,i)=>{b.type='button';b.setAttribute('aria-label',i?'Acercar esta sección':'Alejar esta sección');b.disabled=S.cur!=='res'&&!view.querySelector('.zoomable')});tools.append(zoom)}
 const helpWrapper=help?.closest('.kashPageHelp');if(help)tools.append(help);helpWrapper?.remove();
 const oldZoom=view.querySelector('#zoomCtl');if(oldZoom&&!oldZoom.children.length)oldZoom.remove();
 header.append(title,tools);view.prepend(header);
 const currencies=view.querySelector('.enabledCurrenciesPanel .sub');if(currencies)currencies.textContent='Al menos una moneda activa.';
 summaryPeriodLabels();headerWidth();summaryZoom();
}
const original=window.render;window.render=function(){const result=original.apply(this,arguments);decorateKash();return result};
const zoom=window.setGridZoom;window.setGridZoom=function(){const result=zoom.apply(this,arguments);if(S.cur==='res')summaryZoom();return result};
window.addEventListener('resize',()=>{headerWidth();if(S.cur==='res')summaryZoom()});
if(window.ResizeObserver){const observer=new ResizeObserver(headerWidth);for(const id of ['nav','v']){const el=document.getElementById(id);if(el)observer.observe(el)}}
decorateKash();
})();
