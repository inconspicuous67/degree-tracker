/*
  views/class-form.js — add a class, or edit/delete one of yours.
    #class/new?code=ME%20102&term=2027-Winter  → add (details filled from the catalog)
    #class/new                                 → add by hand (not in the catalog)
    #class/<id>                                → edit an existing class
*/

import { escapeHtml, newId } from '../utils.js';
import { loadCatalog, getCourse } from '../catalog.js';
import {
  SEASONS, STATUS_LABELS, currentTerm, parseTermKey, defaultStatus, academicYearOf,
} from '../terms.js';
import { GRADE_OPTIONS } from '../gpa.js';

export async function render(container, app, route) {
  const isNew = route.param === 'new';
  const existing = isNew ? null : app.data.classes.find((c) => c.id === route.param);

  if (!isNew && !existing) {
    container.innerHTML = `<div class="card">That class no longer exists. <a href="#plan">Back to Plan</a></div>`;
    return;
  }

  await loadCatalog();

  // Starting values for the form
  let cls;
  if (existing) {
    cls = { ...existing };
  } else {
    const course = getCourse(route.query.get('code'));
    const term = parseTermKey(route.query.get('term')) || currentTerm();
    cls = {
      code: course?.key || '',
      title: course?.title || '',
      units: course?.unitsMax ?? '',
      grade: '',
      season: term.season,
      year: term.year,
      status: defaultStatus(term.season, term.year),
    };
  }
  const course = getCourse(cls.code);
  const fromCatalog = Boolean(course);

  // Years to choose from: 6 back, 5 ahead
  const now = currentTerm().year;
  const yearOptions = [];
  for (let y = now - 6; y <= now + 5; y++) yearOptions.push(y);

  const option = (value, label, selected) =>
    `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${escapeHtml(label)}</option>`;

  container.innerHTML = `
    <div class="header">
      <div class="eyebrow"><a href="javascript:history.back()">‹ Back</a></div>
      <h1>${isNew ? 'Add class' : 'Edit class'}</h1>
    </div>

    <form id="form" class="card">
      <label class="field"><span>Course code</span>
        <input name="code" value="${escapeHtml(cls.code)}" placeholder="e.g. ME 102" required
          ${fromCatalog ? 'readonly' : ''}></label>
      <label class="field"><span>Title</span>
        <input name="title" value="${escapeHtml(cls.title)}" placeholder="Course title"></label>

      <div class="field-row">
        <label class="field"><span>Quarter</span>
          <select name="season">${SEASONS.map((s) => option(s, s, cls.season)).join('')}</select></label>
        <label class="field"><span>Year</span>
          <select name="year">${yearOptions.map((y) => option(y, y, cls.year)).join('')}</select></label>
      </div>

      <div class="field-row">
        <label class="field"><span>Units${course && course.unitsMin !== course.unitsMax
            ? ` (${course.unitsMin}–${course.unitsMax})` : ''}</span>
          <input name="units" type="number" inputmode="numeric" required
            min="${course?.unitsMin ?? 0}" max="${course?.unitsMax ?? 30}" value="${escapeHtml(cls.units)}"></label>
        <label class="field"><span>Status</span>
          <select name="status">${Object.entries(STATUS_LABELS).map(([v, l]) => option(v, l, cls.status)).join('')}</select></label>
      </div>

      <label class="field"><span>Grade</span>
        <select name="grade">${GRADE_OPTIONS.map((g) => option(g, g || 'No grade yet', cls.grade)).join('')}</select></label>

      <button class="btn" type="submit">${isNew ? 'Add to plan' : 'Save changes'}</button>
      ${existing ? '<button class="btn danger" type="button" id="delete">Delete class</button>' : ''}
    </form>
  `;

  const form = container.querySelector('#form');

  // For a new class, keep "Status" in step with the quarter you pick
  // (past → Done, now → In progress, future → Planned) until you change it yourself.
  let statusTouched = !isNew;
  form.status.addEventListener('change', () => { statusTouched = true; });
  const syncStatus = () => {
    if (!statusTouched) form.status.value = defaultStatus(form.season.value, Number(form.year.value));
  };
  form.season.addEventListener('change', syncStatus);
  form.year.addEventListener('change', syncStatus);

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // stop the browser's default "reload the page"
    const saved = {
      id: existing?.id || newId(),
      code: form.code.value.trim().replace(/\s+/g, ' ').toUpperCase(),
      title: form.title.value.trim(),
      units: Number(form.units.value) || 0,
      season: form.season.value,
      year: Number(form.year.value),
      status: form.status.value,
      grade: form.grade.value,
    };
    if (existing) {
      const index = app.data.classes.findIndex((c) => c.id === existing.id);
      app.data.classes[index] = saved;
    } else {
      app.data.classes.push(saved);
    }
    app.save();
    app.go(`#plan/${academicYearOf(saved.season, saved.year)}`);
  });

  container.querySelector('#delete')?.addEventListener('click', () => {
    if (!confirm(`Delete ${existing.code} from ${existing.season} ${existing.year}?`)) return;
    app.data.classes = app.data.classes.filter((c) => c.id !== existing.id);
    app.save();
    app.go(`#plan/${academicYearOf(existing.season, existing.year)}`);
  });
}
