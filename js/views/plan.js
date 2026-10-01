/*
  views/plan.js — your four-year plan, two ways:
    #plan/2026   → one academic year, big chips (tap to edit, "+" to add)
    #plan/all    → OVERVIEW: all four years at once, plus "at a glance"
                   progress (units, Ways, writing, your majors/minors) with
                   the courses counting toward each.
*/

import { escapeHtml } from '../utils.js';
import {
  currentTerm, academicYearOf, academicYearLabel, quartersOf, termKey, termOrder, STATUS_LABELS, firstAutumn,
} from '../terms.js';
import { gpa, unitsEarned } from '../gpa.js';
import { loadCatalog } from '../catalog.js';
import { loadPrograms, findProgram, evaluateProgram, leaves } from '../requirements-engine.js';
import { GENERAL_REQUIREMENTS } from '../general-reqs.js';

export async function render(container, app, route) {
  const { classes, settings } = app.data;
  const now = currentTerm();
  const thisYear = academicYearOf(now.season, now.year);

  // Which academic years to offer: your four years (from your class year in
  // Settings), plus any other year you have classes in.
  const start = firstAutumn(settings);
  const classYears = classes.map((c) => academicYearOf(c.season, c.year));
  const first = Math.min(start ?? thisYear, ...classYears, thisYear);
  const last = Math.max(first + 3, thisYear, ...classYears);
  const years = [];
  for (let y = first; y <= last; y++) years.push(y);

  const overview = route.param === 'all';
  const shown = Number(route.param) || thisYear;
  const yearName = (y) => (start ? `Year ${y - start + 1}` : academicYearLabel(y));

  const tabs = years.map((y) => `
    <a href="#plan/${y}" class="${!overview && y === shown ? 'on' : ''}">${yearName(y)}</a>`).join('')
    + `<a href="#plan/all" class="${overview ? 'on' : ''}">All</a>`;

  const header = `
    <div class="header">
      <div class="eyebrow">${overview ? 'Overview' : academicYearLabel(shown)}</div>
      <h1>Plan</h1>
    </div>
    <div class="seg">${tabs}</div>
    ${!start ? `<div class="insight"><b>Set your class year</b> in
      <a href="#settings">Settings</a> to see all four years (Year 1–4).</div>` : ''}`;

  if (!overview) {
    container.innerHTML = header + yearView(shown, classes, now) + `
      <div class="section-h"><h2>Summer</h2></div>
      <p class="muted">Taking a summer class? Add it from
        <a href="#explore?term=${termKey('Summer', shown + 1)}">Explore</a> and Summer ${shown + 1} will appear above.</p>`;
    return;
  }

  // ---------- Overview ----------
  container.innerHTML = header + `<p class="muted">Loading overview…</p>`;
  await Promise.all([loadCatalog(), loadPrograms()]);
  if (!location.hash.startsWith('#plan/all')) return; // you moved on while loading

  const grid = years.map((y) => {
    const quarters = quartersOf(y).filter(({ season, year }) =>
      season !== 'Summer' || classes.some((c) => c.season === season && c.year === year));
    const yearUnits = classes.filter((c) => academicYearOf(c.season, c.year) === y)
      .reduce((t, c) => t + (Number(c.units) || 0), 0);
    return `
      <div class="section-h"><h2>${yearName(y)} <span class="muted small">${academicYearLabel(y)}</span></h2>
        <span class="muted small">${yearUnits} units</span></div>
      <div class="mini-grid" style="grid-template-columns:repeat(${quarters.length},1fr)">
        ${quarters.map(({ season, year }) => miniQuarter(season, year, classes, now)).join('')}
      </div>`;
  }).join('');

  container.innerHTML = header + `
    <div class="overview">
      <div>${grid}</div>
      <aside>${glance(app)}</aside>
    </div>`;
}

