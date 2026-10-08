/* Fichero de Fondos — sección Argentina (datos CAFCI) */
'use strict';
const $ = s => document.querySelector(s);
const nf = new Intl.NumberFormat('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
const nf0 = new Intl.NumberFormat('es-AR',{maximumFractionDigits:0});
const nf1 = new Intl.NumberFormat('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1});
const nf4 = new Intl.NumberFormat('es-AR',{minimumFractionDigits:2,maximumFractionDigits:4});
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const median = a => { if (!a.length) return null; const s=[...a].sort((x,y)=>x-y); const m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };

let DATA = [], META = {}, BY_CID = new Map(), BY_FUND = new Map();

/* ---------------------------------------------------------------- derivados */
const TIPOS = {
  'Mercado de Dinero':['mm','Money market',4], 'Renta Fija':['rf','Renta fija',2], 'Renta Variable':['rv','Renta variable',1],
  'Renta Mixta':['mx','Renta mixta',3], 'Retorno Total':['mx','Retorno total',3],
};
const liqLabel = n => n==null ? 's/d' : n===0 ? 'CI' : n<=3 ? `${n*24} hs` : `${n} días`;
function derive(raw, usdArs){
  return raw.map((c,i)=>{
    const tp = TIPOS[c.t] || ['ot', c.t || 'Otros', 5];
    const usd = /d[oó]lar/i.test(c.ccy||'');
    const r = c.r || {};
    const d = {
      id:i, cid:c.cid, fid:c.fid, key:'c'+c.cid,
      n:c.n || c.fondo, fondo:c.fondo, g:c.g || 's/d', dep:c.dep,
      t:c.t || 'Otros', tm:c.tm && !/no aplicable|no registrado/i.test(c.tm) ? c.tm : '',
      tk:tp[0], tShort:tp[1], sg:tp[2],
      ccyK: usd ? 'USD' : 'ARS', ccyL: usd ? 'Dólares' : 'Pesos', ccyRaw:c.ccy,
      hz:(c.hz||'').replace(' Plazo',' plazo') || 's/d', geo:c.geo || 's/d', bm:c.bm, dur:c.dur, td:c.td,
      liq:c.liq, liqL:liqLabel(c.liq), min:c.min, cnv:c.cnv, ini:c.ini, bbg:c.bbg, isin:c.isin,
      obj: c.obj && !/^sin datos$/i.test(c.obj) ? c.obj : '',
      url:c.url, f:c.f, fr:c.fr, vcp:c.vcp, pat:c.pat, cost:c.cost, hon:c.hon||{}, tna:c.tna||{},
      rd:r.dia ?? null, diaN:c.diaN, r7:r.d7 ?? null, r1m:r.m1 ?? null, r3m:r.d90 ?? null, r6m:r.d180 ?? null, rytd:r.ytd ?? null, r12:r.m12 ?? null,
      calif:c.calif||[], cart:[...(c.cart||[])].sort((a,b)=>b[1]-a[1]), fc:c.fc, susc:c.susc!==false, err:!!c.err,
    };
    d.au = d.pat==null ? null : (usd ? d.pat/1e6 : (usdArs ? d.pat/usdArs/1e6 : null));
    d.pend = d.vcp==null;
    d.califTop = d.calif.length ? d.calif[0][1] : '';
    d.idx = norm([d.n,d.fondo,d.g,d.t,d.tm,d.hz,d.geo,d.ccyL,d.bbg,d.isin,d.cnv,d.dep,d.cart.map(x=>x[0]).join(' ')].join(' '));
    return d;
  });
}

/* ---------------------------------------------------------------- estado */
const DEF = {q:'',t:[],ccy:[],hz:[],liq:[],geo:[],g:[],costMax:5,r12Min:null,auMin:0,hideP:true,onlySusc:false,sort:'au:desc',view:'table',list:null,xr:'r12'};
let S = structuredClone(DEF);
try { const saved = JSON.parse(localStorage.getItem('fichero-ar-v1')||'null'); if (saved) S = Object.assign(structuredClone(DEF), saved); } catch(e){}
const save = () => { try { localStorage.setItem('fichero-ar-v1', JSON.stringify(S)); } catch(e){} };
const PAGE = 60; let shown = PAGE;
const cmp = new Set();

/* ---------------------------------------------------------------- listas */
let LISTS = null;
try { LISTS = JSON.parse(localStorage.getItem('fichero-ar-listas')||'null'); } catch(e){}
if (!Array.isArray(LISTS)) LISTS = [{id:'fav',name:'Favoritos',keys:[]}];
const saveLists = () => { try { localStorage.setItem('fichero-ar-listas', JSON.stringify(LISTS)); } catch(e){} };
const inList = (lid,d) => !!LISTS.find(l=>l.id===lid)?.keys.includes(d.key);
function toggleInList(lid,d){ const l=LISTS.find(l=>l.id===lid); if(!l) return; const i=l.keys.indexOf(d.key); i>=0?l.keys.splice(i,1):l.keys.push(d.key); saveLists(); afterListChange(d); }
function createList(name, d){ name=(name||'').trim(); if(!name) return null; const l={id:'l'+Date.now().toString(36),name,keys:d?[d.key]:[]}; LISTS.push(l); saveLists(); if(d) afterListChange(d); else renderLists(); return l; }
function afterListChange(d){
  renderLists();
  if (S.list) update();
  else document.querySelectorAll(`.star[data-star="${d.id}"]`).forEach(b=>{ const on=inList('fav',d); b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); });
  if (openId===d.id) openFund(d.id,true);
}
const starBtn = d => `<button class="star${inList('fav',d)?' on':''}" data-star="${d.id}" aria-pressed="${inList('fav',d)}" aria-label="Guardar en Favoritos" title="Guardar en Favoritos"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg></button>`;
let delArm = null;
function renderLists(){
  let h = `<div class="fgroup"><h3>Mis listas</h3>
    <button class="lrow${!S.list?' on':''}" data-list=""><span class="lbl">Todos los fondos</span><span class="ct">${DATA.length}</span></button>`;
  LISTS.forEach(l=>{ h += `<button class="lrow${S.list===l.id?' on':''}" data-list="${l.id}"><span class="lbl">${l.id==='fav'?'★ ':''}${esc(l.name)}</span><span class="ct">${l.keys.length}</span></button>`; });
  h += `<div class="newlist"><input id="nlName" placeholder="Nombre de nueva lista" aria-label="Nombre de nueva lista" maxlength="40"><button id="nlAdd">Crear</button></div></div>`;
  $('#listsBox').innerHTML = h;
  const bar = $('#listBar');
  const l = S.list && LISTS.find(x=>x.id===S.list);
  if (!l){ bar.innerHTML=''; if(S.list){S.list=null;} return; }
  bar.innerHTML = `<div class="listbar"><span>Lista <b>${esc(l.name)}</b> · ${l.keys.length} ${l.keys.length===1?'fondo':'fondos'}</span><span class="sp"></span>
    ${l.id!=='fav'?`<button class="linkbtn" id="lDel">${delArm===l.id?'¿Eliminar definitivamente? Confirmar':'Eliminar lista'}</button>`:''}
    <button class="btn" id="lAll" style="padding:5px 12px">Ver todos los fondos</button></div>`;
  $('#lAll').onclick=()=>{ S.list=null; update(); };
  const del=$('#lDel'); if(del) del.onclick=()=>{ if(delArm!==l.id){ delArm=l.id; renderLists(); return; } LISTS=LISTS.filter(x=>x.id!==l.id); delArm=null; saveLists(); S.list=null; update(); };
}
$('#listsBox').addEventListener('click', e=>{
  const b=e.target.closest('[data-list]'); if(b){ S.list=b.dataset.list||null; delArm=null; update(); closeFilters(); return; }
  if (e.target.id==='nlAdd'){ const l=createList($('#nlName').value); if(l){ S.list=l.id; update(); } }
});
$('#listsBox').addEventListener('keydown', e=>{ if(e.target.id==='nlName' && e.key==='Enter'){ const l=createList(e.target.value); if(l){ S.list=l.id; update(); } } });

/* ---------------------------------------------------------------- pares */
const PEER_M = [['cost',-1],['r1m',1],['rytd',1],['r12',1],['au',1]];
function computePeers(){
  const groups = {};
  DATA.forEach(d=>{ if(d.pend) return; (groups[d.tk+'|'+d.ccyK] ||= []).push(d); });
  DATA.forEach(d=>{
    d.peer = {};
    PEER_M.forEach(([k,dir])=>{
      if (d[k]==null || d.pend) return;
      const g = (groups[d.tk+'|'+d.ccyK]||[]).filter(x=>x[k]!=null);
      if (g.length<5) return;
      let worse=0, ties=0;
      g.forEach(x=>{ if(x===d) return; const c=(d[k]-x[k])*dir; if(c>0) worse++; else if(c===0) ties++; });
      d.peer[k] = {p:(worse+ties/2)/(g.length-1), n:g.length, lbl:`${d.tShort.toLowerCase()} en ${d.ccyL.toLowerCase()}`, med:median(g.map(x=>x[k]))};
    });
    d.p12 = d.peer.r12 ? Math.round(d.peer.r12.p*100) : null;
  });
}

/* ---------------------------------------------------------------- filtros */
const FACETS = [
  {k:'t', title:'Tipo de fondo', get:d=>d.t},
  {k:'ccy', title:'Moneda', get:d=>d.ccyL},
  {k:'liq', title:'Plazo de liquidación', get:d=>d.liqL, order:(a,b)=>liqOrd(a)-liqOrd(b)},
  {k:'hz', title:'Horizonte', get:d=>d.hz},
  {k:'geo', title:'Región', get:d=>d.geo, limit:6},
  {k:'g', title:'Gestora', get:d=>d.g, search:true},
];
const liqOrd = l => l==='CI'?0 : l==='s/d'?99 : parseInt(l)||50;

function pass(d, skip){
  if (S.q){ const terms = norm(S.q).split(/\s+/).filter(Boolean); for (const t of terms) if (!d.idx.includes(t)) return false; }
  for (const f of FACETS){ if (f.k===skip) continue; const sel=S[f.k]; if (sel.length && !sel.includes(f.get(d))) return false; }
  if (S.costMax<5 && (d.cost==null || d.cost>S.costMax)) return false;
  if (S.r12Min!=null && (d.r12==null || d.r12<S.r12Min)) return false;
  if (S.auMin && (d.au==null || d.au<S.auMin)) return false;
  if (S.list){ const l=LISTS.find(l=>l.id===S.list); if(!l || !l.keys.includes(d.key)) return false; }
  if (S.hideP && d.pend) return false;
  if (S.onlySusc && !d.susc) return false;
  return true;
}

/* ---------------------------------------------------------------- formato */
const pct = (v,signed=true,dec) => v==null ? '<span class="nd">—</span>' : `<span class="${v>0?'pos':v<0?'neg':''}">${signed&&v>0?'+':''}${(dec?nf4:nf).format(v)}%</span>`;
const TNAK = {r7:'d7',r1m:'m1',r3m:'d90',r6m:'d180',rytd:'ytd',r12:'m12'};
const retCell = (d,k) => {
  const t = d.tna[TNAK[k]];
  const tip = k==='rd' ? (d.rd!=null ? `Variación de la cuotaparte${d.diaN>1?` en ${d.diaN} días corridos`:''}` : 'Disponible desde el segundo día de datos') : (t!=null ? `TNA ${nf.format(t)}% (dato CAFCI)` : '');
  return `<span title="${esc(tip)}">${pct(d[k])}</span>`;
};
function bigNum(v){
  const a = Math.abs(v);
  if (a>=1e12) return nf1.format(v/1e12)+' billones';
  if (a>=1e9) return nf1.format(v/1e9)+' mil M';
  if (a>=1e6) return nf0.format(v/1e6)+' M';
  return nf0.format(v);
}
const sym = d => d.ccyK==='USD' ? 'US$' : '$';
const patFmt = d => d.pat==null ? '<span class="nd">—</span>' : `<span title="${esc(sym(d)+' '+nf.format(d.pat))}${d.au!=null&&d.ccyK==='ARS'?` · ≈ US$ ${nf0.format(d.au)} M`:''}"><span class="ccy">${sym(d)}</span> ${bigNum(d.pat)}</span>`;
const costFmt = d => d.cost==null ? '<span class="nd">—</span>' : `<span title="Gerente ${nf4.format(d.hon.gerente??0)}% + depositaria ${nf4.format(d.hon.depositaria??0)}%${d.hon.gastos?` + gastos ${nf4.format(d.hon.gastos)}%`:''}">${nf.format(d.cost)}%</span>`;
const dateFmt = d => {
  if (!d.f) return '<span class="nd">s/f</span>';
  const [y,m,dd] = d.f.split('-'); const old = META.maxF && (new Date(META.maxF)-new Date(d.f))/864e5 > 7;
  return `<span class="date${old?' old':''}" title="Valores al ${dd}/${m}/${y}${old?' · dato atrasado respecto del resto':''}">${+dd} ${MESES[+m-1]}</span>`;
};
const typePill = d => `<span class="pill t-${d.tk}">${esc(d.tShort)}</span>`;
const ccyPill = d => `<span class="pill t-${d.ccyK.toLowerCase()}">${d.ccyK==='USD'?'US$':'$'}</span>`;
const warnIcon = d => d.err ? `<span class="warnic" title="No se pudo leer la ficha en la última actualización; se muestran los datos del catálogo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-label="Advertencia"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.5"/></svg></span>` : '';

function sorted(list){
  const [k,dir] = S.sort.split(':'); const m = dir==='asc'?1:-1;
  return list.sort((a,b)=>{
    const x=a[k], y=b[k];
    if (x==null && y==null) return a.n.localeCompare(b.n,'es');
    if (x==null) return 1; if (y==null) return -1;
    if (typeof x==='string') return x.localeCompare(y,'es')*m || a.n.localeCompare(b.n,'es');
    return (x-y)*m || a.n.localeCompare(b.n,'es');
  });
}

/* ---------------------------------------------------------------- facetas */
const facetState = {};
function renderFacets(){
  let h = '', hg = '';
  for (const f of FACETS){
    let out = '';
    const counts = new Map(), all = new Map();
    DATA.forEach(d=>{ const v=f.get(d); if(v==null||v==='') return; all.set(v,(all.get(v)||0)+1); if(pass(d,f.k)) counts.set(v,(counts.get(v)||0)+1); });
    let keys = [...all.keys()];
    if (f.order) keys.sort(f.order);
    else if (f.k==='g') keys.sort((a,b)=>a.localeCompare(b,'es'));
    else keys.sort((a,b)=> (all.get(b)-all.get(a)) || a.localeCompare(b,'es'));
    const fs = facetState[f.k] || (facetState[f.k]={open:false,q:''});
    let list = keys;
    if (f.search && fs.q) list = keys.filter(k=>norm(k).includes(norm(fs.q)));
    const lim = f.limit && !fs.open ? f.limit : Infinity;
    const vis = list.filter((k,i)=> i<lim || S[f.k].includes(k));
    const sel = S[f.k].length;
    out += `<div class="fgroup"><h3><span>${f.title}</span>${sel?`<button class="linkbtn" data-clr="${f.k}" style="font-size:12px;text-transform:none;letter-spacing:0">Quitar (${sel})</button>`:''}</h3>`;
    if (f.search) out += `<input class="minisearch" id="ms-${f.k}" placeholder="Buscar gestora…" value="${esc(fs.q)}" aria-label="Buscar gestora">`;
    out += `<div class="${f.search?'scrolllist':''}">`;
    vis.forEach(k=>{
      const c = counts.get(k)||0; const on = S[f.k].includes(k);
      const lbl = f.k==='liq' && k==='CI' ? 'CI · en el día' : k;
      out += `<label class="opt${!c&&!on?' zero':''}"><input type="checkbox" data-f="${f.k}" value="${esc(k)}"${on?' checked':''}><span class="lbl">${esc(lbl)}</span><span class="ct">${c}</span></label>`;
    });
    out += `</div>`;
    if (f.limit && list.length>f.limit) out += `<button class="linkbtn" data-more="${f.k}" style="margin-top:4px">${fs.open?'Ver menos':'Ver las '+list.length}</button>`;
    out += `</div>`;
    if (f.k==='g') hg = out; else h += out;
  }
  h += `<div class="fgroup"><h3>Costo anual</h3><div class="range"><div class="rv"><span>Máximo</span><b id="costV">${S.costMax>=5?'Sin límite':nf.format(S.costMax)+'%'}</b></div><input type="range" id="costMax" min="0.25" max="5" step="0.25" value="${S.costMax}" aria-label="Costo máximo"></div></div>`;
  h += `<div class="fgroup"><h3>Rendimiento mínimo</h3>
    <div class="range"><div class="rv"><span>Últimos 12 meses</span><b id="r12V">${S.r12Min==null?'Cualquiera':'≥ '+nf0.format(S.r12Min)+'%'}</b></div><input type="range" id="r12Min" min="-20" max="80" step="1" value="${S.r12Min??-20}" aria-label="Rendimiento 12 meses mínimo"></div>
    <p class="sub">Ojo: los fondos en pesos y en dólares no son comparables entre sí. Conviene filtrar por moneda.</p></div>`;
  h += `<div class="fgroup"><h3>Patrimonio de la clase</h3><select class="fsel" id="auMin" aria-label="Patrimonio mínimo">
    ${[[0,'Cualquier tamaño'],[1,'Más de US$ 1 M'],[10,'Más de US$ 10 M'],[50,'Más de US$ 50 M'],[100,'Más de US$ 100 M'],[500,'Más de US$ 500 M']].map(([v,l])=>`<option value="${v}"${S.auMin==v?' selected':''}>${l}</option>`).join('')}</select>
    <p class="sub">Los fondos en pesos se convierten al dólar oficial${META.usd_ars?` (${nf0.format(META.usd_ars)} $/US$)`:''}.</p></div>`;
  const nP = DATA.filter(d=>d.pend).length, nC = DATA.filter(d=>!d.susc).length;
  h += `<div class="fgroup"><h3>Disponibilidad</h3>
    <label class="opt"><input type="checkbox" id="hideP"${S.hideP?' checked':''}><span class="lbl">Ocultar clases sin valores publicados</span><span class="ct">${nP}</span></label>
    <label class="opt"><input type="checkbox" id="onlySusc"${S.onlySusc?' checked':''}><span class="lbl">Solo abiertas a suscripción</span><span class="ct">${DATA.length-nC}</span></label></div>`;
  const focusId = document.activeElement && document.activeElement.id;
  const caret = focusId && document.activeElement.selectionStart;
  $('#facetBox').innerHTML = h;
  $('#gestBox').innerHTML = hg.replace('class="fgroup"','class="fgroup" style="border-top:none;padding-top:6px"');
  if (focusId && focusId.startsWith('ms-')){ const el=document.getElementById(focusId); if(el){el.focus(); try{el.setSelectionRange(caret,caret)}catch(e){}} }
}
$('#filters').addEventListener('change', e=>{
  const t=e.target;
  if (t.dataset.f){ const a=S[t.dataset.f]; t.checked ? a.push(t.value) : a.splice(a.indexOf(t.value),1); }
  else if (t.id==='auMin') S.auMin=+t.value;
  else if (['hideP','onlySusc'].includes(t.id)) S[t.id]=t.checked;
  else return;
  update();
});
$('#filters').addEventListener('input', e=>{
  const t=e.target;
  if (t.id==='costMax'){ S.costMax=+t.value; $('#costV').textContent = S.costMax>=5?'Sin límite':nf.format(S.costMax)+'%'; debounced(); }
  else if (t.id==='r12Min'){ S.r12Min = +t.value<=-20?null:+t.value; $('#r12V').textContent = S.r12Min==null?'Cualquiera':'≥ '+nf0.format(S.r12Min)+'%'; debounced(); }
  else if (t.id.startsWith('ms-')){ facetState[t.id.slice(3)].q=t.value; renderFacets(); }
});
$('#filters').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return;
  if (b.dataset.more){ facetState[b.dataset.more].open=!facetState[b.dataset.more].open; renderFacets(); }
  if (b.dataset.clr){ S[b.dataset.clr]=[]; update(); }
});
let tmr; const debounced = ()=>{ clearTimeout(tmr); tmr=setTimeout(()=>update(),120); };

