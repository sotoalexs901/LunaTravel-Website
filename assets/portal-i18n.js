import {spanish} from '/assets/portal-translations.js';
const routes=new Set(['/messages.html','/admin-finance.html','/app.html','/notifications.html','/staff-login.html','/staff-register.html','/staff-portal.html','/staff-sms-consent.html','/client-login.html','/client-register.html','/client-portal.html','/client-service.html']);
const enabled=routes.has(location.pathname);
let language='en';try{language=localStorage.getItem('freshborn-lang')==='es'?'es':'en';}catch{}
const records=new WeakMap(),attributeRecords=new WeakMap();
export const locale=()=>enabled&&language==='es'?'es-US':'en-US';
export function t(value){
 const text=String(value??'');if(!enabled||language!=='es')return text;
 const key=text.trim();let translated=spanish[key];
 if(translated===undefined){
  const patterns=[
   [/^Welcome back, (.*)$/s,m=>'Bienvenido de nuevo, '+m[1]],
   [/^Employee Number: (.*)$/s,m=>'Número de empleado: '+m[1]],
   [/^Account activated\. Employee Number: (.*)$/s,m=>'Cuenta activada. Número de empleado: '+m[1]],
   [/^Account activated! Customer number: (.*)$/s,m=>'¡Cuenta activada! Número de cliente: '+m[1]],
   [/^Shift started (.*)$/s,m=>'Inicio del turno: '+m[1].replace('Complete your active service before punching out.',spanish['Complete your active service before punching out.'])],
   [/^Arrival: (.*)$/s,m=>'Llegada: '+m[1]],
   [/^Scheduled arrival: (.*)$/s,m=>'Llegada programada: '+m[1]],
   [/^Scheduled: (.*)$/s,m=>'Programada: '+m[1]],
   [/^FreshBorn team: (.*)$/s,m=>'Equipo FreshBorn: '+m[1]],
   [/^Accepted (.*)$/s,m=>'Aceptado: '+m[1]],
   [/^(\d+) months$/,m=>m[1]+' meses'],
   [/^Uploading (\d+) of (\d+)…$/,m=>'Subiendo '+m[1]+' de '+m[2]+'…'],
   [/^(\d+) photo\(s\) saved for admin review\.$/,m=>m[1]+' foto(s) guardada(s) para revisión del administrador.'],
   [/^(\d+) photo\(s\) saved\. (.*)$/s,m=>m[1]+' foto(s) guardada(s). '+t(m[2])],
   [/^(\d+) completed cleaning visit\(s\)\. See the timeline below\.$/,m=>m[1]+' visita(s) de limpieza completada(s). Consulta las etapas abajo.'],
   [/^(\d+) approved service report\(s\)\. View the shared photos and summaries below\.$/,m=>m[1]+' reporte(s) aprobado(s). Consulta las fotos y resúmenes compartidos abajo.'],
   [/^Updated (.*)\. Refreshes every 30 seconds while open\.$/s,m=>'Actualizado: '+m[1]+'. Se actualiza cada 30 segundos mientras está abierto.'],
   [/^(\d+) unread in your latest alerts\.$/,m=>m[1]+' sin leer en tus últimas alertas.'],
   [/^Shared by FreshBorn · (.*)$/s,m=>'Compartido por FreshBorn · '+m[1]],
   [/^Unable to load your account: (.*)$/s,m=>'No se pudo cargar tu cuenta: '+t(m[1])],
   [/^Showing your first linked customer account \((\d+) accounts linked\)\.$/,m=>'Se muestra tu primera cuenta de cliente ('+m[1]+' cuentas vinculadas).'],
   [/^For (.*) · (FB-EMP-\d+)$/s,m=>'Para '+m[1]+' · '+m[2]]
  ];
  for(const [pattern,format]of patterns){const match=key.match(pattern);if(match){translated=format(match);break;}}
  if(translated===undefined&&key.includes(' · ')){
   const parts=key.split(' · ');if(spanish[parts[0]])translated=spanish[parts[0]]+' · '+parts.slice(1).join(' · ');
  }
  if(translated===undefined&&key.includes('auth/')){
   const code=key.match(/auth\/[a-z-]+/)?.[0];translated=({
    'auth/invalid-credential':'El correo o la contraseña no son correctos.',
    'auth/wrong-password':'El correo o la contraseña no son correctos.',
    'auth/user-not-found':'El correo o la contraseña no son correctos.',
    'auth/invalid-email':'Escribe un correo electrónico válido.',
    'auth/weak-password':'Usa una contraseña de al menos 8 caracteres.',
    'auth/email-already-in-use':'Ya existe una cuenta con este correo electrónico.',
    'auth/too-many-requests':'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
    'auth/network-request-failed':'No se pudo conectar. Comprueba tu conexión.'
   })[code];
  }
 }
 if(translated===undefined)return text;
 return text.slice(0,text.length-text.trimStart().length)+translated+text.slice(text.trimEnd().length);
}
function excluded(el){return !el||!!el.closest('script,style,textarea,input,[translate="no"],[data-fb-language-picker],.pre');}
function textNode(node){if(excluded(node.parentElement)||!node.nodeValue.trim())return;const current=node.nodeValue,old=records.get(node);const source=old&&current===old.rendered?old.source:current;const rendered=t(source);records.set(node,{source,rendered});if(current!==rendered)node.nodeValue=rendered;}
function attributes(el){if(el.closest('[translate="no"],[data-fb-language-picker]'))return;let map=attributeRecords.get(el);if(!map){map=new Map();attributeRecords.set(el,map);}for(const name of ['placeholder','aria-label','title','alt']){if(!el.hasAttribute(name))continue;const current=el.getAttribute(name),old=map.get(name);const source=old&&current===old.rendered?old.source:current;const rendered=t(source);map.set(name,{source,rendered});if(current!==rendered)el.setAttribute(name,rendered);}}
export function translateDOM(root=document.body){if(!enabled||!root)return;if(root.nodeType===Node.TEXT_NODE){textNode(root);return;}if(root.nodeType!==Node.ELEMENT_NODE)return;attributes(root);const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){if(node.nodeType===Node.TEXT_NODE)textNode(node);else attributes(node);}}
function bindLanguage(){if('serviceWorker'in navigator)navigator.serviceWorker.ready.then(reg=>reg.active?.postMessage({type:'BIND_LANGUAGE',language})).catch(()=>{});}
export function setLanguage(value){if(!enabled)return;language=value==='es'?'es':'en';try{localStorage.setItem('freshborn-lang',language);}catch{}document.documentElement.lang=language;document.querySelectorAll('[data-fb-language]').forEach(el=>el.value=language);translateDOM();translateDOM(document.querySelector('title'));bindLanguage();window.dispatchEvent(new CustomEvent('freshborn:language',{detail:{language,locale:locale()}}));}
if(enabled){
 const bar=document.createElement('div');bar.className='fb-language-bar';bar.dataset.fbLanguagePicker='';bar.innerHTML='<label for="fbLanguage">Language / Idioma</label><select id="fbLanguage" data-fb-language aria-label="Language / Idioma"><option value="en" lang="en">English</option><option value="es" lang="es">Español</option></select>';document.body.prepend(bar);bar.querySelector('select').value=language;bar.querySelector('select').onchange=e=>setLanguage(e.target.value);
 let queued=false;const pending=new Set();new MutationObserver(mutations=>{for(const m of mutations){if(m.type==='characterData')pending.add(m.target);else if(m.type==='attributes')pending.add(m.target);else for(const node of m.addedNodes)pending.add(node);}if(!queued){queued=true;queueMicrotask(()=>{queued=false;for(const node of pending)if(node.isConnected)translateDOM(node);pending.clear();});}}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title','alt']});
 navigator.serviceWorker?.addEventListener('controllerchange',bindLanguage);document.documentElement.lang=language;translateDOM();translateDOM(document.querySelector('title'));bindLanguage();window.addEventListener('storage',event=>{if(event.key==='freshborn-lang')setLanguage(event.newValue);});
}
