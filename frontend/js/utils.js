/* ============================================================
   utils.js — Helpers DOM et UI partagés
   ============================================================ */

/** Raccourci getElementById */
const $ = (id) => document.getElementById(id);

/** Crée un élément avec classe et innerHTML optionnels */
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const showEl = (id) => $(id)?.classList.remove('hidden');
const hideEl = (id) => $(id)?.classList.add('hidden');

/**
 * Affiche un message temporaire dans un élément .msg
 * @param {HTMLElement} msgEl
 * @param {'success'|'error'|'warn'} type
 * @param {string} text
 */
function showMsg(msgEl, type, text) {
  msgEl.textContent = text;
  msgEl.className   = `msg msg-${type} show`;
  setTimeout(() => msgEl.classList.remove('show'), 5000);
}
