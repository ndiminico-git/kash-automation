/* v0.690: derived closing reminders and explicit persistence feedback. */
(() => {
'use strict';
const t=s=>KashI18n.text(s), escape=s=>esc(String(s??''));
const closeIcon='<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
let dialogFocus=null,dialogProject=null,saveSnapshot=null,lastSaved=null,copyRecords=[],errorInfo=null,closingState=null;
function closeDialog(){document.getElementById('kashSafetyDialog')?.remove();dialogProject=null;closingState=null;if(dialogFocus?.isConnected)dialogFocus.focus({preventScroll:true})}
function dialog(title,subtitle,html){
 if(!document.getElementById('kashSafetyDialog'))dialogFocus=document.activeElement;
 document.getElementById('kashSafetyDialog')?.remove();dialogProject=D;
 const overlay=document.createElement('div');overlay.id='kashSafetyDialog';overlay.className='kashSafetyOverlay';
 overlay.innerHTML='<section class="kashSafetyBox" role="dialog" aria-modal="true" aria-labelledby="kashSafetyTitle"><header><div><h3 id="kashSafetyTitle">'+escape(title)+'</h3><p>'+escape(subtitle)+'</p></div><button type="button" class="kashSafetyClose" aria-label="'+t('Cerrar')+'">'+closeIcon+'</button></header><div class="kashSafetyBody">'+html+'</div></section>';
 document.body.append(overlay);overlay.querySelector('.kashSafetyClose').onclick=closeDialog;
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeDialog()}if(e.key==='Tab'){const xs=[...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select,textarea,[href]')].filter(x=>x.offsetParent);if(!xs.length)return;const first=xs[0],last=xs.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 overlay.querySelector('.kashSafetyClose').focus();return overlay;
}
function closingLabel(month){return new Date(month+'-15T12:00:00').toLocaleDateString(KashI18n.locale(),{month:'long',year:'numeric'})}
function closeCurrencies(month){
 if(!D||!serviceValidMonth(month)||month<D.inicio)return [];
 return CURRENCIES.filter(c=>currencyActivity(c,month)||currencyRealConfirmed(c,month)||currencyRealConfirmed(c,add(month,-1)));
}
function closingRecords(now=serviceToday()){
 if(!D||!serviceValidMonth(D.inicio)||!serviceValidDate(now))return [];
 const last=add(now.slice(0,7),-1);if(last<D.inicio)return [];
 return allMonths(D.inicio,last).map(month=>{const currencies=closeCurrencies(month),done=currencies.filter(c=>currencyRealConfirmed(c,month)).length;return {month,currencies,done,complete:done===currencies.length,read:!!D.monthlyCloseRead?.[month]}}).filter(r=>r.currencies.length);
}
// History is reviewable in the dialog; only the last finished month is a reminder.
function closingReminderRecords(now=serviceToday()){
 if(!D||!serviceValidMonth(D.inicio)||!serviceValidDate(now))return [];
 const month=add(now.slice(0,7),-1);if(month<D.inicio)return [];
 const currencies=closeCurrencies(month);if(!currencies.length)return [];
 const done=currencies.filter(c=>currencyRealConfirmed(c,month)).length;
 return [{month,currencies,done,complete:done===currencies.length,read:!!D.monthlyCloseRead?.[month]}];
}
function safeSuggestion(code,month){
 const previous=add(month,-1);if(previous<D.inicio||!currencyRealConfirmed(code,previous))return null;
 const inMonth=f=>String(f||'').slice(0,7)===month;
 // Include unpaid, zero-valued entered items and manual adjustments: no activity means none.
 if((D.rub||[]).some(r=>r.m===code&&Object.entries(D.C||{}).some(([k,c])=>k.startsWith(r.id+'|')&&inMonth(k.split('|')[1])&&(num(c.a)!==0||!!c.n||!!c.p))))return null;
 if((D.fx||[]).some(x=>inMonth(x.f)&&(x.m===code||x.m2===code))||(D.tenAdjustments||[]).some(x=>x.m===code&&inMonth(x.f))||(D.expenses||[]).some(x=>x.m===code&&inMonth(x.f)))return null;
 if(code==='ARS'&&num(D.inv?.[month])!==num(D.inv?.[previous]))return null;
 const prior=num(currencyRealValues(code)[previous]),calculated=calculatedCurrencyBalance(code,month),estimated=estimatedCurrencyBalance(code,month);
 return Math.abs(prior-calculated)<1e-8&&Math.abs(prior-estimated)<1e-8?{amount:prior,month:previous}:null;
}
function markClosingRead(month,value=true){if(!closingRecords().some(r=>r.month===month))return;D.monthlyCloseRead={...(D.monthlyCloseRead||{}),[month]:!!value};commit()}
function openClosing(month,feedback=''){
 if(!closingState||closingState.project!==D)closingState={project:D,drafts:new Map(),lastCurrency:null};
 const records=closingRecords();let record=records.find(r=>r.month===month)||closingReminderRecords()[0]||records.at(-1);
 if(!record){dialog(t('Cierre mensual'),t('El aviso aparece al terminar un mes del proyecto.'),'<p>'+t('No hay períodos finalizados para revisar.')+'</p>');return}
 month=record.month;
 const html='<label class="kashSafetyPeriod">'+t('Período')+'<select id="kashClosingPeriod">'+records.slice().reverse().map(r=>'<option value="'+r.month+'" '+(r.month===month?'selected':'')+'>'+escape(closingLabel(r.month))+' · '+r.done+'/'+r.currencies.length+'</option>').join('')+'</select></label><p class="kashClosingProgress">'+record.done+'/'+record.currencies.length+' · '+t(record.complete?'Completado':'Pendiente de confirmar')+'</p><p>'+t('Registrá el dinero real al terminar el mes. Leer el aviso no confirma los saldos.')+'</p><div class="kashClosingRows">'+record.currencies.map(code=>{
  const done=currencyRealConfirmed(code,month),suggestion=done?null:safeSuggestion(code,month),value=done?num(currencyRealValues(code)[month]):suggestion?.amount;
  return '<section class="kashClosingRow" data-closing-currency="'+code+'"><h4>'+currencyFlag(code,'small')+code+' <small>'+t(done?'Confirmado':'Pendiente')+'</small></h4><div class="kashClosingFigures"><span>'+t('Tenencia calculada')+'<b>'+escape(fmt(calculatedCurrencyBalance(code,month),code))+'</b></span><span>'+t('Remanente estimado')+'<b class="'+moneyStateClass(estimatedCurrencyBalance(code,month))+'">'+escape(fmt(estimatedCurrencyBalance(code,month),code))+'</b></span></div><label>'+t('Saldo comprobado')+'<input id="closing-'+code+'" inputmode="decimal" data-numeric="1" type="text" aria-label="'+escape(t('Saldo comprobado')+' '+code)+'" value="'+(value===undefined?'':escape(value.toLocaleString(KashI18n.locale(),{useGrouping:false,maximumFractionDigits:20})))+'" placeholder="'+t('Ingresá un importe; cero es válido')+'"></label>'+(suggestion?'<p class="kashSuggestion">'+t('Precargado del saldo comprobado de ')+escape(closingLabel(suggestion.month))+t('. Sin actividad ni variación. Revisá y confirmá.')+'</p>':'')+'<button type="button" class="btn" data-confirm-closing="'+code+'">'+t(done?'Actualizar saldo':'Confirmar saldo')+'</button><p class="kashClosingError" role="alert" hidden></p></section>';
 }).join('')+'</div><div class="kashSafetyActions"><button class="btn g" id="kashClosingRead">'+t(record.read?'Marcar sin leer':'Marcar como leído')+'</button><button class="btn g" id="kashClosingGrid">'+t('Ver en Consumos')+'</button></div>';
 const el=dialog(t('Cierre mensual')+' · '+closingLabel(month),t('El cierre se completa al confirmar todas las monedas.'),html);
 const status=document.createElement('div');status.id='kashClosingFeedback';status.className='kashClosingFeedback';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 el.querySelector('.kashClosingProgress').after(status);
 const readState=document.createElement('p');readState.className='kashClosingReadState';readState.textContent=t(record.read?'Aviso leído':'Aviso sin leer')+' · '+t(record.complete?'Cierre completado':'El cierre sigue pendiente');status.before(readState);
 status.textContent=feedback;status.hidden=!feedback;
 for(const code of record.currencies){const input=el.querySelector('#closing-'+code),key=month+'|'+code;if(closingState.drafts.has(key))input.value=closingState.drafts.get(key);input.addEventListener('input',()=>{closingState.drafts.set(key,input.value);closingState.lastCurrency=code})}
 el.querySelector('#kashClosingPeriod').onchange=e=>openClosing(e.target.value);
 el.querySelector('#kashClosingRead').onclick=()=>{markClosingRead(month,!record.read);openClosing(month,t(record.read?'Aviso marcado como sin leer.':'Aviso marcado como leído.')+' '+t(record.complete?'Cierre completado.':'Esto no confirma los saldos pendientes.'))};
 el.querySelector('#kashClosingGrid').onclick=()=>{const target=closingState?.lastCurrency||record.currencies.find(c=>!currencyRealConfirmed(c,month))||record.currencies[0];closeDialog();closeServiceNotifications();S.cur='grid';S.gridI=month;render();const cell=document.querySelector('[data-real-currency="'+target+'"][data-month="'+month+'"]');cell?.scrollIntoView({block:'center',inline:'center'});if(cell)selectRealCell(month,cell)};
 el.querySelectorAll('[data-confirm-closing]').forEach(button=>button.onclick=()=>{
  const code=button.dataset.confirmClosing,input=el.querySelector('#closing-'+code),raw=input.value.trim(),amount=KashI18n.numberInput(raw),error=button.parentElement.querySelector('[role=alert]');
  if(!raw||!/[0-9]/.test(raw)||!Number.isFinite(amount)){error.hidden=false;error.textContent=t('Ingresá un importe válido. Cero también confirma un saldo.');input.focus();return}
  setCurrencyRealValue(code,month,raw);closingState.drafts.delete(month+'|'+code);closingState.lastCurrency=code;commit();openClosing(month,t('Saldo actualizado en Consumos')+' · '+closingLabel(month)+' · '+fmt(currencyRealValues(code)[month],code)+'. '+t('Cambios pendientes de guardar en el archivo .kash.'));
 });
}
function closingNoticesHtml(){
 const filter=serviceNoticeFilter();if(filter==='due')return '';
 return closingReminderRecords().filter(r=>filter!=='unread'||(!r.read&&!r.complete)).map(r=>'<article class="serviceNotice kashClosingNotice '+(!r.read&&!r.complete?'unread':'')+'"><strong>'+t('Cierre mensual')+' · '+escape(closingLabel(r.month))+'</strong><p>'+r.done+'/'+r.currencies.length+' · '+t(r.complete?'Completado':'Saldos reales pendientes')+'</p><div class="serviceNoticeActions"><button class="btn g" onclick="KashSafety.openClosing(\''+r.month+'\')">'+t(r.complete?'Revisar cierre':'Completar cierre')+'</button><button class="btn g" onclick="KashSafety.markRead(\''+r.month+'\','+!r.read+')">'+t(r.read?'Marcar sin leer':'Marcar como leído')+'</button></div></article>').join('');
}
const oldUnread=window.serviceUnreadCount;window.serviceUnreadCount=()=>oldUnread()+closingReminderRecords().filter(r=>!r.read&&!r.complete).length;
const oldNotices=window.serviceNotificationListHtml;window.serviceNotificationListHtml=function(){const closing=closingNoticesHtml(),other=oldNotices();return closing+(closing&&other.includes('class="serviceNoticeEmpty"')?'':other)};
const oldReadAll=window.readAllServiceNotices;window.readAllServiceNotices=function(){const pending=closingReminderRecords().filter(r=>!r.read);if(pending.length){D.monthlyCloseRead={...(D.monthlyCloseRead||{})};for(const r of pending)D.monthlyCloseRead[r.month]=true;commit()}oldReadAll()};
function paintSummaryNotice(){
 document.getElementById('kashClosingSummary')?.remove();if(!D||S.cur!=='res')return;
 const record=closingReminderRecords().find(r=>!r.complete);if(!record)return;
 const banner=document.createElement('aside');banner.id='kashClosingSummary';banner.className='kashClosingSummary';
 banner.innerHTML='<div><strong>'+t('Cierre mensual pendiente')+' · '+escape(closingLabel(record.month))+'</strong><span>'+record.done+'/'+record.currencies.length+' · '+t(record.read?'Aviso leído · Saldos pendientes de confirmar':'Confirmá los saldos reales al finalizar el mes.')+'</span></div><button class="btn g">'+t('Completar cierre')+'</button>';
 banner.querySelector('button').onclick=()=>openClosing(record.month);document.querySelector('.summaryMainCol')?.prepend(banner);
}
function openCopies(){
 const el=dialog(t('Copias y recuperación'),t('Se conserva el archivo anterior en cada guardado: hasta 10 copias por proyecto.'),'<p>'+t('Consultando copias...')+'</p>');
 if(H)H.postMessage('storage|list');else el.querySelector('.kashSafetyBody').textContent=t('Disponible al ejecutar KA$H desde PowerShell.');
}
function showCopies(message){
 copyRecords=message.copies||[];
 const el=dialog(t('Copias y recuperación'),t('Recuperar crea un archivo independiente y conserva el proyecto abierto.'),'<p>'+t('Se conserva el archivo anterior en cada guardado: hasta 10 copias por proyecto.')+'</p>'+(copyRecords.length?'<div class="kashCopies">'+copyRecords.map((copy,i)=>'<section class="kashCopy"><strong>'+escape(marketDateLabel(copy.created))+'</strong><p>'+ (copy.valid?escape(copy.services+' '+t('servicios')+' · '+copy.expenses+' '+t('gastos')+' · '+copy.currencies.join(', ')+' · '+t('Inicio')+': '+copy.start):t('Copia incompleta o inválida. No se puede recuperar.'))+'</p><button class="btn g" data-recover-copy="'+i+'" '+(copy.valid?'':'disabled')+'>'+t('Recuperar como archivo independiente')+'</button></section>').join('')+'</div>':'<p>'+t(message.hasPath?'Todavía no hay copias. Se crea una versión del archivo anterior al volver a guardar.':'Guardá primero el proyecto como archivo .kash.')+'</p>'));
 el.querySelectorAll('[data-recover-copy]').forEach(button=>button.onclick=()=>{const copy=copyRecords[Number(button.dataset.recoverCopy)];if(copy?.valid)H?.postMessage('storage|recover|'+copy.id)});
}
function errorDialog(info){
 const operation=info.operation||'action',saveError=['save','draft'].includes(operation);
 errorInfo={operation,code:info.code||'JavaScriptError',lastSaved:info.lastSaved||lastSaved};
 const description=operation==='draft'?t('No se pudo actualizar la copia de sesión. Los cambios siguen pendientes en la app.'):saveError?t('No se pudo guardar el archivo. Los cambios siguen pendientes en la app.'):t('No se pudo completar la acción.');
 const details='KA$H 0.690\n'+t('Operación')+': '+operation+'\n'+t('Detalle')+': '+errorInfo.code+'\n'+t('Último guardado confirmado')+': '+(errorInfo.lastSaved?marketDateLabel(errorInfo.lastSaved):t('Sin confirmación en esta sesión'));
 const el=dialog(t('No se pudo completar la acción'),description,'<p>'+t('Último guardado confirmado')+': <strong>'+escape(errorInfo.lastSaved?marketDateLabel(errorInfo.lastSaved):t('Sin confirmación en esta sesión'))+'</strong></p><p>'+t('La copia de sesión no equivale a guardar el archivo .kash.')+'</p><details><summary>'+t('Detalles del error')+'</summary><textarea id="kashErrorDetails" readonly aria-label="'+t('Detalles del error')+'">'+escape(details)+'</textarea></details><p id="kashErrorFeedback" role="status"></p><div class="kashSafetyActions">'+(saveError?'<button class="btn" id="kashRetry">'+t('Reintentar')+'</button><button class="btn g" id="kashSaveElsewhere">'+t('Guardar como...')+'</button>':'')+'<button class="btn g" id="kashCopyDetails">'+t('Copiar detalles')+'</button></div>');
 el.querySelector('#kashRetry')?.addEventListener('click',()=>{closeDialog();if(operation==='draft')sendNow();else saveProject(false)});
 el.querySelector('#kashSaveElsewhere')?.addEventListener('click',()=>{closeDialog();saveProject(true)});
 el.querySelector('#kashCopyDetails').onclick=async()=>{try{await navigator.clipboard.writeText(details);el.querySelector('#kashErrorFeedback').textContent=t('Detalles copiados.')}catch{const area=el.querySelector('textarea');area.closest('details').open=true;area.focus();area.select();el.querySelector('#kashErrorFeedback').textContent=t('Presioná Ctrl+C para copiar los detalles.')}};
}
const oldSaveProject=window.saveProject;window.saveProject=function(as=false){saveSnapshot=JSON.stringify(D);return oldSaveProject(as)};
const oldHost=window.hostEvent;window.hostEvent=function(event){
 let p=event;try{if(typeof p==='string')p=JSON.parse(p)}catch{return oldHost.apply(this,arguments)}
 if(p?.type==='persistenceError'){pendingProjectAction=null;saveSnapshot=null;if(['save','draft'].includes(p.operation))S.dirty=true;errorDialog(p);return}
 if(p?.type==='error'){pendingProjectAction=null;saveSnapshot=null;errorDialog({operation:'action',code:'HostError'});return}
 if(p?.type==='recoveryCopies'){showCopies(p);return}
 if(p?.type==='copyRecovered'){dialog(t('Copia recuperada'),t('Se creó un archivo independiente.'),'<p>'+t('El proyecto abierto y sus cambios continúan igual. Usá Abrir proyecto para revisar el archivo recuperado.')+'</p>');return}
 if(['projectSaved','saved'].includes(p?.type)&&p.savedHash){
  const projectAtSave=D,captured=JSON.stringify(D),expected=p.savedHash.toLowerCase();
  return crypto.subtle.digest('SHA-256',new TextEncoder().encode(captured)).then(bytes=>{
   if(D!==projectAtSave)return;
   const actual=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
   lastSaved=p.savedAt||new Date().toISOString();saveSnapshot=null;
   if(actual!==expected||captured!==JSON.stringify(D)){pendingProjectAction=null;S.dirty=true;msg(t('Cambios sin guardar'));renderNavOnly();return}
   return oldHost.call(this,p);
  }).catch(()=>{pendingProjectAction=null;S.dirty=true;msg(t('Cambios sin guardar'))});
 }
 if(['initial','projectLoaded','newProject'].includes(p?.type)){closeDialog();lastSaved=null;saveSnapshot=null}
 const stale=['projectSaved','saved'].includes(p?.type)&&saveSnapshot!==null&&saveSnapshot!==JSON.stringify(D);
 if(stale)pendingProjectAction=null;
 const result=oldHost.apply(this,arguments);
 if(['projectSaved','saved'].includes(p?.type)){lastSaved=p.savedAt||new Date().toISOString();saveSnapshot=null;if(stale){S.dirty=true;msg(t('Cambios sin guardar'));renderNavOnly()}}
 return result;
};
window.addEventListener('error',()=>errorDialog({operation:'action',code:'JavaScriptError'}));
window.addEventListener('unhandledrejection',()=>errorDialog({operation:'action',code:'UnhandledPromiseRejection'}));
const oldRender=window.render;window.render=function(){if(dialogProject&&dialogProject!==D)closeDialog();const result=oldRender.apply(this,arguments);paintSummaryNotice();if(S.cur==='set'){
 const area=document.querySelector('.kashSettingsShell');if(area&&!document.getElementById('kashRecoveryAccess')){const section=document.createElement('div');section.id='kashRecoveryAccess';section.className='kashRecoveryAccess';section.innerHTML='<button class="btn g">'+t('Copias y recuperación')+'</button><span>'+t('Versiones anteriores del archivo .kash; la sesión se guarda por separado.')+'</span>';section.querySelector('button').onclick=openCopies;area.append(section)}
 }return result};
window.KashSafety={openClosing,markRead:markClosingRead,records:closingRecords,reminders:closingReminderRecords,suggestion:safeSuggestion,openCopies,close:closeDialog,showError:errorDialog};
render();
})();
