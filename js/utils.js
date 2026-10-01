/*
  utils.js — small helper tools shared by many screens.
*/

// Shown in Settings so you can tell which version your phone is running.
// Bump this each time you upload a change.
export const APP_VERSION = '3.1 — Plan overview';

// Makes text safe to put inside HTML. Without this, a course title like
// "<b>Intro" would be treated as HTML code instead of plain text.
// RULE OF THUMB: any text from you, a file, or the catalog goes through this.
export function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// A unique id for a new class, e.g. "k3x9f2a1"
export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

// Stanford's general-requirement tags as they appear in the catalog,
// with readable names. Tags not listed here (old "GER:" ones from the
// previous system) are hidden.
export const REQUIREMENT_TAGS = {
  'WAY-A-II': 'Ways: Aesthetic & Interpretive Inquiry',
  'WAY-AQR': 'Ways: Applied Quantitative Reasoning',
  'WAY-CE': 'Ways: Creative Expression',
  'way_ce': 'Ways: Creative Expression',
  'WAY-EDP': 'Ways: Exploring Difference & Power',
  'WAY-ER': 'Ways: Ethical Reasoning',
  'WAY-FR': 'Ways: Formal Reasoning',
  'WAY-SI': 'Ways: Social Inquiry',
  'WAY-SMA': 'Ways: Scientific Method & Analysis',
  'Language': 'Language',
  'Writing 1': 'Writing & Rhetoric 1',
  'Writing 2': 'Writing & Rhetoric 2',
  'Writing SLE': 'Writing (SLE)',
  'College': 'COLLEGE',
  'THINK': 'Thinking Matters',
};

// Short version for little tags: "WAY-FR"
export function shortTag(tag) {
  return tag === 'way_ce' ? 'WAY-CE' : tag;
}

// Only the tags we know how to name (drops old GER: ones).
export function currentTags(course) {
  return (course?.gers || []).filter((g) => g in REQUIREMENT_TAGS);
}
