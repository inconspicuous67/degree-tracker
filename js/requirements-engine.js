/*
  requirements-engine.js — checks your classes against a program's requirements.

  Programs come from data/programs.json (made by scripts/fetch_programs.py
  from the Stanford Bulletin), plus Stanford's general requirements
  (js/general-reqs.js).

  For every requirement we work out a status:
    'done'      — satisfied by classes you've COMPLETED
    'progress'  — partly satisfied, or would be satisfied once in-progress /
                  planned classes are finished
    'remaining' — nothing toward it yet
    'manual'    — a written rule the app can't check; read it yourself

  Simplification to know about: a class can count toward several different
  requirements here. Your official degree progress report decides what can
  "double count", so always confirm there.
*/

import { getCourse } from './catalog.js';
import { earnsUnits } from './gpa.js';

let programsCache = null;

// Load every Stanford major/minor (only the first time).
export async function loadPrograms() {
  if (programsCache) return programsCache;
  const response = await fetch('data/programs.json');
  const json = await response.json();
  programsCache = json.programs;
  return programsCache;
}

export function findProgram(code) {
  return programsCache?.find((p) => p.code === code);
}

// Split your classes into the ones that are done and the ones that will be.
function classSets(classes) {
  const done = classes.filter(earnsUnits);
  const active = classes.filter((c) => earnsUnits(c) || c.status === 'in-progress' || c.status === 'planned');
  return { done, active };
}

// Does a set of classes satisfy one option (e.g. "CME 100 or ENGR 154")?
// Returns the matching classes, or null.
function matchOption(option, classes) {
  const matches = option.codes.map((code) => classes.find((c) => c.code === code));
  if (option.all) return matches.every(Boolean) ? matches : null;
  const one = matches.find(Boolean);
  return one ? [one] : null;
}

// How far a set of classes gets on a "courses" rule.
function measure(rule, classes) {
  const used = new Set();
  let count = 0;
  let units = 0;
  for (const option of rule.options) {
    const found = matchOption(option, classes.filter((c) => !used.has(c.id)));
    if (!found) continue;
    found.forEach((c) => used.add(c.id));
    count += 1;
    units += found.reduce((t, c) => t + (Number(c.units) || 0), 0);
  }
  return { count, units, classes: [...used] };
}

function needs(rule) {
  if (rule.mode === 'all') return { count: rule.options.length, units: 0 };
  if (rule.mode === 'units') return { count: 0, units: rule.units };
  return { count: rule.count || 1, units: rule.units || 0 };
}

function satisfied(have, need) {
  return have.count >= need.count && have.units >= need.units;
}

// Evaluate one rule (and, for groups, everything inside it).
// id: a stable address for this rule, e.g. "ME-BS/0/2" (block 0, rule 2).
// overrides: requirements you've marked done yourself (AP credit etc.).
export function evaluate(rule, classes, id = '', overrides = {}) {
  const { done, active } = classSets(classes);

  if (overrides[id]) return { ...rule, id, status: 'done', overridden: true };
  if (rule.type === 'manual') return { ...rule, id, status: 'manual' };

  if (rule.type === 'group') {
    const children = rule.rules.map((r, i) => evaluate(r, classes, `${id}/${i}`, overrides));
    const checkable = children.filter((c) => c.status !== 'manual');
    let status;
    if (!checkable.length) status = 'manual';
    else if (rule.mode === 'all') {
      status = checkable.every((c) => c.status === 'done') ? 'done'
        : checkable.some((c) => c.status !== 'remaining') ? 'progress' : 'remaining';
    } else {
      status = checkable.some((c) => c.status === 'done') ? 'done'
        : checkable.some((c) => c.status === 'progress') ? 'progress' : 'remaining';
    }
    return { ...rule, id, status, children };
  }

  if (rule.type === 'tags') return { ...evaluateTags(rule, done, active), id };

  // A "courses" rule
  const need = needs(rule);
  const haveDone = measure(rule, done);
  const haveActive = measure(rule, active);
  let status = 'remaining';
  if (satisfied(haveDone, need)) status = 'done';
  else if (haveActive.count > 0) status = 'progress';
  return { ...rule, id, status, need, have: haveDone, haveActive, matched: haveActive.classes };
}

