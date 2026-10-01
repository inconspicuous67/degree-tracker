/*
  utils.js — small helper tools shared by many screens.
*/

// Makes text safe to put inside HTML. Without this, a course title like
// "<b>Intro" would be treated as HTML code instead of plain text.
// RULE OF THUMB: any text that came from the user or a file goes through this.
export function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Draws a simple "this tab is coming soon" card. Used until each tab
// gets built in its step.
export function renderComingSoon(container, step, description) {
  container.innerHTML = `
    <section class="card">
      <span class="badge">Coming in Step ${step}</span>
      <p>${escapeHtml(description)}</p>
    </section>
  `;
}
