/* Fichero de Fondos — acceso con contraseña, pestañas y sección Internacional */
'use strict';
(function(){
const $ = s => document.querySelector(s);
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ================================================================ cifrado
   Los datos se publican cifrados (AES-GCM 256, clave derivada de la contraseña con PBKDF2-SHA256).
   Debe coincidir con scripts/cifrar.py. */
const SAL = new TextEncoder().encode('fichero-de-fondos|v1');
const ITER = 600000;
const CLAVE_LS = 'fichero-clave';
const b64a = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const ab64 = b => btoa(String.fromCharCode(...new Uint8Array(b)));

async function derivar(pass){
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt:SAL, iterations:ITER, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, true, ['decrypt']);
}
async function claveGuardada(){
  let raw = null;
  try { raw = sessionStorage.getItem(CLAVE_LS) || localStorage.getItem(CLAVE_LS); } catch(e){}
  if (!raw) return null;
  try { return await crypto.subtle.importKey('raw', b64a(raw), {name:'AES-GCM'}, true, ['decrypt']); } catch(e){ return null; }
}
async function guardarClave(key, recordar){
  const raw = ab64(await crypto.subtle.exportKey('raw', key));
  try { sessionStorage.setItem(CLAVE_LS, raw); if (recordar) localStorage.setItem(CLAVE_LS, raw); else localStorage.removeItem(CLAVE_LS); } catch(e){}
}
function olvidarClave(){ try { sessionStorage.removeItem(CLAVE_LS); localStorage.removeItem(CLAVE_LS); } catch(e){} }

let PAQUETE = null;
async function bajarPaquete(){
  if (PAQUETE) return PAQUETE;
  const r = await fetch('data/fondos-ar.enc.json', {cache:'no-cache'});
  if (!r.ok) throw new Error('datos HTTP '+r.status);
  PAQUETE = await r.json();
  return PAQUETE;
}
async function descifrar(key){
  const p = await bajarPaquete();
  const plano = await crypto.subtle.decrypt({name:'AES-GCM', iv:b64a(p.iv)}, key, b64a(p.ct));
  const flujo = new Blob([plano]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(flujo).text());
}

/* ================================================================ desbloqueo */
let iniciado = false;
function abrir(datos){
  document.body.classList.remove('bloqueado');
  if (!iniciado){ iniciado = true; window.iniciarArgentina(datos); }
  irA(seccionDesdeHash(), false);
}
async function intentarClaveGuardada(){
  const key = await claveGuardada();
  if (!key) return false;
  const btn = $('#lockBtn'); btn.disabled = true; btn.textContent = 'Abriendo…';
  try { abrir(await descifrar(key)); return true; }
  catch(e){ olvidarClave(); return false; }
  finally { btn.disabled = false; btn.textContent = 'Entrar'; }
}
$('#lockForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#lockBtn'), err = $('#lockErr'), pass = $('#lockPass').value;
  if (!pass) return;
  btn.disabled = true; btn.textContent = 'Verificando…'; err.hidden = true;
  try {
    const key = await derivar(pass);
    const datos = await descifrar(key);
    await guardarClave(key, $('#lockRemember').checked);
    $('#lockPass').value = '';
    abrir(datos);
  } catch(ex){
    err.textContent = ex && ex.name === 'OperationError' ? 'Contraseña incorrecta.' : 'No se pudieron cargar los datos. Probá de nuevo en unos minutos.';
    err.hidden = false; console.error(ex);
    $('#lockPass').select();
  } finally { btn.disabled = false; btn.textContent = 'Entrar'; }
});
$('#salir').addEventListener('click', () => { olvidarClave(); location.reload(); });

/* ================================================================ pestañas */
const DISC = {
  ar: $('#discText') ? $('#discText').textContent : '',
  int: 'Datos internacionales de MKTSignals (funds.mktsignals.org): valores liquidativos recopilados de fuentes públicas. Esta sección te lleva a su sitio; no copia sus datos. Información de carácter informativo; no constituye una recomendación de inversión.',
};
function seccionDesdeHash(){ return location.hash === '#int' ? 'int' : 'ar'; }
function irA(sec, push){
  const ar = sec !== 'int';
  $('#secAr').hidden = !ar; $('#secInt').hidden = ar;
  $('#tabAr').setAttribute('aria-selected', ar); $('#tabInt').setAttribute('aria-selected', !ar);
  $('#mastMeta').hidden = !ar;
  document.body.dataset.sec = ar ? 'ar' : 'int';
  if ($('#discText')) $('#discText').textContent = DISC[sec] || DISC.ar;
  document.title = ar ? 'Fichero de Fondos · Argentina' : 'Fichero de Fondos · Internacional';
  if (push !== false){ try { history.replaceState(null, '', ar ? location.pathname + location.search : '#int'); } catch(e){} }
  if (!ar && window.scrollY > 200) window.scrollTo(0, 0);
}
document.querySelectorAll('.tab[data-sec]').forEach(b => b.addEventListener('click', () => irA(b.dataset.sec)));
addEventListener('hashchange', () => { if (!document.body.classList.contains('bloqueado')) irA(seccionDesdeHash(), false); });