/* ---------------------------------------------------------------- chips */
function renderChips(){
  const c=[];
  if (S.q) c.push(['q',null,`“${S.q}”`]);
  FACETS.forEach(f=>S[f.k].forEach(v=>c.push([f.k,v,v])));
  if (S.costMax<5) c.push(['costMax',null,`Costo ≤ ${nf.format(S.costMax)}%`]);
  if (S.r12Min!=null) c.push(['r12Min',null,`12 meses ≥ ${S.r12Min}%`]);
  if (S.auMin) c.push(['auMin',null,`Patrimonio > US$ ${nf0.format(S.auMin)} M`]);
  if (S.onlySusc) c.push(['onlySusc',null,'Abiertas a suscripción']);
  $('#chips').innerHTML = c.map(([k,v,l])=>`<span class="chip">${esc(l)}<button aria-label="Quitar filtro ${esc(l)}" data-k="${k}" data-v="${esc(v??'')}">✕</button></span>`).join('');
  const n = c.filter(x=>x[0]!=='q').length;
  $('#fCount').hidden = !n; $('#fCount').textContent = n;
}
$('#chips').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return; const k=b.dataset.k, v=b.dataset.v;
  if (k==='q'){ S.q=''; $('#q').value=''; }
  else if (Array.isArray(S[k])) S[k]=S[k].filter(x=>x!==v);
  else S[k]=DEF[k];
  update();
});

