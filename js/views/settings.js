/*
  views/settings.js — the Settings screen (opened from the gear on Home).
*/

import { emptyData } from '../storage.js';
import { currentTerm } from '../terms.js';

export function render(container, app) {
  const { settings } = app.data;
  const now = currentTerm().year;
  const years = [];
  for (let y = now - 6; y <= now + 1; y++) years.push(y);

  container.innerHTML = `
    <div class="header">
      <div class="eyebrow"><a href="#home">‹ Home</a></div>
      <h1>Settings</h1>
    </div>

    <div class="card">
      <label class="field"><span>Units needed to graduate</span>
        <input id="units-needed" type="number" inputmode="numeric" min="1" step="1"
               placeholder="From the Stanford Bulletin"></label>
      <label class="field"><span>First Autumn at Stanford</span>
        <select id="start-year">
          <option value="">Not set</option>
          ${years.map((y) => `<option value="${y}" ${settings.startYear === y ? 'selected' : ''}>Autumn ${y}</option>`).join('')}
        </select></label>
      <p class="muted">Enter units from the Stanford Bulletin or your degree progress report.
        The app never guesses it. Your first year labels the Plan tabs Year 1–4.</p>
      <p id="save-status" class="muted" aria-live="polite"></p>
    </div>

    <div class="section-h"><h2>Your data</h2></div>
    <div class="card">
      <p>Everything is saved on this phone only. No account, no server.</p>
      <p class="muted">${app.data.classes.length} classes saved.</p>
      <button class="btn danger" id="clear">Erase all my data</button>
    </div>

    <p class="muted small">Course information from Stanford ExploreCourses (2026–27).
      Not an official Stanford app. Always confirm with your degree progress report.</p>
  `;

  const units = container.querySelector('#units-needed');
  const startYear = container.querySelector('#start-year');
  const status = container.querySelector('#save-status');
  units.value = settings.unitsNeeded ?? '';

  function saved() {
    status.textContent = app.save() ? 'Saved ✓' : "Couldn't save. Your phone's storage may be full.";
  }

  units.addEventListener('input', () => {
    const n = parseInt(units.value, 10);
    settings.unitsNeeded = n > 0 ? n : null;
    saved();
  });
  startYear.addEventListener('change', () => {
    settings.startYear = startYear.value ? Number(startYear.value) : null;
    saved();
  });

  container.querySelector('#clear').addEventListener('click', () => {
    if (!confirm('Erase all your classes and settings from this phone? This cannot be undone.')) return;
    app.data = emptyData();
    app.save();
    app.go('#home');
  });
}
