/*
  views/settings.js — the Settings screen (opened from the gear on Home).
*/

import { emptyData } from '../storage.js';
import { currentTerm } from '../terms.js';
import { APP_VERSION } from '../utils.js';

export function render(container, app) {
  const { settings } = app.data;
  const now = currentTerm().year;
  const years = [];
  for (let y = now; y <= now + 5; y++) years.push(y); // possible graduating classes

  container.innerHTML = `
    <div class="header">
      <div class="eyebrow"><a href="#home">‹ Home</a></div>
      <h1>Settings</h1>
    </div>

    <div class="card">
      <label class="field"><span>Units needed to graduate</span>
        <input id="units-needed" type="number" inputmode="numeric" min="1" step="1"
               placeholder="From the Stanford Bulletin"></label>
      <label class="field"><span>Your class</span>
        <select id="class-of">
          <option value="">Not set</option>
          ${years.map((y) => `<option value="${y}" ${settings.classOf === y ? 'selected' : ''}>Class of ${y}</option>`).join('')}
        </select></label>
      <p class="muted">Enter units from the Stanford Bulletin or your degree progress report.
        The app never guesses it. Your class sets up the Plan's Year 1–4.</p>
      <p id="save-status" class="muted" aria-live="polite"></p>
    </div>

    <div class="section-h"><h2>Your data</h2></div>
    <div class="card">
      <p>Everything is saved on this phone only. No account, no server.</p>
      <p class="muted">${app.data.classes.length} classes saved.</p>
      <button class="btn danger" id="clear">Erase all my data</button>
    </div>

    <p class="muted small">App version ${APP_VERSION}.<br>
      Course information from Stanford ExploreCourses (2026–27).
      Not an official Stanford app. Always confirm with your degree progress report.</p>
  `;

  const units = container.querySelector('#units-needed');
  const classOf = container.querySelector('#class-of');
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
  classOf.addEventListener('change', () => {
    settings.classOf = classOf.value ? Number(classOf.value) : null;
    saved();
  });

  container.querySelector('#clear').addEventListener('click', () => {
    if (!confirm('Erase all your classes and settings from this phone? This cannot be undone.')) return;
    app.data = emptyData();
    app.save();
    app.go('#home');
  });
}
