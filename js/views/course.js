/*
  views/course.js — one course: description, details, what it counts toward,
  a link to Stanford's page, and a button to add it to your plan.
*/

import { escapeHtml, currentTags, shortTag, REQUIREMENT_TAGS } from '../utils.js';
import {
  loadCatalog, getCourse, getDescription, exploreCoursesUrl, unitsLabel, termsLabel,
} from '../catalog.js';
import { parseTermKey, STATUS_LABELS } from '../terms.js';

export async function render(container, app, route) {
  const code = route.param;
  const termParam = route.query.get('term');
  const term = parseTermKey(termParam);
  const back = `#explore${termParam ? `?term=${termParam}` : ''}`;

  container.innerHTML = `<p class="muted">Loading…</p>`;
  await loadCatalog();
  const course = getCourse(code);

  if (!course) {
    container.innerHTML = `
      <div class="header"><div class="eyebrow"><a href="${back}">‹ Explore</a></div>
        <h1>${escapeHtml(code)}</h1></div>
      <div class="card">This course isn't in the 2026–27 catalog.</div>`;
    return;
  }

  const tags = currentTags(course);

  // Your own classes with this code (e.g. taken before, or planned)
  const mine = app.data.classes.filter((c) => c.code === course.key);

  // "Counts toward" tree. For each general-requirement tag, show how many
  // of your completed classes already carry that tag.
  const generalNodes = tags.map((tag) => {
    const doneWithTag = app.data.classes.filter((c) =>
      c.status === 'completed' && (getCourse(c.code)?.gers || []).includes(tag)).length;
    return `<div class="node">${escapeHtml(REQUIREMENT_TAGS[tag])}
      ${doneWithTag ? `<span class="pill completed">${doneWithTag} done</span>` : ''}</div>`;
  }).join('');

  const addLabel = term ? `Add to ${term.season} ${term.year}` : 'Add to my plan';
  const addHref = `#class/new?code=${encodeURIComponent(course.key)}${termParam ? `&term=${termParam}` : ''}`;

  container.innerHTML = `
    <div class="header">
      <div class="eyebrow"><a href="${back}">‹ Explore</a></div>
      <h1>${escapeHtml(course.key)}</h1>
      <div class="subtitle">${escapeHtml(course.title)}</div>
    </div>

    <div class="tags">
      <span class="tag">${unitsLabel(course)}</span>
      ${termsLabel(course) ? `<span class="tag">${termsLabel(course)}</span>` : ''}
      ${course.terms.includes('not given this year') ? '<span class="tag">Not offered this year</span>' : ''}
      ${course.grading ? `<span class="tag">${escapeHtml(course.grading)}</span>` : ''}
      ${tags.map((t) => `<span class="tag">${escapeHtml(shortTag(t))}</span>`).join('')}
    </div>

    <div class="card">
      <p class="description" id="desc">Loading description…</p>
      <p><a href="${exploreCoursesUrl(course.key)}" target="_blank" rel="noopener"
            style="font-weight:600;text-decoration:none">Read full listing on ExploreCourses ↗</a></p>
    </div>

    <div class="section-h"><h2>Counts toward</h2></div>
    <div class="card tree">
      <div class="lbl">Stanford general requirements</div>
      ${generalNodes || '<div class="node muted">None listed in the catalog</div>'}
      <div class="lbl">ME · MS&amp;E majors</div>
      <div class="node muted">Shown here once the requirements are added (next step)</div>
    </div>

    ${mine.length ? `
      <div class="section-h"><h2>In your plan</h2></div>
      <div class="list">${mine.map((c) => `
        <a class="row" href="#class/${c.id}">
          <div class="main"><div class="code">${c.season} ${c.year}</div>
            <div class="title">${c.units} units${c.grade ? ' · ' + escapeHtml(c.grade) : ''}</div></div>
          <span class="pill ${c.status}">${STATUS_LABELS[c.status]}</span>
        </a>`).join('')}</div>` : ''}

    <a class="btn" href="${addHref}">${addLabel}</a>
  `;

  // The description loads separately (it's in a per-subject file)
  const description = await getDescription(course);
  const descEl = container.querySelector('#desc');
  if (descEl) descEl.textContent = description || 'No description in the catalog.';
}
