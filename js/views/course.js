/*
  views/course.js — one course: description, details, what it counts toward,
  a link to Stanford's page, and a button to add it to your plan.
*/

import { escapeHtml, currentTags, shortTag, REQUIREMENT_TAGS } from '../utils.js';
import {
  loadCatalog, getCourse, getDescription, exploreCoursesUrl, unitsLabel, termsLabel,
} from '../catalog.js';
import { parseTermKey, STATUS_LABELS } from '../terms.js';
import { loadPrograms, whereCourseCounts } from '../requirements-engine.js';

export async function render(container, app, route) {
  const code = route.param;
  const termParam = route.query.get('term');
  const term = parseTermKey(termParam);
  const back = `#explore${termParam ? `?term=${termParam}` : ''}`;

  container.innerHTML = `<p class="muted">Loading…</p>`;
  const [, programs] = await Promise.all([loadCatalog(), loadPrograms()]);
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
      ${doneWithTag ? `<span class="pill completed">${doneWithTag} of yours</span>` : ''}</div>`;
  }).join('');

  // Majors and minors this course counts toward (from the Bulletin)
  const counts = whereCourseCounts(course.key, programs);
  const chosen = app.data.settings.programs;
  const myCounts = counts.filter((c) => chosen.includes(c.program.code));
  const otherPrograms = [...new Map(counts.filter((c) => !chosen.includes(c.program.code))
    .map((c) => [c.program.code, c.program])).values()];

  // Group the matches by program → tree nodes
  const treeFor = (list) => {
    const byProgram = new Map();
    list.forEach(({ program, path }) => {
      if (!byProgram.has(program.code)) byProgram.set(program.code, { program, paths: [] });
      byProgram.get(program.code).paths.push(path);
    });
    return [...byProgram.values()].map(({ program, paths }) => `
      <div class="lbl"><a href="#requirements/${encodeURIComponent(program.code)}" style="color:inherit;text-decoration:none">
        ${escapeHtml(program.name)} <span class="muted small">${escapeHtml(program.degree)}</span></a></div>
      ${paths.map((p) => `<div class="node">${p.map(escapeHtml).join(' › ')}</div>`).join('')}`).join('');
  };

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
      ${myCounts.length ? treeFor(myCounts)
        : `<div class="lbl">Your programs</div><div class="node muted">${chosen.length
          ? 'Not listed in your chosen programs' : '<a href="#programs">Choose your majors &amp; minors</a>'}</div>`}
    </div>

    ${otherPrograms.length ? `
      <details class="card">
        <summary style="cursor:pointer;font-weight:600">Also counts toward ${otherPrograms.length} other
          program${otherPrograms.length === 1 ? '' : 's'}</summary>
        <div class="tree" style="margin-top:8px">${treeFor(counts.filter((c) => !chosen.includes(c.program.code)))}</div>
      </details>` : ''}

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
  if (!descEl) return;
  descEl.textContent = description || 'No description in the catalog.';
  // Long descriptions start collapsed; tap to read the rest
  if (description.length > 320) {
    descEl.classList.add('clamped');
    descEl.addEventListener('click', () => descEl.classList.toggle('clamped'));
  }
}
