#!/usr/bin/env node
'use strict';
// Conservative review gate. No CSS is changed and no browser dependency is needed.
const fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1]};
const root=path.resolve(arg('--root')||path.join(__dirname,'..'));
const baselinePath=path.resolve(arg('--baseline')||path.join(__dirname,'css-baseline.json'));
const skip=new Set(['node_modules','bin','obj','.git','Data','Proyectos','test-results','playwright-report']);
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(skip.has(e.name)||e.name.startsWith('.work-')?[]:files(path.join(dir,e.name))):e.isFile()&&e.name.endsWith('.css')?[path.join(dir,e.name)]:[])}
function noComments(css){return css.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\//g,m=>m.startsWith('/*')?m.replace(/[^\n]/g,' '):m)}
function noStrings(css){return css.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,m=>' '.repeat(m.length))}
function inventory(){
 const units=files(root).map(f=>[path.relative(root,f).replace(/\\/g,'/'),fs.readFileSync(f,'utf8')]);
 const html=path.join(root,'index.html');if(fs.existsSync(html)){
  const source=fs.readFileSync(html,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'');let index=0;
  for(const match of source.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi)){const id=match[1].match(/\bid\s*=\s*["']([^"']+)/i)?.[1]||String(index);units.push(['index.html::style:'+id,match[2]]);index++}
 }
 const entries={},totals={important:0,repeatedIdRuns:0};
 for(const [file,css]of units)for(const raw of noComments(css).split(/\r?\n/)){
  const masked=noStrings(raw),important=(masked.match(/!\s*important\b/gi)||[]).length,repeated=(masked.match(/(#[\w-]+)(?:\1)+/g)||[]).length;
  if(!important&&!repeated)continue;totals.important+=important;totals.repeatedIdRuns+=repeated;
  const key=JSON.stringify([file,raw.replace(/\s+/g,' ').trim()]);const item=entries[key]||(entries[key]={count:0,important,repeated});item.count++;
 }
 return {format:1,method:'Normalized-line multiset; actual HTML style blocks; block comments and quoted strings excluded from token counts',totals,entries};
}
const current=inventory();
if(args.includes('--write-baseline')){fs.writeFileSync(baselinePath,JSON.stringify(current,null,2)+'\n');console.log('Referencia CSS escrita: '+JSON.stringify(current.totals));process.exit(0)}
if(!fs.existsSync(baselinePath)){console.error('Falta la referencia CSS: '+baselinePath);process.exit(2)}
const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));if(baseline.format!==1)throw Error('Formato de referencia desconocido');let alerts=0;
for(const [key,item]of Object.entries(current.entries)){const added=item.count-(baseline.entries[key]?.count||0);if(added<=0)continue;const [file,line]=JSON.parse(key);alerts++;console.error(file+': revisar '+added+' línea(s) nueva(s) con '+[item.important?'!important':'',item.repeated?'ID repetido consecutivamente':''].filter(Boolean).join(' y '));console.error('  '+line.slice(0,220))}
console.log(JSON.stringify({current:current.totals,baseline:baseline.totals,alerts}));process.exitCode=alerts?1:0;