/* ---------------------------------------------------------------- resultados */
let CUR = [];
function renderSummary(list){
  const g = new Set(list.map(d=>d.g)).size;
  const f = new Set(list.map(d=>d.fid)).size;
  const c = median(list.map(d=>d.cost).filter(v=>v!=null));
  const r1 = median(list.map(d=>d.r1m).filter(v=>v!=null));
  const r12 = median(list.map(d=>d.r12).filter(v=>v!=null));
  $('#summary').innerHTML = `
    <div><span>Clases</span><b>${nf0.format(list.length)}</b><small>${nf0.format(f)} fondos</small></div>
    <div><span>Gestoras</span><b>${g}</b></div>
    <div><span>Costo mediano</span><b>${c==null?'—':nf.format(c)+'%'}</b></div>
    <div><span>1 mes · mediana</span><b>${r1==null?'—':pct(r1)}</b></div>
    <div><span>12 meses · mediana</span><b>${r12==null?'—':pct(r12)}</b></div>`;
  const ccys = new Set(list.map(d=>d.ccyK));
  $('#mixNote').innerHTML = ccys.size>1 && list.length ? `<p class="mixnote"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.5"/></svg>La selección mezcla fondos en pesos y en dólares: las medianas de rendimiento no son comparables. <button class="linkbtn" data-onlyccy="Pesos">Ver solo pesos</button> · <button class="linkbtn" data-onlyccy="Dólares">Ver solo dólares</button></p>` : '';
}
$('#mixNote').addEventListener('click', e=>{ const b=e.target.closest('[data-onlyccy]'); if(b){ S.ccy=[b.dataset.onlyccy]; update(); } });

