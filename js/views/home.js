/*
  views/home.js — "Where I stand": the 10-second overview.
*/

import { escapeHtml } from '../utils.js';
import { unitsEarned, gpa } from '../gpa.js';
import { currentTerm, termOrder, termKey, STATUS_LABELS } from '../terms.js';

const GEAR_ICON = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>';

export function render(container, app) {
  const { classes, settings } = app.data;
  const now = currentTerm();

  // ---- The numbers ----
  const earned = unitsEarned(classes);
  const needed = settings.unitsNeeded;
  const left = needed ? Math.max(needed - earned, 0) : null;
  const percent = needed ? Math.min(earned / needed, 1) : 0;
  const currentClasses = classes.filter((c) => c.status === 'in-progress');
  const unitsNow = sum(currentClasses);
  const unitsPlanned = sum(classes.filter((c) => c.status === 'planned'));
  const myGpa = gpa(classes);

  // Average units per quarter you've finished (for the "how long" estimate)
  const finishedQuarters = new Set(
    classes.filter((c) => c.status === 'completed').map((c) => termKey(c.season, c.year))
  );
  const pace = finishedQuarters.size ? earned / finishedQuarters.size : null;

  // ---- The progress ring (an SVG circle drawn partway around) ----
  const circumference = 2 * Math.PI * 42;
  const ring = `
    <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
      <defs><linearGradient id="ringColor" x1="0" x2="1">
        <stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent2)"/>
      </linearGradient></defs>
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface2)" stroke-width="10"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#ringColor)" stroke-width="10"
        stroke-linecap="round" transform="rotate(-90 50 50)"
        stroke-dasharray="${percent * circumference} ${circumference}"
        ${percent === 0 ? 'stroke-opacity="0"' : ''}/>
      <text x="50" y="56" text-anchor="middle" font-size="20" font-weight="700" fill="var(--text)">
        ${needed ? Math.round(percent * 100) + '%' : '—'}</text>
    </svg>`;

  let heroText;
  if (!needed) {
    heroText = `<div class="big">${earned} <span class="muted">units</span></div>
      <a href="#settings" class="small">Set units needed to graduate ›</a>`;
  } else {
    const estimate = pace && left > 0
      ? ` · about ${Math.ceil(left / pace)} quarters at ${round1(pace)} units`
      : '';
    heroText = `<div class="big">${earned} <span class="muted" style="font-size:16px">/ ${needed} units</span></div>
      <div class="muted">${left > 0 ? `${left} to go${estimate}` : 'Unit requirement met 🎉'}</div>`;
  }

  // ---- This quarter's classes ----
  const nowRows = currentClasses
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((c) => `
      <a class="row" href="#class/${c.id}">
        <div class="main"><div class="code">${escapeHtml(c.code)}</div>
          <div class="title">${escapeHtml(c.title)}</div></div>
        <span class="muted">${c.units} u</span>
        <span class="pill in-progress">${STATUS_LABELS['in-progress']}</span>
      </a>`).join('');

  // ---- Next quarter's plan (helps answer "what's next?") ----
  const nextOrder = termOrder(now.season, now.year) + 1;
  const nextClasses = classes.filter((c) => termOrder(c.season, c.year) === nextOrder);

  container.innerHTML = `
    <div class="header">
      <div class="eyebrow">${now.season} ${now.year}</div>
      <h1>Where I stand</h1>
      <a class="icon-btn" href="#settings" aria-label="Settings">${GEAR_ICON}</a>
    </div>

    <div class="card hero">${ring}<div>${heroText}</div></div>

    <div class="tiles">
      <div class="tile"><b>${myGpa === null ? '—' : myGpa.toFixed(2)}</b><span>GPA</span></div>
      <div class="tile"><b>${unitsNow}</b><span>Units now</span></div>
      <div class="tile"><b>${unitsPlanned}</b><span>Units planned</span></div>
    </div>

    ${classes.length === 0 ? `
      <div class="insight"><b>Start here:</b> open <a href="#plan">Plan</a> and tap
        <b>+</b> on a quarter to add your classes from Stanford's catalog.</div>` : ''}

    ${nextClasses.length ? `
      <div class="insight"><b>Next quarter:</b> ${nextClasses.length} class${nextClasses.length === 1 ? '' : 'es'},
        ${sum(nextClasses)} units planned.</div>` : ''}

    <div class="section-h"><h2>This quarter</h2><a href="#plan">Plan ›</a></div>
    ${nowRows
      ? `<div class="list">${nowRows}</div>`
      : `<div class="card muted">No classes marked in progress.</div>`}

    <div class="section-h"><h2>Majors</h2><a href="#requirements">Reqs ›</a></div>
    <div class="card muted">ME and MS&amp;E progress bars appear here once the
      requirements are added (next step).</div>
  `;
}

function sum(list) {
  return list.reduce((total, c) => total + (Number(c.units) || 0), 0);
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
