/*
  views/explore.js — search all of Stanford's 2026–27 courses.
  If opened from a Plan "+" button, the address carries ?term=2027-Winter
  so the course you pick gets added to that quarter.
*/

import { escapeHtml, currentTags, shortTag } from '../utils.js';
import { loadCatalog, searchCourses, catalogInfo, unitsLabel, termsLabel } from '../catalog.js';
import { parseTermKey, academicYearLabel } from '../terms.js';

let lastQuery = ''; // remember the search when you come back to this screen

// Quick-search buttons for the subjects you care about most
const QUICK = ['ME', 'MS&E', 'ENGR', 'MATH', 'CS', 'PHYSICS'];

export async function render(container, app, route) {
  const termParam = route.query.get('term');
  const term = parseTermKey(termParam);

  container.innerHTML = `
    <div class="header">
      <div class="eyebrow">${term ? `Adding to ${term.season} ${term.year}` : 'Stanford catalog'}</div>
      <h1>Explore</h1>
    </div>
    <div class="search">
      <input id="q" type="search" placeholder="Course code or title, e.g. ME 80 or thermo"
             autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
    </div>
    <div id="results"><p class="muted">Loading Stanford's catalog…</p></div>
  `;

  const input = container.querySelector('#q');
  const results = container.querySelector('#results');
  input.value = lastQuery;

  try {
    await loadCatalog();
  } catch (error) {
    results.innerHTML = `<div class="card">Couldn't load the catalog. Check your connection and try again.</div>`;
    return;
  }

  const suffix = termParam ? `?term=${termParam}` : '';

  function show() {
    lastQuery = input.value;
    const found = searchCourses(input.value);
    if (!input.value.trim()) {
      const info = catalogInfo();
      results.innerHTML = `
        <div class="tags">${QUICK.map((s) => `<a class="tag" href="#" data-q="${escapeHtml(s)}">${escapeHtml(s)}</a>`).join('')}</div>
        <p class="muted">${info.count.toLocaleString()} courses from Stanford ExploreCourses,
          ${academicYearLabel(Number(info.academicYear.slice(0, 4)))}.</p>`;
      return;
    }
    if (!found.length) {
      results.innerHTML = `
        <div class="card empty muted">No courses match “${escapeHtml(input.value)}”.
          <a class="btn secondary" href="#class/new${suffix}">Add a class by hand</a></div>`;
      return;
    }
    results.innerHTML = `<div class="list">${found.map((c) => `
      <a class="row" href="#course/${encodeURIComponent(c.key)}${suffix}">
        <div class="main">
          <div class="code">${escapeHtml(c.key)}</div>
          <div class="title">${escapeHtml(c.title)}</div>
          <div class="title">${unitsLabel(c)}${termsLabel(c) ? ' · ' + termsLabel(c) : ''}${
            currentTags(c).length ? ' · ' + currentTags(c).map(shortTag).join(', ') : ''}</div>
        </div>
        <span class="chev">›</span>
      </a>`).join('')}</div>
      ${found.length >= 60 ? '<p class="muted">Showing the first 60. Type more to narrow it down.</p>' : ''}`;
  }

  input.addEventListener('input', show);
  // Quick-search buttons fill in the box
  results.addEventListener('click', (event) => {
    const quick = event.target.closest('[data-q]');
    if (quick) {
      event.preventDefault();
      input.value = quick.dataset.q + ' ';
      show();
      input.focus();
    }
  });
  show();
}
