/*
  catalog.js — Stanford's 2026–27 course catalog, built into the app.

  The data comes from scripts/fetch_catalog.py, which downloads it from
  Stanford ExploreCourses into the data/ folder:
    data/courses.json      — every course (no descriptions, so it loads fast)
    data/desc/<SUBJ>.json  — descriptions, one file per subject, loaded only
                             when you open a course from that subject
*/

let courses = null;          // the full list, once loaded
let byCode = new Map();      // "ME 102" → course, for instant lookup
let meta = null;             // { academicYear, source, fetched, count }
const descriptionFiles = {}; // subject → loaded descriptions

// Load the catalog (only the first time; after that it's instant).
export async function loadCatalog() {
  if (courses) return courses;
  const response = await fetch('data/courses.json');
  const json = await response.json();
  meta = json.meta;
  courses = json.courses.map((c) => ({
    ...c,
    key: `${c.subject} ${c.code}`,                         // "ME 102"
    compact: `${c.subject}${c.code}`.toUpperCase(),         // "ME102" — for searching
    titleLower: c.title.toLowerCase(),
  }));
  byCode = new Map(courses.map((c) => [c.key, c]));
  return courses;
}

export function catalogInfo() {
  return meta;
}

// Find one course by its code, e.g. "ME 102". Returns undefined if not found.
export function getCourse(code) {
  return byCode.get(code);
}

// Search by code ("me102", "ME 1") or by words in the title ("thermo").
// Best matches first: exact code, then code starts with, then title words.
export function searchCourses(query, limit = 60) {
  const q = query.trim();
  if (!courses || !q) return [];
  const compactQ = q.replace(/\s+/g, '').toUpperCase();
  const words = q.toLowerCase().split(/\s+/);

  // First try matching course codes. Only if none match, search titles —
  // so "ME 80" shows ME courses, not titles that happen to contain "80".
  let results = [];
  for (const c of courses) {
    if (c.compact === compactQ) results.push({ c, score: 100 });
    else if (c.compact.startsWith(compactQ)) results.push({ c, score: 80 - Math.min(c.compact.length, 20) });
  }
  if (!results.length) {
    results = courses
      .filter((c) => words.every((w) => c.titleLower.includes(w)))
      .map((c) => ({ c, score: 30 }));
  }
  results.sort((a, b) => b.score - a.score || naturalCompare(a.c.key, b.c.key));
  return results.slice(0, limit).map((r) => r.c);
}

// Load the description for a course (fetches that subject's file once).
export async function getDescription(course) {
  const subject = course.subject;
  if (!descriptionFiles[subject]) {
    const response = await fetch(`data/desc/${encodeURIComponent(subject)}.json`);
    descriptionFiles[subject] = response.ok ? await response.json() : {};
  }
  return descriptionFiles[subject][course.key] || '';
}

// Link to the course's full page on Stanford ExploreCourses.
export function exploreCoursesUrl(code) {
  const year = meta?.academicYear || '';
  return `https://explorecourses.stanford.edu/search?view=catalog&academicYear=${year}&q=${encodeURIComponent(code)}`;
}

// "3 units" or "3–5 units"
export function unitsLabel(course) {
  return course.unitsMin === course.unitsMax
    ? `${course.unitsMax} unit${course.unitsMax === 1 ? '' : 's'}`
    : `${course.unitsMin}–${course.unitsMax} units`;
}

// Quarters in calendar order, shortened: "Aut · Win · Spr"
export function termsLabel(course) {
  const order = ['Autumn', 'Winter', 'Spring', 'Summer'];
  return order.filter((t) => course.terms.includes(t)).map((t) => t.slice(0, 3)).join(' · ');
}

// Sorts "ME 10" before "ME 102" before "ME 20" the way people expect.
function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true });
}
