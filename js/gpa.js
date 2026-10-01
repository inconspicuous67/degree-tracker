/*
  gpa.js — grades, units earned, and GPA.

  ⚠️ CHECK THIS: the grade-point values below are Stanford's standard
  letter-grade scale as we understand it (A+ = 4.3). Confirm against the
  Stanford Registrar's grading page; if anything differs, change it here
  and the whole app updates.
*/

// Letter grades that count toward GPA, and their points.
export const GRADE_POINTS = {
  'A+': 4.3, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
};

// Grades that earn units but are NOT in your GPA.
const PASSING_NO_GPA = ['CR', 'S'];

// Every grade you can pick in the app (blank = no grade yet).
export const GRADE_OPTIONS = ['', ...Object.keys(GRADE_POINTS), 'CR', 'S', 'NC', 'NP', 'W', 'I'];

// Does this completed class give you its units?
// (No grade yet counts as passing, so finished-but-ungraded classes still count.)
export function earnsUnits(cls) {
  if (cls.status !== 'completed') return false;
  return !cls.grade || cls.grade in GRADE_POINTS || PASSING_NO_GPA.includes(cls.grade);
}

// Total units you've earned so far.
export function unitsEarned(classes) {
  return classes.filter(earnsUnits).reduce((sum, c) => sum + (Number(c.units) || 0), 0);
}

// GPA = (sum of grade points × units) ÷ (sum of units), letter grades only.
// Returns null if there are no letter grades yet.
export function gpa(classes) {
  let points = 0;
  let units = 0;
  for (const c of classes) {
    if (c.status === 'completed' && c.grade in GRADE_POINTS) {
      points += GRADE_POINTS[c.grade] * (Number(c.units) || 0);
      units += Number(c.units) || 0;
    }
  }
  return units > 0 ? points / units : null;
}
