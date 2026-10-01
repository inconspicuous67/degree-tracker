/*
  general-reqs.js — Stanford's general education requirements for every
  undergraduate, written by hand from the 2026–27 Stanford Bulletin page
  "Undergraduate General Education Requirements":
  https://bulletin.stanford.edu/academic-polices/degree-requirements/general-education

  Unlike majors, the Bulletin doesn't publish these as structured data, so they
  live here. Classes are matched using the tags in Stanford's catalog
  (e.g. a course tagged "WAY-SI" counts toward Social Inquiry).

  ⚠️ Things the app can't see — AP credit, placement tests, transfer credit,
  SLE/ITALIC — mark those requirements done yourself on the Reqs tab.
*/

export const GENERAL_REQUIREMENTS = {
  code: 'GENERAL',
  name: 'Stanford General Requirements',
  degree: 'All students',
  kind: 'general',
  url: 'https://bulletin.stanford.edu/academic-polices/degree-requirements/general-education',
  blocks: [
    {
      name: 'Ways of Thinking / Ways of Doing (11 courses)',
      // A course certified for two Ways counts toward only one of them
      exclusive: true,
      rules: [
        { type: 'tags', name: 'Aesthetic & Interpretive Inquiry (A-II)', tags: ['WAY-A-II'], count: 2 },
        { type: 'tags', name: 'Applied Quantitative Reasoning (AQR)', tags: ['WAY-AQR'], count: 1 },
        { type: 'tags', name: 'Creative Expression (CE)', tags: ['WAY-CE', 'way_ce'], count: 1,
          notes: 'CE courses may be 1–2 units; other Ways courses must be at least 3 units.' },
        { type: 'tags', name: 'Exploring Difference & Power (EDP)', tags: ['WAY-EDP'], count: 1 },
        { type: 'tags', name: 'Ethical Reasoning (ER)', tags: ['WAY-ER'], count: 1 },
        { type: 'tags', name: 'Formal Reasoning (FR)', tags: ['WAY-FR'], count: 1 },
        { type: 'tags', name: 'Social Inquiry (SI)', tags: ['WAY-SI'], count: 2 },
        { type: 'tags', name: 'Scientific Method & Analysis (SMA)', tags: ['WAY-SMA'], count: 2 },
      ],
      notes: 'Ways courses must be taken for a letter grade and at least 3 units (CE excepted).',
    },
    {
      name: 'Writing and Rhetoric',
      rules: [
        { type: 'tags', name: 'Writing & Rhetoric 1 (PWR 1)', tags: ['Writing 1'], count: 1,
          notes: 'Also satisfied by SLE, ESF, ITALIC, or approved transfer credit.' },
        { type: 'tags', name: 'Writing & Rhetoric 2 (PWR 2 or WRITE 2)', tags: ['Writing 2'], count: 1,
          notes: 'Also satisfied by SLE or approved transfer credit.' },
        { type: 'manual', name: 'Writing in the Major (WIM)',
          notes: 'A writing-intensive course designated by your major department.' },
      ],
    },
    {
      name: 'Language',
      rules: [
        { type: 'tags', name: 'One year of a foreign language', tags: ['Language'], count: 1,
          notes: 'Counted here when you complete a course tagged "Language" in the catalog. '
            + 'Also satisfied by AP score of 4–5, SAT Subject Test, or placement — mark it done yourself if so.' },
      ],
    },
    {
      name: 'COLLEGE (first year)',
      rules: [
        { type: 'tags', name: 'Two COLLEGE courses', tags: ['College'], count: 2,
          notes: 'Taken in your first year, or complete SLE or ITALIC instead.' },
      ],
    },
  ],
};