const COLS = [
  ['n','Fondo · clase','asc'],['t','Tipo · horizonte','asc'],['au','Patrimonio','desc',1],['cost','Costo<span class="hint" title="Costo anual: honorarios de gerente + depositaria + gastos ordinarios">?</span>','asc',1],
  ['rd','Día','desc',1],['r1m','1 mes','desc',1],['rytd','En el año','desc',1],['r12','12 meses','desc',1],['f','Datos al','desc',1]];
function renderResults(){
  const list = CUR; const el = $('#results');
  if (!list.length){ el.innerHTML = `<div class="tablebox"><div class="empty"><b>Ningún fondo cumple estos filtros</b>Probá quitar alguno de los filtros activos o ampliar la búsqueda.<div style="margin-top:14px"><button class="btn" id="emptyClr">Limpiar filtros</button></div></div></div>`; $('#emptyClr').onclick=clearAll; return; }
  if (S.view==='explore'){ renderExplore(el, list); return; }
  const vis = list.slice(0, shown);
  const moreBar = list.length>shown ? `<div class="more">Mostrando ${shown} de ${nf0.format(list.length)}<button class="btn" id="moreBtn">Mostrar ${Math.min(PAGE,list.length-shown)} más</button><button class="linkbtn" id="allBtn">Ver todos</button></div>` : `<div class="more">${nf0.format(list.length)} clases</div>`;
  const useCards = S.view==='cards' || window.innerWidth<760;
  const [sk,sd] = S.sort.split(':');
  if (!useCards){
    el.innerHTML = `<div class="tablebox"><table><thead><tr><th><span style="position:absolute;left:-9999px">Comparar</span></th><th><span style="position:absolute;left:-9999px">Favorito</span></th>${COLS.map(([k,l,dd,r])=>`<th class="${r?'r':''}"${sk===k?` aria-sort="${sd==='asc'?'ascending':'descending'}"`:''}><button data-sort="${k}:${dd}">${l}<span class="arr">${sk===k?(sd==='asc'?'▲':'▼'):''}</span></button></th>`).join('')}</tr></thead><tbody>${
      vis.map(d=>`<tr data-id="${d.id}" class="${cmp.has(d.id)?'sel':''}">
        <td class="cb"><input type="checkbox" data-cmp="${d.id}" aria-label="Comparar ${esc(d.n)}" title="Agregar a comparar"${cmp.has(d.id)?' checked':''}></td><td class="cb" style="padding-left:4px">${starBtn(d)}</td>
        <td class="fcol"><div class="fname">${esc(d.n)}</div><div class="fgest"><span>${esc(d.g)}</span>${ccyPill(d)}${warnIcon(d)}</div></td>
        <td><div class="cat">${typePill(d)}${d.tm?` <span class="nd" style="font-size:12px">${esc(d.tm)}</span>`:''}</div><div class="geo">${esc(d.hz)} · rescate ${esc(d.liqL)}${d.geo&&d.geo!=='Argentina'?' · '+esc(d.geo):''}</div></td>
        <td class="r">${patFmt(d)}</td><td class="r">${costFmt(d)}</td>
        <td class="r">${retCell(d,'rd')}</td><td class="r">${retCell(d,'r1m')}</td><td class="r">${retCell(d,'rytd')}</td><td class="r">${retCell(d,'r12')}</td>
        <td class="r">${dateFmt(d)}</td></tr>`).join('')}</tbody></table>${moreBar}</div>`;
  } else {
    el.innerHTML = `<div class="cards">${vis.map(d=>`<article class="card${cmp.has(d.id)?' sel':''}" data-id="${d.id}" tabindex="0">
      <div class="ctop"><span class="cg">${esc(d.g)}</span><span class="cb" style="display:flex;gap:6px;align-items:center">${starBtn(d)}<input type="checkbox" data-cmp="${d.id}" aria-label="Comparar ${esc(d.n)}" title="Agregar a comparar"${cmp.has(d.id)?' checked':''}></span></div>
      <h4>${esc(d.n)}</h4>
      <div class="fgest">${typePill(d)}${ccyPill(d)}<span>${esc(d.hz)} · ${esc(d.liqL)}</span>${warnIcon(d)}</div>
      <div class="cm"><div><span>Costo</span><b>${costFmt(d)}</b></div><div><span>1 mes</span><b>${retCell(d,'r1m')}</b></div><div><span>En el año</span><b>${retCell(d,'rytd')}</b></div><div><span>12 meses</span><b>${retCell(d,'r12')}</b></div></div>
      <div class="cfoot"><span>${patFmt(d)}</span><span>${dateFmt(d)}</span></div>
    </article>`).join('')}<div class="cards-more">${moreBar.replace('class="more"','class="more" style="border:none"')}</div></div>`;
  }
  const mb=$('#moreBtn'); if(mb) mb.onclick=()=>{shown+=PAGE; renderResults();};
  const ab=$('#allBtn'); if(ab) ab.onclick=()=>{shown=list.length; renderResults();};
}
$('#results').addEventListener('click', e=>{
  const st=e.target.closest('[data-star]'); if (st){ toggleInList('fav', DATA[+st.dataset.star]); return; }
  const xr=e.target.closest('[data-xr]'); if (xr){ S.xr=xr.dataset.xr; save(); renderResults(); return; }
  const ft=e.target.closest('[data-ft],[data-fg]'); if (ft){ const k=ft.dataset.ft!=null?'t':'g', v=ft.dataset.ft??ft.dataset.fg; S[k]=S[k].includes(v)?S[k].filter(x=>x!==v):[...S[k],v]; update(); return; }
  const pt=e.target.closest('[data-pt]'); if (pt){ openFund(+pt.dataset.pt); return; }
  const s=e.target.closest('[data-sort]');
  if (s){ const [k,dd]=s.dataset.sort.split(':'); const [ck,cd]=S.sort.split(':'); S.sort = ck===k ? `${k}:${cd==='asc'?'desc':'asc'}` : `${k}:${dd}`; syncSortSel(); update(); return; }
  if (e.target.dataset.cmp!=null){ toggleCmp(+e.target.dataset.cmp); return; }
  if (e.target.closest('a,button,input')) return;
  const r=e.target.closest('[data-id]'); if (r) openFund(+r.dataset.id);
});
$('#results').addEventListener('keydown', e=>{ if(e.key==='Enter'){ const r=e.target.closest('.card'); if(r) openFund(+r.dataset.id);} });
function syncSortSel(){ const sel=$('#sort'); if(![...sel.options].some(o=>o.value===S.sort)){ let o=sel.querySelector('option[data-custom]'); if(!o){o=document.createElement('option');o.dataset.custom=1;sel.appendChild(o);} const c=COLS.find(c=>c[0]===S.sort.split(':')[0]); o.value=S.sort; o.textContent=(c?c[1].replace(/<span[\s\S]*<\/span>/,''):S.sort)+(S.sort.endsWith('asc')?' ↑':' ↓'); } sel.value=S.sort; }

function update(){
  CUR = sorted(DATA.filter(d=>pass(d)));
  shown = PAGE;
  renderSummary(CUR); renderChips(); renderLists(); renderResults();
  if (!document.activeElement || !['costMax','r12Min'].includes(document.activeElement.id)) renderFacets();
  save();
}

