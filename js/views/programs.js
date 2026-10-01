/*
  views/programs.js — choose the majors and minors you're considering.
  Your choices are saved in settings.programs (e.g. ['ME-BS', 'MGTSC-BS']).
*/

import { escapeHtml } from '../utils.js';
import { loadPrograms } from '../requirements-engine.js';

let lastQuery = '';

export async function render(container, app) {
  container.innerHTML = `
    <div class="header">
      <div class="eyebrow"><a href="#requirements">‹ Requirements</a></div>
      <h1>My programs</h1>
    </div>
    <p class="muted">Pick every major and minor you're considering. You can compare them on Home and in Reqs.</p>
    <div class="search">
      <input id="q" type="search" placeholder="Search majors and minors" autocomplete="off" autocorrect="off">
    </div>
    <div id="list"><p class="muted">Loading programs…</p></div>
  `;

  const programs = await loadPrograms();
  const chosen = app.data.settings.programs;
  const input = container.querySelector('#q');
  const list = container.querySelector('#list');
  input.value = lastQuery;

  function row(p) {
    const on = chosen.includes(p.code);
    return `
      <label class="row" style="cursor:pointer">
        <div class="main"><div class="code">${escapeHtml(p.name)}</div>
          <div class="title">${escapeHtml(p.degree)}</div></div>
        <input type="checkbox" data-code="${escapeHtml(p.code)}" ${on ? 'checked' : ''}
          style="width:22px;height:22px;accent-color:var(--accent);appearance:auto;-webkit-appearance:checkbox">
      </label>`;
  }

  function show() {
    lastQuery = input.value;
    const q = input.value.trim().toLowerCase();
    const match = (p) => !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    const mine = programs.filter((p) => chosen.includes(p.code));
    const majors = programs.filter((p) => p.kind === 'major' && match(p));
    const minors = programs.filter((p) => p.kind === 'minor' && match(p));
    list.innerHTML = `
      ${mine.length && !q ? `<div class="section-h"><h2>Selected</h2></div><div class="list">${mine.map(row).join('')}</div>` : ''}
      <div class="section-h"><h2>Majors</h2><span class="muted">${majors.length}</span></div>
      <div class="list">${majors.map(row).join('') || '<div class="row muted">No matches</div>'}</div>
      <div class="section-h"><h2>Minors</h2><span class="muted">${minors.length}</span></div>
      <div class="list">${minors.map(row).join('') || '<div class="row muted">No matches</div>'}</div>
      <p class="muted small">From the 2026–27 Stanford Bulletin.</p>`;
  }

  // Tick or untick a program → save right away
  list.addEventListener('change', (event) => {
    const code = event.target.dataset.code;
    if (!code) return;
    const index = chosen.indexOf(code);
    if (event.target.checked && index === -1) chosen.push(code);
    if (!event.target.checked && index !== -1) chosen.splice(index, 1);
    app.save();
    if (!input.value.trim()) show(); // refresh the "Selected" list
  });
  input.addEventListener('input', show);
  show();
}
