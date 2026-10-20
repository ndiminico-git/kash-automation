'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');

// Compatible con la fuente (index.html) y con la automatización (App/index.html).
function checkCSS(){
 const root=path.resolve(__dirname,'..');
 const app=process.env.KASH_APP_DIR
  ? path.resolve(process.env.KASH_APP_DIR)
  : fs.existsSync(path.join(root,'App/index.html')) ? path.join(root,'App') : root;
 if(!fs.existsSync(path.join(app,'index.html')))throw Error('Control CSS: no se encontró index.html en '+app+'. Revisá KASH_APP_DIR.');
 const result=spawnSync(process.execPath,[path.join(__dirname,'css-guard.cjs'),'--root',app,'--baseline',path.join(__dirname,'css-baseline.json')],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Control CSS: hay cambios de prioridad para revisar. No se iniciaron los casos. Revisá el aviso anterior; no actualices la referencia sin revisar el cambio.');
}
module.exports=checkCSS;
if(require.main===module)checkCSS();