/* ---------------------------------------------------------------- comparar */
function toggleCmp(id){
  if (cmp.has(id)) cmp.delete(id); else { if (cmp.size>=4){ flashTray(); return; } cmp.add(id); }
  document.querySelectorAll(`[data-cmp="${id}"]`).forEach(i=>i.checked=cmp.has(id));
  document.querySelectorAll(`[data-id="${id}"]`).forEach(r=>r.classList.toggle('sel',cmp.has(id)));
  renderTray(); if (openId===id) openFund(id, true);
}
function flashTray(){ $('#trayLbl').textContent='Máximo 4 fondos'; setTimeout(renderTray,1400); }
function renderTray(){
  const n=cmp.size; $('#tray').classList.toggle('on', n>0);
  $('#trayLbl').textContent = n===1 ? '1 fondo · elegí otro' : `${n} fondos`;
  $('#trayNames').innerHTML = [...cmp].map(i=>`<span>${esc(DATA[i].n)}</span>`).join('');
  $('#trayGo').disabled = n<2; $('#trayGo').style.opacity = n<2?.5:1;
}
$('#trayClr').onclick=()=>{ cmp.clear(); renderTray(); renderResults(); };
$('#trayGo').onclick=()=>{ if(cmp.size<2) return;
  const fs=[...cmp].map(i=>DATA[i]);
  const best=(k,dir)=>{ const v=fs.map(f=>f[k]).filter(x=>x!=null); if(v.length<2) return null; return dir>0?Math.max(...v):Math.min(...v); };
  const row=(lbl,fn,k,dir)=>{ const b=k?best(k,dir):null; return `<tr><th scope="row">${lbl}</th>${fs.map(f=>`<td class="n${b!=null&&f[k]===b?' best':''}">${fn(f)}</td>`).join('')}</tr>`; };
  $('#mBody').innerHTML = `<table class="cmp"><thead><tr><th></th>${fs.map(f=>`<th><div class="d-g">${esc(f.g)}</div>${esc(f.n)}</th>`).join('')}</tr></thead><tbody>
    ${row('Tipo',f=>typePill(f)+(f.tm?' '+esc(f.tm):''))}
    ${row('Moneda',f=>esc(f.ccyL))}
    ${row('Horizonte',f=>esc(f.hz))}
    ${row('Rescate',f=>esc(f.liqL),'liq',-1)}
    ${row('Patrimonio',patFmt,'au',1)}
    ${row('Costo anual',costFmt,'cost',-1)}
    ${row('Rend. del día',f=>retCell(f,'rd'),'rd',1)}
    ${row('Rend. 1 mes',f=>retCell(f,'r1m'),'r1m',1)}
    ${row('Rend. en el año',f=>retCell(f,'rytd'),'rytd',1)}
    ${row('Rend. 12 meses',f=>retCell(f,'r12'),'r12',1)}
    ${row('Vs. pares · 12 meses',f=>f.p12==null?'<span class="nd">—</span>':`Mejor que el ${f.p12}%`,'p12',1)}
    ${row('Calificación',f=>f.califTop?esc(f.califTop):'<span class="nd">—</span>')}
    ${row('Comisión de rescate',f=>f.hon.rescate==null?'<span class="nd">—</span>':nf.format(f.hon.rescate)+'%')}
    ${row('Inversión mínima',f=>f.min==null?'<span class="nd">—</span>':`${sym(f)} ${nf0.format(f.min)}`)}
    ${row('Datos al',dateFmt)}
    ${row('Ficha oficial',f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener">CAFCI ↗</a>`)}
  </tbody></table><p class="sub" style="padding:10px 16px 16px;margin:0">Resaltado: el mejor valor de cada fila entre los fondos comparados. Rendimientos directos del período. Comparar fondos en pesos con fondos en dólares no es equivalente.</p>`;
  $('#modal').hidden=false; $('#mClose').focus();
};
$('#mClose').onclick=()=>{$('#modal').hidden=true};
$('#modal').addEventListener('click',e=>{ if(e.target.id==='modal') $('#modal').hidden=true; });

/* ---------------------------------------------------------------- explorar */
const SG = {1:'Renta variable',2:'Renta fija',3:'Mixtos y retorno total',4:'Money market',5:'Otros (PyMEs, infraestructura, etc.)'};
const XR = {r1m:'1 mes',rytd:'En el año',r12:'12 meses'};
function niceStep(range, target){ const raw=range/target; const p=Math.pow(10,Math.floor(Math.log10(raw))); const m=raw/p; return (m<1.5?1:m<3?2:m<7?5:10)*p; }
function renderExplore(el, list){
  const k = XR[S.xr] ? S.xr : 'r12'; const pts = list.filter(d=>d.cost!=null && d[k]!=null);
  const cnt = {1:0,2:0,3:0,4:0,5:0}; pts.forEach(d=>cnt[d.sg]++);
  const tp = new Map(); list.forEach(d=>tp.set(d.t,(tp.get(d.t)||0)+1));
  const tpArr = [...tp].sort((a,b)=>b[1]-a[1]); const tMax = Math.max(1,...tpArr.map(x=>x[1]));
  const byG = new Map(); list.forEach(d=>{ if(d[k]!=null){ (byG.get(d.g)||byG.set(d.g,[]).get(d.g)).push(d[k]); } });
  const gArr = [...byG].filter(([,v])=>v.length>=3).map(([g,v])=>[g,median(v),v.length]).sort((a,b)=>b[1]-a[1]).slice(0,30);
  const lo = Math.min(0,...gArr.map(x=>x[1])), hi = Math.max(0.01,...gArr.map(x=>x[1])); const z = -lo/(hi-lo)*100;
  const mix = new Set(list.map(d=>d.ccyK)).size>1;
  el.innerHTML = `<div class="explore">
    <section class="panel">
      <div class="panel-h"><div><h3>Rendimiento vs. costo</h3><p>Cada punto es una clase. Arriba a la izquierda quedan las que rindieron más cobrando menos. Las líneas punteadas marcan la mediana de la selección. Tocá un punto para abrir su ficha.</p></div>
        <div class="seg sm" role="group" aria-label="Período del rendimiento">${Object.entries(XR).map(([x,l])=>`<button data-xr="${x}" aria-pressed="${x===k}">${l}</button>`).join('')}</div></div>
      ${mix?`<p class="mixnote" style="margin:0 0 8px">Estás viendo fondos en pesos y en dólares juntos. Filtrá por moneda para una comparación justa.</p>`:''}
      <div class="legend">${[4,2,3,1,5].filter(i=>cnt[i]).map(i=>`<span><i style="background:var(--s${i})"></i>${SG[i]} <span class="nd">(${cnt[i]})</span></span>`).join('')}</div>
      <div class="chartbox" id="scat"></div>
      <p class="sub">${nf0.format(pts.length)} de ${nf0.format(list.length)} clases informan costo y rendimiento (${XR[k].toLowerCase()}).</p>
    </section>
    <div class="two">
      <section class="panel"><div class="panel-h"><div><h3>Clases por tipo de fondo</h3><p>Tocá un tipo para filtrar.</p></div></div>
        <div class="hbars">${tpArr.map(([t,n])=>`<button class="hb${S.t.includes(t)?' on':''}" data-ft="${esc(t)}"><span class="hl2">${esc(t)}</span><span class="ht"><span class="f" style="left:0;width:${n/tMax*100}%;background:var(--s1)"></span></span><span class="hv">${nf0.format(n)}</span></button>`).join('')}</div></section>
      <section class="panel"><div class="panel-h"><div><h3>Rendimiento mediano por gestora · ${XR[k].toLowerCase()}</h3><p>Gestoras con al menos 3 clases con dato en la selección (las 30 primeras). Tocá una para filtrar.</p></div></div>
        ${gArr.length?`<div class="hbars">${gArr.map(([g,m,n])=>{ const w=Math.abs(m)/(hi-lo)*100; return `<button class="hb${S.g.includes(g)?' on':''}" data-fg="${esc(g)}"><span class="hl2">${esc(g)}<small>${n}</small></span><span class="ht">${lo<0?`<span class="z" style="left:${z}%"></span>`:''}<span class="f" style="left:${m>=0?z:z-w}%;width:${w}%;background:${m>=0?'var(--pos)':'var(--neg)'};opacity:.75"></span></span><span class="hv">${pct(m)}</span></button>`; }).join('')}</div>`:'<p class="sub">No hay suficientes datos para este período con los filtros actuales.</p>'}</section>
    </div></div>`;
  drawScatter($('#scat'), pts, k);
}
function drawScatter(box, pts, k){
  const W = Math.max(300, box.clientWidth), H = W<560?300:W<900?380:440;
  const m = {l:52,r:14,t:14,b:40};
  if (!pts.length){ box.innerHTML='<div class="empty" style="padding:40px 0">No hay clases con costo y rendimiento para mostrar.</div>'; return; }
  // recorte de extremos (1% y 99%) para que un par de outliers no aplasten el gráfico
  const ysAll = pts.map(d=>d[k]).sort((a,b)=>a-b), q = p => ysAll[Math.min(ysAll.length-1,Math.max(0,Math.round(p*(ysAll.length-1))))];
  const yLo = pts.length>40 ? q(.01) : ysAll[0], yHi = pts.length>40 ? q(.99) : ysAll[ysAll.length-1];
  const xs=pts.map(d=>d.cost);
  const xMax = Math.max(0.5, Math.ceil(Math.min(Math.max(...xs),6)*2)/2);
  let yMin=Math.min(0,yLo), yMax=Math.max(0,yHi); const ys0=niceStep(yMax-yMin||1,6); yMin=Math.floor(yMin/ys0)*ys0; yMax=Math.ceil(yMax/ys0)*ys0;
  const clampY = v => Math.min(yMax, Math.max(yMin, v));
  const X=v=>m.l+Math.min(v,xMax)/xMax*(W-m.l-m.r), Y=v=>m.t+(yMax-clampY(v))/(yMax-yMin)*(H-m.t-m.b);
  let g='';
  for(let v=yMin; v<=yMax+1e-9; v+=ys0){ g+=`<line class="${Math.abs(v)<1e-9?'zl':'gl'}" x1="${m.l}" x2="${W-m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${m.l-8}" y="${Y(v)+4}" text-anchor="end">${nf0.format(v)}%</text>`; }
  const xs0 = xMax>3 ? 1 : 0.5;
  for(let v=0; v<=xMax+1e-9; v+=xs0){ g+=`<text x="${X(v)}" y="${H-m.b+18}" text-anchor="middle">${nf1.format(v)}%</text>`; }
  g+=`<line class="gl" x1="${m.l}" x2="${W-m.r}" y1="${H-m.b}" y2="${H-m.b}"/>`;
  g+=`<text x="${(m.l+W-m.r)/2}" y="${H-4}" text-anchor="middle">Costo anual</text>`;
  g+=`<text transform="translate(12 ${(m.t+H-m.b)/2}) rotate(-90)" text-anchor="middle">Rendimiento ${XR[k].toLowerCase()}</text>`;
  const mx=median(xs), my=median(pts.map(d=>d[k]));
  g+=`<line class="ml" x1="${X(mx)}" x2="${X(mx)}" y1="${m.t}" y2="${H-m.b}"/><line class="ml" x1="${m.l}" x2="${W-m.r}" y1="${Y(my)}" y2="${Y(my)}"/>`;
  g+=`<text class="ql" x="${m.l+8}" y="${m.t+12}">Menor costo · mayor rendimiento</text>`;
  const P = pts.map(d=>({d,x:X(d.cost),y:Y(d[k])}));
  g+=P.map(p=>`<circle class="pt" data-pt="${p.d.id}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${W<560?3.5:4}" fill="var(--s${p.d.sg})"/>`).join('');
  g+=`<circle class="hl" r="8" cx="-20" cy="-20"/>`;
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de dispersión: rendimiento ${XR[k]} versus costo anual, ${pts.length} clases">${g}</svg><div class="tip" hidden></div>`;
  const svg=box.querySelector('svg'), tip=box.querySelector('.tip'), hl=box.querySelector('circle.hl');
  let cur=null;
  svg.addEventListener('pointermove', e=>{
    const r=svg.getBoundingClientRect(), sc=W/r.width; const mx2=(e.clientX-r.left)*sc, my2=(e.clientY-r.top)*sc;
    let best=null, bd=16*16; for(const p of P){ const dd=(p.x-mx2)**2+(p.y-my2)**2; if(dd<bd){bd=dd;best=p;} }
    if(!best){ tip.hidden=true; hl.classList.remove('on'); cur=null; svg.style.cursor=''; return; }
    cur=best; svg.style.cursor='pointer';
    hl.setAttribute('cx',best.x); hl.setAttribute('cy',best.y); hl.classList.add('on');
    const d=best.d;
    tip.innerHTML=`<b>${esc(d.n)}</b><div class="tg">${esc(d.g)} · ${esc(d.ccyL)}</div><div class="tr"><span>Costo</span><span>${nf.format(d.cost)}%</span></div><div class="tr"><span>Rend. ${XR[k].toLowerCase()}</span>${pct(d[k])}</div>${d.peer[k]?`<div class="tr"><span>Vs. pares</span><span>Mejor que el ${Math.round(d.peer[k].p*100)}%</span></div>`:''}`;
    tip.hidden=false;
    const px=best.x/sc, py=best.y/sc, tw=tip.offsetWidth, th=tip.offsetHeight;
    tip.style.left = Math.min(Math.max(0, px+14 + tw > r.width ? px-14-tw : px+14), r.width-tw)+'px';
    tip.style.top = Math.max(0, py-th-10)+'px';
  });
  svg.addEventListener('pointerleave', ()=>{ tip.hidden=true; hl.classList.remove('on'); cur=null; });
  svg.addEventListener('click', e=>{ if(cur) { e.stopPropagation(); openFund(cur.d.id); } });
}