// Stanford general requirements by catalog tag (e.g. 2 courses tagged WAY-SI).
function evaluateTags(rule, done, active) {
  const tagged = (list) => list.filter((c) => (getCourse(c.code)?.gers || []).some((g) => rule.tags.includes(g)));
  const haveDone = tagged(done).length;
  const haveActive = tagged(active).length;
  const status = haveDone >= rule.count ? 'done' : haveActive > 0 ? 'progress' : 'remaining';
  return {
    ...rule, status,
    need: { count: rule.count, units: 0 },
    have: { count: haveDone, units: 0 },
    haveActive: { count: haveActive, units: 0 },
    matched: tagged(active).map((c) => c.id),
  };
}

// The "leaf" requirements of an evaluated program — the individual
// checklist items (Calculus, Vector Calculus, ...) used for progress bars.
export function leaves(evaluated) {
  const out = [];
  const walk = (r) => (r.children ? r.children.forEach(walk) : out.push(r));
  evaluated.forEach(walk);
  return out;
}

// For blocks marked "exclusive" (Ways): each class may count toward only ONE
// of the tag rules. We assign classes to rules so as many slots as possible
// are filled (a small "matching" algorithm), then evaluate each rule with
// only the classes assigned to it.
function evaluateExclusive(block, classes, blockId, overrides) {
  const { done, active } = classSets(classes);
  const assign = (pool) => {
    // One slot per course needed, e.g. WAY-SI needs 2 → two slots
    const slots = block.rules.flatMap((rule, r) => Array.from({ length: rule.count }, () => r));
    const slotOwner = new Array(slots.length).fill(null); // slot → class index
    const fits = (cls, r) => (getCourse(cls.code)?.gers || []).some((g) => block.rules[r].tags.includes(g));
    const tryClass = (ci, seen) => {
      for (let s = 0; s < slots.length; s++) {
        if (seen.has(s) || !fits(pool[ci], slots[s])) continue;
        seen.add(s);
        if (slotOwner[s] === null || tryClass(slotOwner[s], seen)) { slotOwner[s] = ci; return true; }
      }
      return false;
    };
    pool.forEach((_, ci) => tryClass(ci, new Set()));
    const perRule = block.rules.map(() => []);
    slotOwner.forEach((ci, s) => { if (ci !== null) perRule[slots[s]].push(pool[ci]); });
    return perRule;
  };
  const doneBy = assign(done);
  const activeBy = assign(active);
  return block.rules.map((rule, r) => {
    const id = `${blockId}/${r}`;
    if (overrides[id]) return { ...rule, id, status: 'done', overridden: true };
    const haveDone = doneBy[r].length;
    const haveActive = activeBy[r].length;
    return {
      ...rule,
      id,
      status: haveDone >= rule.count ? 'done' : haveActive > 0 ? 'progress' : 'remaining',
      need: { count: rule.count, units: 0 },
      have: { count: haveDone, units: 0 },
      haveActive: { count: haveActive, units: 0 },
      matched: activeBy[r].map((c) => c.id),
    };
  });
}

// Evaluate a whole program: blocks → rules, plus a summary for progress bars.
export function evaluateProgram(program, classes, overrides = {}) {
  const blocks = program.blocks.map((block, b) => ({
    ...block,
    rules: block.exclusive
      ? evaluateExclusive(block, classes, `${program.code}/${b}`, overrides)
      : block.rules.map((r, i) => evaluate(r, classes, `${program.code}/${b}/${i}`, overrides)),
  }));
  const counted = leaves(blocks.filter((b) => !b.optional).flatMap((b) => b.rules))
    .filter((r) => r.status !== 'manual');
  const done = counted.filter((r) => r.status === 'done').length;
  const progress = counted.filter((r) => r.status === 'progress').length;
  return { ...program, blocks, summary: { done, progress, total: counted.length } };
}

// Every requirement (across ALL programs) that a course can count toward.
// Returns [{ program, path: ['Core Program Requirements', 'Technical Electives'] }]
export function whereCourseCounts(code, programs) {
  const results = [];
  for (const program of programs) {
    for (const block of program.blocks) {
      const visit = (rule, path) => {
        const here = rule.name ? [...path, rule.name] : path;
        if (rule.rules) rule.rules.forEach((r) => visit(r, here));
        else if (rule.options?.some((o) => o.codes.includes(code))) {
          results.push({ program, path: here });
        }
      };
      block.rules.forEach((r) => visit(r, [block.name]));
    }
  }
  return results;
}
