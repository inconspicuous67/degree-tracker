/*
  views/settings.js — the Settings screen (opened from the gear on Home).
*/

import { emptyData, loadData } from '../storage.js';
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
      <p class="muted">${app.data.classes.length} class${app.data.classes.length === 1 ? '' : 'es'} saved.</p>
      <button class="btn secondary" id="export">Back up my data</button>
      <label class="btn secondary" style="display:block">Restore from a backup
        <input id="import" type="file" accept=".json,application/json" hidden></label>
      <p class="muted small">A backup is a small file saved to your phone (Files app). Keep it
        somewhere safe, like iCloud Drive, but NOT in the degree-tracker project folder.</p>
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

  // Backup: turn your data into a file and "download" it
  container.querySelector('#export').addEventListener('click', () => {
    const file = new Blob([JSON.stringify(app.data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = `degree-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // Restore: read a backup file and replace the current data with it
  container.querySelector('#import').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (!Array.isArray(backup.classes) || typeof backup.settings !== 'object') throw new Error('not a backup');
      if (!confirm(`Replace everything in the app with this backup (${backup.classes.length} classes)?`)) return;
      app.data = backup;
      app.save();
      app.data = loadData(); // reload so any missing sections get filled in
      app.go('#home');
    } catch {
      alert("That file isn't a Degree Tracker backup.");
    }
  });

  container.querySelector('#clear').addEventListener('click', () => {
    if (!confirm('Erase all your classes and settings from this phone? This cannot be undone.')) return;
    app.data = emptyData();
    app.save();
    app.go('#home');
  });
}
