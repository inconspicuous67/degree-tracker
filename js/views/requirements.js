/*
  views/requirements.js — the checklist for one program at a time:
  Stanford's general requirements, or any major/minor you've chosen.
  Every requirement shows Done / In progress / Remaining, updated from your
  classes. Tap one to see which courses count and mark it done yourself.
    #requirements            → your first chosen program
    #requirements/ME-BS      → a specific program
*/

import { escapeHtml } from '../utils.js';
import { loadCatalog } from '../catalog.js';
import { loadPrograms, findProgram, evaluateProgram } from '../requirements-engine.js';
import { GENERAL_REQUIREMENTS } from '../general-reqs.js';

const STATUS = {
  done: ['Done', 'completed'],
  progress: ['In progress', 'in-progress'],
  remaining: ['Remaining', 'neutral'],
  manual: ['Check yourself', 'neutral'],
};

export async function render(container, app, route) {
  container.innerHTML = `<p class="muted">Loading requirements…</p>`;
  await Promise.all([loadCatalog(), loadPrograms()]);

  const { settings, classes } = app.data;
  const mine = settings.programs.map(findProgram).filter(Boolean);
  const all = [...mine, GENERAL_REQUIREMENTS];
  const program = all.find((p) => p.code === route.param) || all[0];
  const result = evaluateProgram(program, classes, settings.overrides);
  const { done, progress, total } = result.summary;
  const byId = new Map(classes.map((c) => [c.id, c]));

  // Program switcher (horizontal pills)
  const switcher = all.map((p) => `
    <a class="tag" href="#requirements/${encodeURIComponent(p.code)}"
       style="${p.code === program.code ? 'background:var(--accent);color:var(--on-accent)' : ''}">
       ${escapeHtml(shortName(p))}</a>`).join('');

  // One requirement row (and, for groups, the rows inside it)
  function ruleHtml(rule, depth = 0) {
    if (rule.children) {
      return `
        <div class="section-h" style="margin-left:${4 + depth * 12}px"><h2 style="font-size:15px">${escapeHtml(rule.name || 'Group')}</h2>
          <span class="pill ${STATUS[rule.status][1]}">${rule.mode === 'any' ? 'Any one' : STATUS[rule.status][0]}</span></div>
        ${rule.children.map((r) => ruleHtml(r, depth + 1)).join('')}`;
    }
    const [label, cls] = STATUS[rule.status];
    const progressText = rule.need
      ? (rule.need.units && !rule.need.count
          ? `${rule.have.units} / ${rule.need.units} units`
          : `${rule.have.count} / ${rule.need.count}${rule.need.units ? ` · ${rule.have.units}/${rule.need.units} u` : ''}`)
      : '';
    const matched = (rule.matched || []).map((id) => byId.get(id)).filter(Boolean);
    const options = (rule.options || []).map((o) => {
      const codes = o.codes.map((code) => {
        const mineCls = classes.find((c) => c.code === code);
        const mark = mineCls ? (mineCls.status === 'completed' ? '✓ ' : '◔ ') : '';
        return `<a href="#course/${encodeURIComponent(code)}" style="text-decoration:none">${mark}${escapeHtml(code)}</a>`;
      });
      return `<span class="tag" style="background:var(--surface2)">${codes.join(o.all ? ' + ' : ' / ')}</span>`;
    }).join('');

    return `
      <details class="card" style="margin-left:${depth * 12}px;padding:12px 14px">
        <summary style="display:flex;align-items:center;gap:10px;list-style:none;cursor:pointer">
          <div class="main" style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:15px">${escapeHtml(rule.name || 'Requirement')}</div>
            <div class="muted small">${progressText}${rule.overridden ? ' · marked done by you' : ''}${
              matched.length ? ' · ' + matched.map((c) => escapeHtml(c.code)).join(', ') : ''}</div>
          </div>
          <span class="pill ${cls}">${label}</span>
        </summary>
        ${rule.notes ? `<p class="muted small" style="white-space:pre-line;margin-top:10px">${escapeHtml(rule.notes)}</p>` : ''}
        ${options ? `<div class="tags">${options}</div>
          <p class="muted small">✓ done · ◔ in progress or planned. Tap a course to see it.</p>` : ''}
        <button class="btn secondary" data-override="${escapeHtml(rule.id)}" style="padding:10px;font-size:14px">
          ${rule.overridden ? 'Undo “marked done”' : 'Mark done myself (AP, transfer, petition…)'}</button>
      </details>`;
  }

  const blocksHtml = result.blocks.map((block) => `
    <div class="section-h"><h2>${escapeHtml(block.name)}</h2>
      ${block.optional ? '<span class="muted small">optional</span>' : ''}</div>
    ${block.hiddenInBulletin ? `<p class="muted small" style="margin:0 4px 8px">This section is in the Bulletin's
      official data but not shown on its website. Confirm it with your advisor.</p>` : ''}
    ${block.notes ? `<p class="muted small" style="margin:0 4px 8px">${escapeHtml(block.notes)}</p>` : ''}
    ${block.rules.map((r) => ruleHtml(r)).join('')}`).join('');

  container.innerHTML = `
    <div class="header">
      <div class="eyebrow">${escapeHtml(program.degree)}</div>
      <h1>${escapeHtml(program.name)}</h1>
    </div>
    <div class="tags" style="margin-bottom:12px">${switcher}
      <a class="tag" href="#programs" style="color:var(--accent)">+ Majors &amp; minors</a></div>

    ${!mine.length ? `<div class="insight"><b>Choose your majors and minors</b> —
      <a href="#programs">pick programs</a> to see their requirements here.</div>` : ''}

    <div class="card">
      <div style="display:flex;justify-content:space-between;font-weight:600">
        <span>${done} of ${total} requirements done</span>
        <span class="muted">${progress} in progress</span></div>
      <div class="bar"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div>
      <p class="muted small" style="margin-top:8px">
        <a href="${program.url}" target="_blank" rel="noopener">View on Stanford Bulletin ↗</a>
        · Confirm with your official degree progress report.</p>
    </div>

    ${blocksHtml}
  `;

  // "Mark done myself" buttons
  container.onclick = (event) => {
    const id = event.target.closest('[data-override]')?.dataset.override;
    if (!id) return;
    if (settings.overrides[id]) delete settings.overrides[id];
    else settings.overrides[id] = true;
    app.save();
    render(container, app, route); // redraw with the new status
  };
}

// "Mechanical Engineering BS" → "ME BS"-style short labels for the switcher
function shortName(p) {
  if (p.code === 'GENERAL') return 'General';
  const short = p.code.replace(/-(BS|BA|BAS)$/, '').replace(/-MIN$/, ' minor').replace('MGTSC', 'MS&E');
  return short;
}