// One academic year with big chips (the original Plan view)
function yearView(shown, classes, now) {
  return quartersOf(shown).map(({ season, year }) => {
    const inQuarter = classesIn(classes, season, year);
    if (season === 'Summer' && inQuarter.length === 0) return ''; // most people skip it

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
}

// A small quarter box for the overview grid
function miniQuarter(season, year, classes, now) {
  const inQuarter = classesIn(classes, season, year);
  const units = inQuarter.reduce((t, c) => t + (Number(c.units) || 0), 0);
  const isNow = termOrder(season, year) === termOrder(now.season, now.year);
  return `
    <div class="mini ${isNow ? 'now' : ''}">
      <div class="mini-h"><span>${season.slice(0, 3)} ${String(year).slice(2)}</span><span>${units}u</span></div>
      ${inQuarter.map((c) => `<a class="mini-c ${c.status}" href="#class/${c.id}">${escapeHtml(c.code)}</a>`).join('')}
      <a class="mini-add" href="#explore?term=${termKey(season, year)}" aria-label="Add to ${season} ${year}">+</a>
    </div>`;
}

// "At a glance" panel: units, then every requirement with the courses filling it
function glance(app) {
  const { classes, settings } = app.data;
  const byId = new Map(classes.map((c) => [c.id, c]));
  const earned = unitsEarned(classes);
  const planned = classes.filter((c) => c.status !== 'completed').reduce((t, c) => t + (Number(c.units) || 0), 0);
  const needed = settings.unitsNeeded;

  const chip = (c) => `<a class="mini-c ${c.status}" href="#class/${c.id}">${escapeHtml(c.code)}</a>`;
  const statusMark = { done: '✓', progress: '◔', remaining: '○', manual: '?' };

  const general = evaluateProgram(GENERAL_REQUIREMENTS, classes, settings.overrides);
  const generalRows = leaves(general.blocks.flatMap((b) => b.rules))
    .filter((r) => r.status !== 'manual')
    .map((r) => `
      <div class="glance-row">
        <div class="glance-top"><span>${statusMark[r.status]} ${escapeHtml(r.name)}</span>
          <span class="${r.status === 'done' ? 'ok' : 'muted'}">${r.overridden ? 'marked' : `${r.have.count}/${r.need.count}`}</span></div>
        <div class="glance-chips">${(r.matched || []).map((id) => byId.get(id)).filter(Boolean).map(chip).join('')}</div>
      </div>`).join('');

  const programs = settings.programs.map(findProgram).filter(Boolean)
    .map((p) => evaluateProgram(p, classes, settings.overrides));
  const programRows = programs.map((p) => {
    // Each checklist item, labelled with its section when its own name is vague ("Courses")
    const items = p.blocks.filter((b) => !b.optional).flatMap((b) => leaves(b.rules)
      .filter((r) => r.status !== 'manual')
      .map((r) => ({ ...r, name: !r.name || /^(capstone )?courses?$/i.test(r.name) ? b.name : r.name })));
    const { done, total } = p.summary;
    return `
      <div class="glance-block">
        <a href="#requirements/${encodeURIComponent(p.code)}" class="glance-title">${escapeHtml(p.name)}
          <span class="muted small">${escapeHtml(p.degree)} · ${done}/${total}</span></a>
        <div class="bar"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div>
        ${items.map((r) => `
          <div class="glance-row">
            <div class="glance-top"><span>${statusMark[r.status]} ${escapeHtml(r.name || 'Requirement')}</span></div>
            <div class="glance-chips">${(r.matched || []).map((id) => byId.get(id)).filter(Boolean).map(chip).join('')}</div>
          </div>`).join('')}
      </div>`;
  }).join('');

  return `
    <div class="card glance">
      <div class="glance-title">Units <span class="muted small">${earned}${needed ? ` of ${needed}` : ''} earned · ${planned} in progress/planned</span></div>
      ${needed ? `<div class="bar"><i style="width:${Math.min(earned / needed, 1) * 100}%"></i></div>` : ''}
      <p class="muted small">✓ done · ◔ in progress/planned · ○ not started. Chip colors: green done, gold now, red planned.</p>

      ${programRows || `<p class="muted small"><a href="#programs">Choose majors &amp; minors</a> to see them here.</p>`}

      <div class="glance-block">
        <a href="#requirements/GENERAL" class="glance-title">Stanford general
          <span class="muted small">${general.summary.done}/${general.summary.total}</span></a>
        ${generalRows}
      </div>
    </div>`;
}

function classesIn(classes, season, year) {
  return classes.filter((c) => c.season === season && c.year === year)
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}
