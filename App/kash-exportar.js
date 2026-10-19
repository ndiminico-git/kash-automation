// Exports are read-only views. Use the existing filters and balance engine.
(function(){
'use strict';
const tr=s=>KashI18n.text(s),own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
let dialog=null,sequence=0;
function exportIcon(print=false){return print?'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/></svg>'}
function expenseRows(){
 const order=new Map(expenseFilterCurrencies().map((c,i)=>[c,i]));
 return (D.expenses||[]).filter(expenseRecordMatches).slice().sort((a,b)=>(order.get(a.m)??999)-(order.get(b.m)??999)||String(b.f||'').localeCompare(String(a.f||''))||(Number(b.id)||0)-(Number(a.id)||0));
}
function monthsForYear(year){return Array.from({length:12},(_,i)=>year+'-'+String(i+1).padStart(2,'0')).filter(m=>m>=D.inicio)}
function amount(value){return Number.isFinite(Number(value))?Number(value):0}
function csvText(value){let text=String(value??'');if(/^[\s\u0000-\u001f]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'}
function csvNumber(value){if(!Number.isFinite(value))throw new Error('Non-finite export amount');const text=String(Object.is(value,-0)?0:value);return KashI18n.language==='en'?text:text.replace('.',',')}
function serialize(headers,rows){return [headers.map(csvText).join(';'),...rows.map(row=>row.map(value=>typeof value==='number'?csvNumber(value):csvText(value)).join(';'))].join('\r\n')+'\r\n'}
function makeCsv(kind,content='detail'){
 if(!D)return null;
 let headers,rows,filename,scope;
 if(kind==='expenses'){
  const xs=expenseRows();headers=['Fecha','Concepto','Moneda','Importe','Estado','Notas'].map(tr);rows=xs.map(x=>[String(x.f||''),String(x.c||''),x.m,amount(x.a),tr(x.paid?'Pagado':'Pendiente'),String(x.n||'')]);
  filename='KASH_Gastos_'+(S.expensePeriod||'todos')+'_'+(S.expenseCurrency||'monedas')+'.csv';
  scope=[xs.length+' '+tr('resultados'),S.expensePeriod?expenseMonthLabel(S.expensePeriod):tr('Todos los períodos'),S.expenseCurrency||tr('Todas las monedas'),S.expenseSearch?tr('Buscar por concepto')+': '+S.expenseSearch:''].filter(Boolean).join(' · ');
 }else{
  const year=String(S.gridI||S.i).slice(0,4),months=monthsForYear(year);rows=[];filename='KASH_Consumos_'+year+'_'+(content==='totals'?'totales':'detalle')+'.csv';
  scope=year+' · '+tr('Año completo')+' · '+tr(content==='totals'?'Totales y saldos por moneda':'Detalle mensual de servicios y gastos');
  if(content==='totals'){
   headers=['Período','Moneda','Ingresos','Egresos','Saldo mes anterior','Remanente estimado','Saldo comprobado','Tenencia calculada'].map(tr);
   const codes=months.length?totalsCurrencyCodes(months):[];
   for(const m of months)for(const c of codes)rows.push([m,c,sum(m,'i',c),sum(m,'e',c),estimatedCurrencyOpening(c,m),estimatedCurrencyBalance(c,m),currencyRealConfirmed(c,m)?amount(currencyRealValues(c)[m]):'',calculatedCurrencyBalance(c,m)]);
  }else{
   headers=['Período','Sección','Rubro','Servicio','Moneda','Importe','Estado','Notas'].map(tr);
   const rubros=(D.rub||[]).slice();
   for(const m of months)for(const r of rubros){if(!monthVisible(r,m))continue;const key=r.id+'|'+m,exists=own(D.C,key),c=cell(r.id,m);let status=exists?tr(c.p?'Pagado':'Pendiente'):tr('Sin carga');
    if(managedExpenseRubroIn(D,r)&&exists){const payment=expensePaymentStatusIn(D,r.m,m);status=tr(payment.complete?'Pagado':payment.rows.some(row=>row.paid)?'Parcial / pendiente':'Pendiente');}
    rows.push([m,tr(r.t==='i'?'Ingreso':'Egreso'),String(groupLabel(groupKey(r))||''),String(r.n||''),r.m,exists?amount(c.a):'',status,String(c.n||'')]);
   }
  }
 }
 return {kind,content,headers,rows,filename,scope,csv:serialize(headers,rows)};
}
function reportData(month){return {month,name:String(D.name||projectName||'KA$H'),currencies:totalsCurrencyCodes([month]).map(code=>({code,opening:estimatedCurrencyOpening(code,month),income:sum(month,'i',code),expense:sum(month,'e',code),holding:calculatedCurrencyBalance(code,month),estimate:estimatedCurrencyBalance(code,month),real:currencyRealConfirmed(code,month)?amount(currencyRealValues(code)[month]):null}))}}
function reportHtml(data){const field=(label,value,code,result=false)=>'<div class="kashPrintLine'+(result?' kashPrintResult':'')+'"><span>'+tr(label)+'</span><strong class="'+(value!==null&&value<0?'kashPrintNegative':'')+'"'+(value!==null?' data-export-value="'+value+'"':'')+'>'+(value===null?tr('Sin registrar'):esc(fmt(value,code)))+'</strong></div>';
 return '<article id="kashPrintSheet"><div class="kashPrintTop"><strong>KA$H</strong><span>'+tr('Resumen mensual')+'<br>'+esc(expenseMonthLabel(data.month))+'</span></div><h1>'+esc(expenseMonthLabel(data.month))+'</h1><p class="kashPrintProject">'+esc(data.name)+'</p><div class="kashPrintCurrencies">'+data.currencies.map(x=>'<section class="kashPrintCurrency"><h2>'+esc(x.code)+'</h2>'+field('Saldo mes anterior',x.opening,x.code)+field('Ingresos del mes',x.income,x.code)+field('Egresos del mes',x.expense,x.code)+field('Tenencia calculada',x.holding,x.code)+field('Remanente estimado',x.estimate,x.code,true)+field('Saldo comprobado',x.real,x.code)+'</section>').join('')+'</div><p class="kashPrintNote">'+tr('La tenencia calculada considera los movimientos confirmados. El remanente estimado incluye los gastos pendientes.')+'</p><footer>'+tr('Monedas por separado · sin conversión')+'</footer></article>';
}
function close(force=false){if(!dialog||dialog.busy&&!force)return;const anchor=dialog.anchor;document.getElementById('kashExportModal')?.remove();document.body.classList.remove('kashPrintReady');dialog=null;if(anchor?.isConnected)anchor.focus({preventScroll:true})}
function csvPreview(data){return '<div class="kashExportTableWrap"><table><thead><tr>'+data.headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+data.rows.slice(0,20).map(row=>'<tr>'+row.map(v=>'<td>'+esc(typeof v==='number'?csvNumber(v):v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="kashExportHint">'+tr('Vista previa de las primeras filas. El archivo incluye todos los resultados indicados.')+'</p>'}
function renderDialog(){
 const state=dialog;if(!state)return;let backdrop=document.getElementById('kashExportModal');if(!backdrop){backdrop=document.createElement('div');backdrop.id='kashExportModal';backdrop.className='kashExportBackdrop';document.body.appendChild(backdrop);backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});}
 const print=state.kind==='summary';document.body.classList.toggle('kashPrintReady',print);
 backdrop.innerHTML='<section class="kashExportDialog" role="dialog" aria-modal="true" aria-labelledby="kashExportTitle"><header><div><h2 id="kashExportTitle">'+tr(print?'Resumen mensual imprimible':'Exportar CSV')+'</h2><p class="kashExportScope">'+esc(print?expenseMonthLabel(state.report.month):state.data.scope)+'</p></div><button type="button" data-export-close aria-label="'+tr('Cerrar')+'" data-kash-close-icon><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>'+
 (!print&&state.kind==='monthly'?'<label class="kashExportContentLabel">'+tr('Contenido del CSV')+'<select id="kashExportContent"><option value="detail"'+(state.content==='detail'?' selected':'')+'>'+tr('Detalle mensual de servicios y gastos')+'</option><option value="totals"'+(state.content==='totals'?' selected':'')+'>'+tr('Totales y saldos por moneda')+'</option></select></label>':'')+
 '<div class="kashExportPreview">'+(print?reportHtml(state.report):'<div class="kashExportFilename">'+esc(state.data.filename)+'</div>'+csvPreview(state.data))+'</div><p id="kashExportStatus" role="status" aria-live="polite"></p><footer class="kashExportActions"><button type="button" class="btn g" data-export-close>'+tr('Cerrar')+'</button>'+(print?'<button type="button" class="btn g" data-export-kind="print">'+tr('Imprimir')+'</button><button type="button" class="btn" data-export-kind="pdf">'+tr('Guardar PDF')+'</button>':'<button type="button" class="btn" data-export-kind="csv"'+(!state.data.rows.length?' disabled':'')+'>'+tr('Guardar CSV')+'</button>')+'</footer></section>';
 backdrop.querySelectorAll('[data-export-close]').forEach(b=>b.onclick=()=>close());backdrop.querySelectorAll('[data-export-kind]').forEach(b=>b.onclick=()=>send(b.dataset.exportKind));
 const choice=backdrop.querySelector('#kashExportContent');if(choice)choice.onchange=()=>{state.content=choice.value;state.data=makeCsv('monthly',state.content);renderDialog();document.getElementById('kashExportContent')?.focus()};
}
function open(kind,anchor){if(!D)return;close();if(dialog)return;dialog={kind,project:D,anchor:anchor||document.activeElement,content:'detail',busy:false};if(kind==='summary')dialog.report=reportData(S.i);else dialog.data=makeCsv(kind);renderDialog();document.querySelector('#kashExportModal [data-export-close]')?.focus({preventScroll:true})}
function status(text,error=false){const el=document.getElementById('kashExportStatus');if(el){el.textContent=text;el.classList.toggle('kashExportError',error)}}
function send(kind){
 const state=dialog;if(!state||state.busy)return;if(state.project!==D){close(true);return}if(kind==='csv'&&!state.data.rows.length)return;
 const request={kind,id:String(Date.now())+'-'+(++sequence),filename:kind==='csv'?state.data.filename:'KASH_Resumen_'+state.report.month+'.pdf'};if(kind==='csv')request.csv=state.data.csv;else request.html=reportHtml(state.report);
 if(window.chrome?.webview){state.busy=true;state.requestId=request.id;document.querySelectorAll('#kashExportModal button,#kashExportModal select').forEach(b=>b.disabled=true);status(tr('Preparando archivo…'));try{window.chrome.webview.postMessage('export|'+JSON.stringify(request))}catch(error){receive({id:request.id,status:'error',message:String(error.message||error)})}}
 else if(kind==='csv'){const url=URL.createObjectURL(new Blob(['\uFEFF',state.data.csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=state.data.filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status(tr('Descarga solicitada.'))}
 else{window.print();}
}
function receive(result){if(!dialog||dialog.requestId!==result.id)return;dialog.busy=false;document.querySelectorAll('#kashExportModal button,#kashExportModal select').forEach(b=>b.disabled=false);status(result.status==='saved'?tr('Archivo guardado: ')+result.filename:result.status==='cancelled'?tr('Exportación cancelada.'):result.status==='opened'?tr('Diálogo de impresión abierto.'):result.message||tr('No se pudo exportar.'),result.status==='error');}
function decorate(){
 if(dialog&&(!D||dialog.project!==D))close(true);
 const tools=document.querySelector('#v .kashPageTools');if(!tools||!D)return;let button=tools.querySelector('.kashExportHeaderButton');tools.setAttribute('aria-label',tr('Herramientas de la vista'));
 const kind=S.cur==='gastos'?'expenses':S.cur==='grid'?'monthly':S.cur==='res'?'summary':null;
 if(!kind){button?.remove();return}if(!button){button=document.createElement('button');button.type='button';button.className='kashExportHeaderButton';tools.prepend(button)}
 button.innerHTML=exportIcon(kind==='summary')+'<span>'+tr(kind==='summary'?'Imprimir / PDF':'Exportar CSV')+'</span>';button.onclick=()=>open(kind,button);button.disabled=kind==='expenses'?!expenseRows().length:kind==='monthly'?!monthsForYear(String(S.gridI).slice(0,4)).length:false;
}
window.addEventListener('keydown',event=>{if(!dialog)return;event.stopImmediatePropagation();if(dialog.busy){event.preventDefault();return}if(event.key==='Escape'){event.preventDefault();close();return}if(event.key==='Tab'){const xs=[...document.querySelectorAll('#kashExportModal button:not(:disabled),#kashExportModal select:not(:disabled)')];if(!xs.length){event.preventDefault();return}const first=xs[0],last=xs.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}},true);
document.addEventListener('input',e=>{if(e.target.id==='expenseSearch')decorate()});document.addEventListener('change',e=>{if(['expensePeriodFilter','expenseCurrencyFilter'].includes(e.target.id))decorate()});
const originalHost=window.hostEvent;window.hostEvent=function(message){let data=message;try{if(typeof data==='string')data=JSON.parse(data)}catch{}if(data?.type==='exportResult'){receive(data);return}return originalHost.apply(this,arguments)};
window.KashExport={makeCsv,serialize,csvText,csvNumber,reportData,reportHtml,open,close,decorate,send};decorate();
})();