/* ================================================================ Internacional */
const MKT = 'https://funds.mktsignals.org';
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;
let intSub = 'funds';
try { intSub = localStorage.getItem('fichero-int-sub') || 'funds'; } catch(e){}
try { const d = localStorage.getItem('fichero-int-div'); if (d !== null) $('#intDiv').value = d; } catch(e){}
function syncSeg(){ document.querySelectorAll('#intForm [data-sub]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sub === intSub)); }
syncSeg();
document.querySelectorAll('#intForm [data-sub]').forEach(b => b.addEventListener('click', () => {
  intSub = b.dataset.sub; syncSeg(); try { localStorage.setItem('fichero-int-sub', intSub); } catch(e){}
}));
$('#intDiv').addEventListener('change', e => { try { localStorage.setItem('fichero-int-div', e.target.value); } catch(e2){} });
function urlScreener(q){
  const p = new URLSearchParams();
  const div = $('#intDiv').value; if (div) p.set('divisa', div);
  p.set('subtype', intSub);
  if (q) p.set('q', q);
  return `${MKT}/screener?${p}`;
}
const urlFondo = isin => `${MKT}/fund/${encodeURIComponent(isin)}`;
$('#intForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = $('#intQ').value.trim();
  const isin = q.replace(/\s+/g,'').toUpperCase();
  location.href = ISIN_RE.test(isin) ? urlFondo(isin) : urlScreener(q);
});
document.addEventListener('keydown', e => {
  if ($('#secInt').hidden) return;
  if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){ e.preventDefault(); $('#intQ').focus(); }
});

const IC = {
  tabla:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  barras:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  casa:'<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>',
  capas:'<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  comparar:'<path d="M8 3v18M16 3v18M3 8h5M16 16h5"/>',
  cartera:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  ojo:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};
const ACCESOS = [
  ['Screener · fondos en USD', 'Todos los fondos en dólares, ordenados por patrimonio', () => `${MKT}/screener?divisa=USD&subtype=funds`, 'tabla'],
  ['Screener · ETFs en USD', 'ETFs UCITS en dólares', () => `${MKT}/screener?divisa=USD&subtype=etfs`, 'barras'],
  ['Screener · fondos en EUR', 'Fondos en euros', () => `${MKT}/screener?divisa=EUR&subtype=funds`, 'tabla'],
  ['Gestoras', 'Las 619 gestoras con sus métricas medianas', () => `${MKT}/gestoras`, 'casa'],
  ['Categorías', 'Rendimiento y riesgo por categoría', () => `${MKT}/categorias`, 'capas'],
  ['Comparador', 'Hasta varios fondos lado a lado', () => `${MKT}/compare`, 'comparar'],
  ['Cartera', 'Simulá una cartera de fondos', () => `${MKT}/cartera`, 'cartera'],
  ['Seguimiento', 'Tu lista de seguimiento en MKTSignals', () => `${MKT}/seguimiento`, 'ojo'],
];
$('#intGrid').innerHTML = ACCESOS.map(([t, d, u, ic]) =>
  `<a class="int-card" href="${escH(u())}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${IC[ic]}</svg><div><b>${escH(t)}</b><span>${escH(d)}</span></div></a>`).join('');

/* Mis fondos internacionales (solo en este navegador) */
const MIS_LS = 'fichero-int-fondos';
let MIS = [];
try { MIS = JSON.parse(localStorage.getItem(MIS_LS) || '[]'); if (!Array.isArray(MIS)) MIS = []; } catch(e){ MIS = []; }
const guardarMis = () => { try { localStorage.setItem(MIS_LS, JSON.stringify(MIS)); } catch(e){} };
let borrarArm = null;
function pintarMis(){
  $('#intList').innerHTML = MIS.length ? MIS.map((f, i) => `<div class="int-row">
      <a href="${escH(urlFondo(f.isin))}">${escH(f.n || f.isin)}</a>
      <span class="isin">${escH(f.isin)}</span>
      <button class="linkbtn" data-del="${i}" style="color:var(--ink-3)">${borrarArm === i ? 'Confirmar' : 'Quitar'}</button>
    </div>`).join('') : `<p class="int-empty">Todavía no guardaste fondos. Agregá el ISIN de los que seguís para abrirlos con un clic.</p>`;
}
$('#intList').addEventListener('click', e => {
  const b = e.target.closest('[data-del]'); if (!b) return;
  const i = +b.dataset.del;
  if (borrarArm !== i){ borrarArm = i; pintarMis(); return; }
  MIS.splice(i, 1); borrarArm = null; guardarMis(); pintarMis();
});
$('#intAdd').addEventListener('submit', e => {
  e.preventDefault();
  const isin = $('#intAddIsin').value.replace(/\s+/g,'').toUpperCase(), n = $('#intAddName').value.trim(), err = $('#intAddErr');
  if (!ISIN_RE.test(isin)){ err.textContent = 'Revisá el ISIN: son 12 caracteres, por ejemplo LU0629459743.'; err.hidden = false; return; }
  if (MIS.some(f => f.isin === isin)){ err.textContent = 'Ese fondo ya está en tu lista.'; err.hidden = false; return; }
  err.hidden = true; MIS.push({isin, n}); guardarMis(); pintarMis();
  $('#intAddIsin').value = ''; $('#intAddName').value = ''; $('#intAddIsin').focus();
});
pintarMis();

/* ================================================================ arranque */
irA(seccionDesdeHash(), false);
intentarClaveGuardada().then(ok => { if (!ok) setTimeout(() => $('#lockPass').focus(), 50); });
})();
