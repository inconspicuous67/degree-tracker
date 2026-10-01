/*
  views/plan.js — the four-year plan: every quarter, with its classes as chips.
  Tap a chip to edit that class. Tap "+" to add a class to that quarter.
*/

import { escapeHtml } from '../utils.js';
import {
  currentTerm, academicYearOf, academicYearLabel, quartersOf, termKey, termOrder, STATUS_LABELS,
} from '../terms.js';
import { gpa } from '../gpa.js';

export function render(container, app, route) {
  const { classes, settings } = app.data;
  const now = currentTerm();
  const thisYear = academicYearOf(now.season, now.year);

  // Which academic years to offer: from your first year (set in Settings,
  // or your earliest class) through at least 4 years, plus any year with classes.
  const classYears = classes.map((c) => academicYearOf(c.season, c.year));
  const first = Math.min(settings.startYear ?? thisYear, ...classYears, thisYear);
  const last = Math.max(first + 3, thisYear, ...classYears);
  const years = [];
  for (let y = first; y <= last; y++) years.push(y);

  // The year being shown: from the address (#plan/2026), else this year
  const shown = Number(route.param) || thisYear;

  const tabs = years.map((y) => `
    <a href="#plan/${y}" class="${y === shown ? 'on' : ''}">${
      settings.startYear ? `Year ${y - settings.startYear + 1}` : academicYearLabel(y)}</a>`).join('');

  const quarters = quartersOf(shown).map(({ season, year }) => {
    const inQuarter = classes
      .filter((c) => c.season === season && c.year === year)
      .sort((a, b) => a.code.localeCompare(b.code));

    // Hide Summer unless it has classes (most people skip it)
    if (season === 'Summer' && inQuarter.length === 0) return '';

    const units = inQuarter.reduce((t, c) => t + (Number(c.units) || 0), 0);
    const quarterGpa = gpa(inQuarter);
    const isNow = termOrder(season, year) === termOrder(now.season, now.year);

    const chips = inQuarter.map((c) => `
      <a class="chip ${c.status}" href="#class/${c.id}">
        ${escapeHtml(c.code)}
        <small>${c.units} u · ${c.grade ? escapeHtml(c.grade) : STATUS_LABELS[c.status].toLowerCase()}</small>
      </a>`).join('');

    return `
      <div class="quarter">
        <div class="quarter-h">
          <span>${season} ${year}${isNow ? ' · now' : ''}</span>
          <span>${units} units${quarterGpa !== null ? ` · GPA ${quarterGpa.toFixed(2)}` : ''}</span>
        </div>
        <div class="chips">
          ${chips}
          <a class="chip add" href="#explore?term=${termKey(season, year)}" aria-label="Add a class to ${season} ${year}">+</a>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="header">
      <div class="eyebrow">${academicYearLabel(shown)}</div>
      <h1>Plan</h1>
    </div>
    <div class="seg">${tabs}</div>
    ${quarters}
    ${!settings.startYear ? `<p class="muted">Tip: set your first year at Stanford in
      <a href="#settings">Settings</a> to label these Year 1–4.</p>` : ''}
    <div class="section-h"><h2>Summer</h2></div>
    <p class="muted">Taking a summer class? Add it from
      <a href="#explore?term=${termKey('Summer', shown + 1)}">Explore</a> and Summer ${shown + 1} will appear above.</p>
  `;
}
