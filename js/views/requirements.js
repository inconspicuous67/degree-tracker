/*
  views/requirements.js — your ME and MS&E requirements, plus Stanford's
  general requirements. Built in the next step, after you check the
  requirement list translated from the 2026–27 Stanford Bulletin.
*/

export function render(container) {
  container.innerHTML = `
    <div class="header">
      <div class="eyebrow">ME · MS&amp;E</div>
      <h1>Requirements</h1>
    </div>
    <div class="card">
      <p><b>Coming next.</b> Each requirement for Mechanical Engineering and
        Management Science &amp; Engineering will appear here, marked
        Done, In progress, or Remaining, and update automatically as you add classes.</p>
      <p class="muted">You'll get to check the list against the Stanford Bulletin first.</p>
    </div>
  `;
}
