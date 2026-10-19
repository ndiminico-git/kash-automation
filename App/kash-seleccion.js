// Selection is a read-only view over existing month cells. The native active cell
// remains responsible for editing, payment controls, keyboard and clipboard.
(function(){
'use strict';
const tr=s=>KashI18n.text(s);
let project=null,scope='',keys=new Set(),anchor=null,keep=false,drag=null,suppressed=null,frame=0;
const grid=()=>document.getElementById('gw');
const nativeCell=()=>typeof currentGridSelection==='function'?currentGridSelection():null;
function eligible(td){return !!td?.matches('#gw tr.data-row td.c[data-key][data-editable="1"]')&&!td.classList.contains('hid')}
function find(key){return [...(grid()?.querySelectorAll('td[data-key]')||[])].find(td=>td.dataset.key===key)}
function rows(){return [...(grid()?.querySelectorAll('tr.data-row')||[])]}
function range(from,to,base=new Set()){
 const out=new Set(base),rs=rows(),a=rs.indexOf(from?.parentElement),b=rs.indexOf(to?.parentElement);
 if(a<0||b<0)return out;
 for(let i=Math.min(a,b);i<=Math.max(a,b);i++)for(let j=Math.min(from.cellIndex,to.cellIndex);j<=Math.max(from.cellIndex,to.cellIndex);j++){
  const td=rs[i].cells[j];if(eligible(td))out.add(td.dataset.key);
 }
 return out;
}
function snapshot(){
 const amounts=new Map(),cells=new Map([...(grid()?.querySelectorAll('td[data-key]')||[])].map(td=>[td.dataset.key,td])),items=new Map((D?.rub||[]).map(r=>[String(r.id),r]));let count=0;
 for(const key of keys){const td=cells.get(key);if(!eligible(td))continue;const record=D?.C?.[key];if(!Object.prototype.hasOwnProperty.call(D?.C||{},key)||!record)continue;
  const item=items.get(String(td.dataset.rid)),value=Number(record.a??0);if(!item||!Number.isFinite(value))continue;
  const group=amounts.get(item.m)||{currency:item.m,count:0,sum:0};group.count++;group.sum+=value;amounts.set(item.m,group);count++;
 }
 return {keys:[...keys],selected:keys.size,count,groups:[...amounts.values()]};
}
function paint(){
 const g=grid();if(!g)return;
 for(const td of g.querySelectorAll('td[data-key]')){
  const selected=keys.size>1&&keys.has(td.dataset.key)&&eligible(td);td.classList.toggle('kashRangeSelected',selected);
  if(selected)td.setAttribute('aria-selected','true');else if(!td.classList.contains('gridNavSelected'))td.removeAttribute('aria-selected');
 }
 let bar=document.getElementById('kashGridSelectionBar');
 if(!bar){bar=document.createElement('div');bar.id='kashGridSelectionBar';bar.className='kashGridSelectionBar';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite')}
 const head=document.querySelector('#v .kashPageHeader');if(head&&head.nextElementSibling!==bar)head.after(bar);else if(!bar.isConnected)g.parentElement.before(bar);
 const data=snapshot();bar.hidden=false;bar.setAttribute('aria-live',drag?.moved?'off':'polite');
 const content=document.createElement('div');content.className='kashGridSelectionContent';
 const title=document.createElement('span');title.className='kashGridSelectionTitle';title.textContent=tr('Suma de la selección');
 const groups=document.createElement('div');groups.className='kashGridSelectionGroups';
 for(const group of data.groups){const line=document.createElement('span'),sum=document.createElement('strong'),quantity=document.createElement('span');sum.textContent=fmt(group.sum,group.currency);sum.classList.toggle('negative',group.sum<0);quantity.textContent=tr('Cantidad')+': '+group.count;line.append(sum,quantity);groups.append(line)}
 if(!data.groups.length){const line=document.createElement('span'),sum=document.createElement('strong'),hint=document.createElement('span');sum.textContent='—';hint.textContent=tr(data.selected?'Sin importes cargados en la selección.':'Seleccioná importes para ver la suma.');line.append(sum,hint);groups.append(line)}
 content.append(title,groups);
 const actions=document.createElement('div');actions.className='kashGridSelectionActions';
 const count=document.createElement('span');count.textContent=data.selected+' '+tr(data.selected===1?'celda seleccionada':'celdas seleccionadas');
 const button=document.createElement('button');button.type='button';button.className='btn g';button.textContent=tr('Limpiar selección');button.disabled=!data.selected;button.onclick=()=>{clear();nativeCell()?.focus({preventScroll:true})};
 actions.append(count,button);bar.replaceChildren(content,actions);window.refreshMonthlyGridLayout?.();
}
function clear(){keys.clear();anchor=null;paint()}
function collapse(td=nativeCell()){keys=eligible(td)?new Set([td.dataset.key]):new Set();anchor=eligible(td)?td.dataset.key:null;paint()}
function onSelect(td){if(!keep)collapse(td)}
function selectNative(td){if(!td)return;keep=true;try{selectGridTd(td)}finally{keep=false}}
function decorate(){
 const next=D&&S.cur==='grid'?String(S.gridI).slice(0,4):'';
 if(project!==D||scope!==next){cancelDrag();keys.clear();anchor=null;project=D;scope=next}
 if(!next||!grid()){document.getElementById('kashGridSelectionBar')?.remove();return}
 if(drag&&!drag.start.isConnected)cancelDrag();
 keys=new Set([...keys].filter(k=>eligible(find(k))));paint();
}
function editing(td){collapse(td)}
function isControl(target){return !!target?.closest('input,textarea,select,button,a,.pk,.cellmarks,[contenteditable="true"]')}
function editingGrid(){return !!grid()?.querySelector('input,textarea,select,[contenteditable="true"]')}
document.addEventListener('pointerdown',event=>{
 suppressed=null;
 const td=event.target.closest?.('#gw td[data-key]');
 if(event.button!==0||event.pointerType==='touch'||!eligible(td)||isControl(event.target)||editingGrid())return;
 drag={id:event.pointerId,start:td,end:td,from:event.shiftKey&&find(anchor)?find(anchor):td,x:event.clientX,y:event.clientY,px:event.clientX,py:event.clientY,base:event.ctrlKey||event.metaKey?new Set(keys):new Set(),original:new Set(keys),moved:false};
 try{td.setPointerCapture(event.pointerId)}catch{}
},true);
function updateDrag(x,y){
 if(!drag)return;const g=grid();if(!g||!drag.start.isConnected){cancelDrag();return}
 const rect=g.getBoundingClientRect(),left=Math.max(rect.left,0),right=Math.min(rect.right,innerWidth);
 const header=Math.max(document.querySelector('.kashPageHeader')?.getBoundingClientRect().bottom||0,document.getElementById('kashGridSelectionBar')?.getBoundingClientRect().bottom||0);
 const px=Math.max(left+1,Math.min(x,right-2)),py=Math.max(header+2,Math.min(y,innerHeight-2));
 const td=document.elementFromPoint(px,py)?.closest('#gw tr.data-row td[data-key]');
 if(!td||!g.contains(td))return;
 if(!drag.moved){drag.moved=true;document.body.classList.add('kashGridRangeDragging');window.getSelection?.()?.removeAllRanges()}
 drag.end=td;keys=range(drag.from,td,drag.base);anchor=drag.from.dataset.key;paint();
}
function autoScroll(){
 if(!drag?.moved){frame=0;return}const g=grid();if(!g){cancelDrag();return}
 const rect=g.getBoundingClientRect(),header=Math.max(document.querySelector('.kashPageHeader')?.getBoundingClientRect().bottom||0,document.getElementById('kashGridSelectionBar')?.getBoundingClientRect().bottom||0);
 let moved=false;
 if(drag.py>innerHeight-28){window.scrollBy(0,12);moved=true}else if(drag.py<header+28){window.scrollBy(0,-12);moved=true}
 if(g.scrollWidth>g.clientWidth){if(drag.px>Math.min(rect.right,innerWidth)-25){g.scrollLeft+=12;moved=true}else if(drag.px<Math.max(rect.left,0)+25){g.scrollLeft-=12;moved=true}}
 if(moved)updateDrag(drag.px,drag.py);frame=requestAnimationFrame(autoScroll);
}
document.addEventListener('pointermove',event=>{
 if(!drag||event.pointerId!==drag.id)return;drag.px=event.clientX;drag.py=event.clientY;
 if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<5)return;
 event.preventDefault();updateDrag(event.clientX,event.clientY);if(drag?.moved&&!frame)frame=requestAnimationFrame(autoScroll);
},{capture:true,passive:false});
function finishDrag(event){
 if(!drag||event.pointerId!==drag.id)return;
 const item=drag;drag=null;cancelAnimationFrame(frame);frame=0;document.body.classList.remove('kashGridRangeDragging');
 if(item.moved){suppressed={grid:grid()};selectNative(item.end);paint()}
 try{item.start.releasePointerCapture(item.id)}catch{}
}
function cancelDrag(){
 if(!drag)return;const item=drag;drag=null;keys=item.original;cancelAnimationFrame(frame);frame=0;document.body.classList.remove('kashGridRangeDragging');try{item.start.releasePointerCapture(item.id)}catch{}
}
document.addEventListener('pointerup',finishDrag,true);
document.addEventListener('pointercancel',()=>{cancelDrag();paint()},true);
document.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId){cancelDrag();paint()}},true);
window.addEventListener('blur',()=>{cancelDrag();paint()});
document.addEventListener('click',event=>{
 if(suppressed){const guard=suppressed;suppressed=null;if(guard.grid?.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();return}}
 const td=event.target.closest?.('#gw td[data-key]');if(!eligible(td)||isControl(event.target)||editingGrid()||(!event.shiftKey&&!event.ctrlKey&&!event.metaKey))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(event.shiftKey){keys=range(find(anchor)||nativeCell()||td,td,event.ctrlKey||event.metaKey?keys:new Set());if(!anchor)anchor=td.dataset.key;selectNative(td)}
 else{const key=td.dataset.key;if(keys.has(key))keys.delete(key);else keys.add(key);anchor=key;selectNative(find([...keys].at(-1))||td)}
 paint();
},true);
window.addEventListener('keydown',event=>{
 suppressed=null;
 if(S.cur!=='grid'||!grid()||!event.target.closest?.('#gw,#kashGridSelectionBar')||isControl(event.target)&&!event.target.closest('#kashGridSelectionBar')||editingGrid())return;
 if(event.key==='Escape'&&keys.size){event.preventDefault();event.stopImmediatePropagation();cancelDrag();clear();return}
 if(event.shiftKey&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
  const previous=nativeCell(),rs=gridNavigationRows();let ri=rs.findIndex(row=>row.includes(previous)),ci=ri>=0?rs[ri].indexOf(previous):-1;
  if(ri<0)return;const from=find(anchor)||previous;
  if(event.key==='ArrowUp')ri--;if(event.key==='ArrowDown')ri++;if(event.key==='ArrowLeft')ci--;if(event.key==='ArrowRight')ci++;
  const next=rs[ri]?.[ci];if(!from?.closest('tr.data-row')||!next?.closest('tr.data-row'))return;
  event.preventDefault();event.stopImmediatePropagation();keys=range(from,next);anchor=from.dataset.key;selectNative(next);paint();return;
 }
 const write=['Enter','Backspace','Delete','Del'].includes(event.key)||(!(event.ctrlKey||event.metaKey)&&/^[0-9,.\-]$/.test(event.key))||((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='v');
 if(write&&keys.size>1)collapse();
},true);
window.KashGridSelection={onSelect,editing,decorate,clear,snapshot};decorate();
})();
