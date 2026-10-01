/*
  views/home.js — the Home tab.
  In Step 4 this becomes the "Where I stand" screen (units, GPA, what's left).
  For now it proves the shell works and that data flows between tabs.
*/

export function render(container, app) {
  const unitsNeeded = app.data.settings.unitsNeeded;

  container.innerHTML = `
    <section class="card">
      <h2>Welcome</h2>
      <p>The app shell works. Try every tab at the bottom, then switch your
         phone between light and dark mode.</p>
    </section>

    <section class="card">
      <h3>Units needed to graduate</h3>
      <p class="big-number">${unitsNeeded ?? '—'}</p>
      <p class="muted">${unitsNeeded
        ? 'Loaded from your saved settings.'
        : 'Not set yet. Enter it on the Settings tab.'}</p>
    </section>
  `;
}
