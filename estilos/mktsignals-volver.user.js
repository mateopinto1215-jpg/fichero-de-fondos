// ==UserScript==
// @name         Fichero de Fondos — botón «Volver al Fichero» en MKTSignals
// @namespace    github.com/mateopinto1215-jpg/fichero-de-fondos
// @version      1.0.0
// @description  Agrega en funds.mktsignals.org un botón fijo para volver al Fichero de Fondos (Argentina o Internacional). Solo agrega un enlace; no lee ni modifica los datos del sitio.
// @author       Mateo
// @match        https://funds.mktsignals.org/*
// @run-at       document-idle
// @grant        none
// @noframes
// @updateURL    https://raw.githubusercontent.com/mateopinto1215-jpg/fichero-de-fondos/main/estilos/mktsignals-volver.user.js
// @downloadURL  https://raw.githubusercontent.com/mateopinto1215-jpg/fichero-de-fondos/main/estilos/mktsignals-volver.user.js
// ==/UserScript==

(function () {
  'use strict';
  const FICHERO = 'https://mateopinto1215-jpg.github.io/fichero-de-fondos/';
  const ID = 'fichero-volver';

  const css = `
    #${ID}{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147483000;display:flex;align-items:stretch;
      font:500 13px/1 "Fx IBM Plex Sans","IBM Plex Sans",-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      border-radius:10px;overflow:hidden;box-shadow:0 1px 2px rgba(20,32,27,.12),0 8px 24px rgba(20,32,27,.22);background:#1D5A4C;color:#fff}
    #${ID} a{display:flex;align-items:center;gap:8px;padding:10px 13px;color:inherit;text-decoration:none;white-space:nowrap}
    #${ID} a:hover{background:rgba(255,255,255,.12)}
    #${ID} a+a{border-left:1px solid rgba(255,255,255,.22)}
    #${ID} .fx-main{font-weight:600}
    #${ID} svg{flex:none}
    @media (prefers-color-scheme:dark){#${ID}{background:#72C2A8;color:#0E1412}#${ID} a+a{border-left-color:rgba(14,20,18,.25)}#${ID} a:hover{background:rgba(14,20,18,.10)}}
    @media (max-width:640px){#${ID} .fx-lbl{display:none}}
    @media print{#${ID}{display:none}}
  `;
  const icono = '<svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true"><path d="M17 23v-5a3 3 0 0 1 3-3h11l4 4h8a3 3 0 0 1 3 3v1" fill="none" stroke="currentColor" stroke-opacity=".7" stroke-width="5" stroke-linejoin="round"/><rect x="11" y="23" width="42" height="29" rx="4" fill="none" stroke="currentColor" stroke-width="5"/><rect x="24" y="32" width="16" height="6" rx="3" fill="#E3B45C"/></svg>';
  const flecha = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';

  function montar() {
    if (document.getElementById(ID) || !document.body) return;
    if (!document.getElementById(ID + '-css')) {
      const st = document.createElement('style');
      st.id = ID + '-css';
      st.textContent = css;
      document.head.appendChild(st);
    }
    const nav = document.createElement('nav');
    nav.id = ID;
    nav.setAttribute('aria-label', 'Volver al Fichero de Fondos');
    nav.innerHTML =
      `<a class="fx-main" href="${FICHERO}" title="Volver al Fichero · Argentina">${flecha}${icono}<span class="fx-lbl">Fichero · Argentina</span></a>` +
      `<a href="${FICHERO}#int" title="Volver al Fichero · Internacional"><span>Internacional</span></a>`;
    document.body.appendChild(nav);
  }

  montar();
  // El sitio es una aplicación de una sola página: si el botón desaparece al navegar, se vuelve a agregar.
  new MutationObserver(() => { if (!document.getElementById(ID)) montar(); })
    .observe(document.documentElement, { childList: true, subtree: true });
})();
