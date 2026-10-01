/*
  views/settings.js — the Settings tab.
  Step 1: one real setting (units needed to graduate) so we can prove that
  saving works. Later steps add import/export, demo data, and "clear all".
*/

export function render(container, app) {
  container.innerHTML = `
    <section class="card">
      <h2>Graduation</h2>
      <label class="field">
        <span>Units needed to graduate</span>
        <input id="units-needed" type="number" inputmode="numeric" min="1" step="1"
               placeholder="From the Stanford Bulletin">
      </label>
      <p class="muted">Enter this from the Stanford Bulletin or your degree
         progress report. The app never guesses it.</p>
      <p id="save-status" class="muted" aria-live="polite"></p>
    </section>

    <section class="card">
      <h2>Your data</h2>
      <p>Everything is saved on this phone only. No account, no server.</p>
    </section>
  `;

  const input = container.querySelector('#units-needed');
  const status = container.querySelector('#save-status');

  // Show what's already saved (or an empty box)
  input.value = app.data.settings.unitsNeeded ?? '';

  // Every time you type, update the data and save it right away
  input.addEventListener('input', () => {
    const number = parseInt(input.value, 10);
    // Only keep sensible whole numbers; anything else means "not set"
    app.data.settings.unitsNeeded = number > 0 ? number : null;

    if (app.save()) {
      status.textContent = 'Saved ✓';
      status.className = 'muted status-ok';
    } else {
      status.textContent = "Couldn't save. Your phone's storage may be full.";
      status.className = 'muted status-error';
    }
  });
}
