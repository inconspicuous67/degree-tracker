/*
  terms.js — helpers for Stanford quarters.

  A quarter is a season + a calendar year, e.g. "Autumn 2026" or "Winter 2027".
  An ACADEMIC year (like "2026–27") runs Autumn 2026 → Winter, Spring, Summer 2027.
*/

export const SEASONS = ['Autumn', 'Winter', 'Spring', 'Summer'];

// Which academic year a quarter belongs to (named by its starting year).
// Autumn 2026 → 2026.  Winter 2027 → 2026.
export function academicYearOf(season, year) {
  return season === 'Autumn' ? year : year - 1;
}

// A number that sorts quarters in time order (bigger = later).
export function termOrder(season, year) {
  return academicYearOf(season, year) * 4 + SEASONS.indexOf(season);
}

// "2026–27"
export function academicYearLabel(startYear) {
  return `${startYear}–${String(startYear + 1).slice(2)}`;
}

// The four quarters of an academic year, in order.
export function quartersOf(academicYear) {
  return SEASONS.map((season) => ({
    season,
    year: season === 'Autumn' ? academicYear : academicYear + 1,
  }));
}

// A short key for a quarter, used in web addresses: "2026-Autumn"
export function termKey(season, year) {
  return `${year}-${season}`;
}
export function parseTermKey(key) {
  const [year, season] = String(key || '').split('-');
  return SEASONS.includes(season) ? { season, year: Number(year) } : null;
}

// Roughly which quarter it is today, using Stanford's usual calendar.
export function currentTerm(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1 = January
  if (month >= 9) return { season: 'Autumn', year };          // Sep–Dec
  if (month <= 3) return { season: 'Winter', year };          // Jan–Mar
  if (month <= 6) return { season: 'Spring', year };          // Apr–Jun
  return { season: 'Summer', year };                          // Jul–Aug
}

// Suggest a status for a class based on when it's taken:
// past quarters → completed, this quarter → in progress, future → planned.
export function defaultStatus(season, year) {
  const now = currentTerm();
  const diff = termOrder(season, year) - termOrder(now.season, now.year);
  if (diff < 0) return 'completed';
  if (diff === 0) return 'in-progress';
  return 'planned';
}

// Your first Autumn at Stanford, from your class year (Class of 2029 → 2025).
export function firstAutumn(settings) {
  return settings.classOf ? settings.classOf - 4 : null;
}

export const STATUS_LABELS = {
  'completed': 'Done',
  'in-progress': 'In progress',
  'planned': 'Planned',
};