/* ---------------------------------------------------------------- ficha (drawer) */
function peerHtml(d){
  const rows = [['cost','Costo','Más barato que el'],['r1m','Rend. 1 mes','Mejor que el'],['rytd','Rend. en el año','Mejor que el'],['r12','Rend. 12 meses','Mejor que el'],['au','Patrimonio','Más grande que el']].filter(([k])=>d.peer[k]);
  if (!rows.length) return '';
  const fmtMed = (k,v) => k==='au' ? 'US$ '+nf0.format(v)+' M' : nf.format(v)+'%';
  const lbl = d.peer[rows[0][0]].lbl;
  return `<div class="d-sec"><h3>Frente a sus pares</h3>${rows.map(([k,l,t])=>{ const p=d.peer[k]; const pc=Math.round(p.p*100);
    return `<div class="peer" title="Comparado con ${p.n} clases (${esc(p.lbl)}). Mediana: ${fmtMed(k,p.med)}"><span class="pl">${l}</span><div class="ptrack" role="img" aria-label="${t} ${pc}% de sus pares"><div class="pmed"></div><div class="pdot" style="left:${Math.min(97,Math.max(3,pc))}%"></div></div><span class="pv">${t} <b>${pc}%</b></span></div>`; }).join('')}
    <p class="peerhint">Pares: clases de ${esc(lbl)}. La línea central es la mediana del grupo; hacia la derecha, mejor. Pasá el cursor para ver el tamaño del grupo.</p></div>`;
}
function cartHtml(d, all){
  if (!d.cart.length) return `<div class="d-sec"><h3>Composición de cartera</h3><p class="sub" style="margin:0">CAFCI no publica la cartera de esta clase.</p></div>`;
  const items = all ? d.cart : d.cart.slice(0,12); const mx = Math.max(...d.cart.map(x=>x[1]),1);
  const [y,m,dd] = (d.fc||'').split('-');
  return `<div class="d-sec" id="cartSec"><h3>Composición de cartera${d.fc?`<span class="nd">al ${+dd}/${+m}/${y}</span>`:''}</h3><div class="cart">${items.map(([n,p])=>`<div class="crow"><span class="cn" title="${esc(n)}">${esc(n)}</span><span class="ctk"><i style="width:${p/mx*100}%"></i></span><span class="cv">${nf1.format(p)}%</span></div>`).join('')}</div>
    ${d.cart.length>12?`<button class="linkbtn" id="cartAll" style="margin-top:8px">${all?'Ver menos':`Ver los ${d.cart.length} activos`}</button>`:''}</div>`;
}
let openId = null, cartOpen = false;
function openFund(id, keep){
  const d = DATA[id]; if (!d) return;
  if (openId!==id) cartOpen=false;
  openId=id;
  const prevScroll = keep ? ($('#drawer .d-body')?.scrollTop||0) : 0;
  const kv = (k,v)=> v!=null && v!=='' && !/^\s*$/.test(String(v)) ? `<dt>${k}</dt><dd>${v}</dd>` : '';
  const bars = [['rd','Día'],['r7','7 días'],['r1m','1 mes'],['r3m','90 días'],['r6m','180 días'],['rytd','En el año'],['r12','12 meses']];
  const vals = bars.map(([k])=>d[k]).filter(v=>v!=null);
  const maxAbs = Math.max(1, ...vals.map(Math.abs));
  const hasNeg = vals.some(v=>v<0); const zero = hasNeg ? 50 : 0;
  const barHtml = bars.map(([k,l])=>{
    const v=d[k]; const t=d.tna[TNAK[k]];
    let fill='';
    if (v!=null){ const w = Math.abs(v)/maxAbs*(hasNeg?50:100); fill = `<div class="fill" style="left:${v>=0?zero:zero-w}%;width:${w}%;background:${v>=0?'var(--pos)':'var(--neg)'};opacity:.8"></div>`; }
    const note = t!=null ? `<div class="raw">TNA ${nf.format(t)}%</div>` : (k==='rd'&&v==null ? '<div class="raw">Disponible desde el segundo día de datos</div>' : '');
    return `<div class="bar"><span class="bl">${l}</span><div class="track">${hasNeg?`<div class="zero" style="left:50%"></div>`:''}${fill}</div><span class="bv">${pct(v)}</span>${note}</div>`;
  }).join('');
  const sib = (BY_FUND.get(d.fid)||[]).filter(x=>x!==d);
  const hon = d.hon; const hv = v => v==null ? '<span class="nd">—</span>' : nf4.format(v)+'%';
  const [fy,fm,fd] = (d.f||'--').split('-'); const [ry,rm,rdd] = (d.fr||'--').split('-');
  $('#drawer').innerHTML = `
    <div class="d-head">
      <div class="d-top"><div><div class="d-g">${esc(d.g)}</div><h2>${esc(d.n)}</h2></div><button class="x" id="dClose" aria-label="Cerrar ficha">✕</button></div>
      <div class="d-pills">${typePill(d)}<span class="pill t-${d.ccyK.toLowerCase()}">${esc(d.ccyL)}</span><span class="pill t-ot">${esc(d.hz)}</span><span class="pill t-ot">Rescate ${esc(d.liqL)}</span>${d.tm?`<span class="pill t-ot">${esc(d.tm)}</span>`:''}${!d.susc?'<span class="pill" style="background:var(--warn-soft);color:var(--warn)">Cerrado a suscripción</span>':''}${d.pend?'<span class="pill" style="background:var(--warn-soft);color:var(--warn)">Sin valores publicados</span>':''}</div>
    </div>
    <div class="d-body">
      <div class="d-sec"><div class="kpis">
        <div><span>Patrimonio</span><b>${patFmt(d)}</b><small>${d.au!=null&&d.ccyK==='ARS'?'≈ US$ '+nf0.format(d.au)+' M':''}</small></div>
        <div><span>Costo anual</span><b>${costFmt(d)}</b><small>Gerente + depositaria${hon.gastos?' + gastos':''}</small></div>
        <div><span>Cuotaparte</span><b>${d.vcp==null?'<span class="nd">—</span>':nf4.format(d.vcp)}</b><small>${d.f?`al ${+fd}/${+fm}/${fy}`:''}</small></div>
      </div></div>
      ${d.err?`<div class="d-sec"><div class="alert"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.5"/></svg><div>No pudimos leer la ficha de esta clase en la última actualización. Consultá los valores en la ficha oficial de CAFCI.</div></div></div>`:''}
      <div class="d-sec"><h3>Rendimiento${d.fr?`<span class="nd">al ${+rdd}/${+rm}/${ry}</span>`:''}</h3><div class="bars">${barHtml}</div>
        <p class="sub" style="margin-top:10px">Rendimiento directo del período (variación de la cuotaparte). Debajo, la TNA que publica CAFCI.</p></div>
      ${peerHtml(d)}
      <div class="d-sec"><h3>Honorarios y comisiones <span class="nd">% anual / por operación</span></h3><div class="hon">
        <div><span>Gerente</span><b>${hv(hon.gerente)}</b></div><div><span>Depositaria</span><b>${hv(hon.depositaria)}</b></div><div><span>Gastos ordinarios</span><b>${hv(hon.gastos)}</b></div>
        <div><span>Comisión de ingreso</span><b>${hv(hon.ingreso)}</b></div><div><span>Comisión de rescate</span><b>${hv(hon.rescate)}</b></div><div><span>Transferencia</span><b>${hv(hon.transferencia)}</b></div>
      </div>${hon.exito!=null?`<p class="sub">Comisión de éxito: ${hv(hon.exito)}</p>`:''}</div>
      ${cartHtml(d, cartOpen)}
      ${d.calif.length?`<div class="d-sec"><h3>Calificación de riesgo</h3><dl class="kv">${d.calif.map(([c,v,f])=>`<dt>${esc(c)}</dt><dd><b>${esc(v)}</b>${f?` <span class="nd">· ${f.split('-').reverse().join('/')}</span>`:''}</dd>`).join('')}</dl></div>`:''}
      <div class="d-sec"><h3>Perfil del fondo</h3><dl class="kv">
        ${kv('Fondo',esc(d.fondo))}${kv('Sociedad gerente',esc(d.g))}${kv('Sociedad depositaria',esc(d.dep))}${kv('Tipo de fondo',esc(d.t)+(d.tm?' · '+esc(d.tm):''))}${d.tk==='mm'&&d.td&&!/no aplica/i.test(d.td)?kv('Tipo de money market',esc(d.td)):''}
        ${kv('Moneda',esc(d.ccyRaw))}${kv('Región',esc(d.geo))}${kv('Horizonte',esc(d.hz))}${d.dur&&!/no registrad/i.test(d.dur)?kv('Duration',esc(d.dur)):''}${d.bm&&!/no registrad/i.test(d.bm)?kv('Benchmark',esc(d.bm)):''}
        ${kv('Plazo de rescate',esc(d.liqL==='CI'?'Contado inmediato (en el día)':d.liqL))}${kv('Inversión mínima',d.min==null?null:`${sym(d)} ${nf.format(d.min)}`)}${kv('Inicio',d.ini?d.ini.split('-').reverse().join('/'):null)}${kv('Código CNV',esc(d.cnv))}${kv('Ticker Bloomberg',esc(d.bbg))}${kv('ISIN',esc(d.isin))}
      </dl></div>
      ${d.obj?`<div class="d-sec"><h3>Objetivo</h3><div class="prose">${esc(d.obj)}</div></div>`:''}
      ${sib.length?`<div class="d-sec"><h3>Otras clases de este fondo</h3><div class="clslist">${[d,...sib].sort((a,b)=>a.n.localeCompare(b.n,'es')).map(x=>`<button class="clsrow${x===d?' cur':''}" ${x===d?'disabled':`data-open="${x.id}"`}><span class="cll">${esc(x.n)}${x===d?' <span class="curtag">— esta ficha</span>':''}</span><span class="clster">Costo ${x.cost==null?'—':nf.format(x.cost)+'%'} · 12 meses ${x.r12==null?'—':nf.format(x.r12)+'%'}</span></button>`).join('')}</div></div>`:''}
      <div class="d-sec"><h3>Fuente</h3>
        <div class="d-actions">
          <a class="btn primary" href="${esc(d.url)}" target="_blank" rel="noopener">Ficha oficial en CAFCI ↗</a>
          <button class="btn" id="dCmp">${cmp.has(id)?'Quitar de comparar':'Agregar a comparar'}</button>
        </div>
        <div class="lchecks" aria-label="Guardar en lista"><span class="sub" style="margin-bottom:2px">Guardar en mis listas</span>
          ${LISTS.map(l=>`<label class="opt"><input type="checkbox" data-dl="${l.id}"${inList(l.id,d)?' checked':''}><span class="lbl">${esc(l.name)}</span><span class="ct">${l.keys.length}</span></label>`).join('')}
          <div class="newlist"><input id="dlName" placeholder="Crear lista y guardar" aria-label="Crear lista nueva con este fondo" maxlength="40"><button id="dlAdd">Crear</button></div>
        </div>
        <p class="sub" style="margin-top:10px">Ficha publicada por la Cámara Argentina de Fondos Comunes de Inversión, con la cartera completa y la opción «Imprimir/PDF». El reglamento de gestión está disponible en el sitio de ${esc(d.g)} y en la CNV.</p>
      </div>
    </div>`;
  $('#dClose').onclick=closeFund;
  $('#dCmp').onclick=()=>toggleCmp(id);
  const ca=$('#cartAll'); if(ca) ca.onclick=()=>{ cartOpen=!cartOpen; openFund(id,true); };
  $('#drawer').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openFund(+b.dataset.open));
  $('#drawer').querySelectorAll('[data-dl]').forEach(c=>c.onchange=()=>toggleInList(c.dataset.dl,d));
  const mk=()=>{ createList($('#dlName').value,d); };
  $('#dlAdd').onclick=mk; $('#dlName').onkeydown=e=>{ if(e.key==='Enter') mk(); };
  if (keep) $('#drawer .d-body').scrollTop = prevScroll;
  else { $('#drawer').classList.add('on'); $('#drawer').setAttribute('aria-hidden','false'); $('#scrim').classList.add('on'); $('#drawer').querySelector('.d-body').scrollTop=0; $('#dClose').focus(); }
  try{ history.replaceState(null,'','#c'+d.cid); }catch(e){}
}
function closeFund(){ openId=null; $('#drawer').classList.remove('on'); $('#drawer').setAttribute('aria-hidden','true'); $('#scrim').classList.remove('on'); try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} }
$('#scrim').onclick=()=>{ closeFund(); closeFilters(); };

/* ---------------------------------------------------------------- filtros en móvil y barra */
const closeFilters=()=>{ $('#filters').classList.remove('on'); if(!$('#drawer').classList.contains('on')) $('#scrim').classList.remove('on'); };
$('#fOpen').onclick=()=>{ $('#filters').classList.add('on'); $('#scrim').classList.add('on'); };
$('#fClose').onclick=closeFilters;
function clearAll(){ const keep={sort:S.sort,view:S.view,xr:S.xr}; S=Object.assign(structuredClone(DEF),keep); $('#q').value=''; Object.values(facetState).forEach(f=>f.q=''); update(); }
$('#clearAll').onclick=clearAll;
$('#q').addEventListener('input', e=>{ S.q=e.target.value.trim(); clearTimeout(tmr); tmr=setTimeout(update,160); });
$('#sort').addEventListener('change', e=>{ S.sort=e.target.value; update(); });
const setView=v=>{ S.view=v; ['table','cards','explore'].forEach(x=>$('#v'+{table:'Table',cards:'Cards',explore:'Explore'}[x]).setAttribute('aria-pressed',v===x)); renderResults(); save(); };
$('#vTable').onclick=()=>setView('table'); $('#vCards').onclick=()=>setView('cards'); $('#vExplore').onclick=()=>setView('explore');
document.addEventListener('keydown', e=>{
  if (e.key==='/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){ e.preventDefault(); $('#q').focus(); }
  if (e.key==='Escape'){ if(!$('#modal').hidden) $('#modal').hidden=true; else if(openId!=null) closeFund(); else closeFilters(); }
});
let lastW = window.innerWidth, rT; addEventListener('resize', ()=>{ const w=window.innerWidth; if ((w<760)!==(lastW<760)) renderResults(); else if (S.view==='explore' && Math.abs(w-lastW)>40){ clearTimeout(rT); rT=setTimeout(renderResults,150); } else return; lastW=w; });

/* ---------------------------------------------------------------- arranque */
function masthead(){
  const g=new Set(DATA.map(d=>d.g)).size, f=new Set(DATA.map(d=>d.fid)).size;
  const conDatos = DATA.filter(d=>!d.pend).length;
  let fecha = '—';
  if (META.maxF){ const [y,m,dd]=META.maxF.split('-'); fecha = `${+dd} ${MESES[+m-1]}`; }
  $('#mastMeta').innerHTML = `<div><b class="num">${nf0.format(f)}</b><span>Fondos</span></div><div><b class="num">${nf0.format(conDatos)}</b><span>Clases con datos</span></div><div><b>${g}</b><span>Gestoras</span></div><div><b>${fecha}</b><span>Valores al</span></div>`;
  const gen = META.generado ? new Date(META.generado) : null;
  $('#foot').innerHTML = `Fuente: <b>CAFCI</b> — Cámara Argentina de Fondos Comunes de Inversión (estadisticas.cafci.org.ar).${gen?` Última actualización: ${gen.toLocaleString('es-AR',{dateStyle:'long',timeStyle:'short'})}.`:''}`;
}
async function init(){
  try {
    const r = await fetch('data/fondos-ar.json', {cache:'no-cache'});
    if (!r.ok) throw new Error('HTTP '+r.status);
    const j = await r.json();
    META = {generado:j.generado, usd_ars:j.usd_ars};
    DATA = derive(j.clases||[], j.usd_ars);
  } catch(e){
    $('#results').innerHTML = `<div class="tablebox"><div class="empty"><b>No pudimos cargar los datos</b>Probá recargar la página en unos minutos.</div></div>`;
    console.error(e); return;
  }
  const fs = DATA.map(d=>d.f).filter(Boolean).sort(); META.maxF = fs[fs.length-1];
  DATA.forEach(d=>{ BY_CID.set(d.cid,d); (BY_FUND.get(d.fid)||BY_FUND.set(d.fid,[]).get(d.fid)).push(d); });
  computePeers();
  masthead();
  $('#q').value=S.q; syncSortSel(); ['table','cards','explore'].forEach(x=>$('#v'+{table:'Table',cards:'Cards',explore:'Explore'}[x]).setAttribute('aria-pressed',S.view===x));
  update();
  const hm = location.hash.match(/^#c(\d+)$/); if (hm && BY_CID.get(+hm[1])) openFund(BY_CID.get(+hm[1]).id);
}
init();
