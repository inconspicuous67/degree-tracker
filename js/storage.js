/*
  storage.js — saving and loading ALL of the app's data.

  The whole app's data is one JavaScript object (see emptyData below).
  We save it in the browser's "localStorage", a small storage box that
  belongs to this website on this phone. It survives closing the app.
  Nothing is ever sent to the internet.

  localStorage can only store text, so:
    saving  = turn the object into text   (JSON.stringify)
    loading = turn the text back into an object (JSON.parse)
*/

// The name of our storage box. Changing this would "lose" old data,
// so leave it alone.
const STORAGE_KEY = 'degree-tracker-data';

// Bump this number if we ever change the shape of the data, so older
// saved data can be upgraded. (We'll only need this much later, if ever.)
export const DATA_VERSION = 1;

// What a brand-new, empty app looks like. This is the app's "spine":
// every feature reads from and writes to one of these sections.
export function emptyData() {
  return {
    version: DATA_VERSION,
    settings: {
      unitsNeeded: null, // total units to graduate — YOU enter this
      classOf: null,     // graduating class, e.g. 2029 (first Autumn = 2025)
      programs: [],      // majors/minors you're considering, e.g. ['ME-BS', 'MGTSC-BS']
      overrides: {},     // requirements you've marked done yourself (AP credit, etc.)
    },
    // Every class you've taken, are taking, or plan to take. One looks like:
    // { id, code: 'ME 102', title, units: 3, grade: 'A-',
    //   season: 'Autumn', year: 2026, status: 'completed' | 'in-progress' | 'planned' }
    classes: [],
  };
}

// Load saved data. If nothing is saved yet (or it's damaged), start empty.
export function loadData() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return emptyData();
    const saved = JSON.parse(text);
    // Start from an empty object and lay the saved data on top. This way,
    // if we add a new section in a later step, old saved data still has it.
    const data = { ...emptyData(), ...saved };
    data.settings = { ...emptyData().settings, ...saved.settings };
    return data;
  } catch (error) {
    console.error('Could not load saved data:', error);
    return emptyData();
  }
}

// Save data. Returns true if it worked, false if not (e.g. storage full).
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Could not save data:', error);
    return false;
  }
}
