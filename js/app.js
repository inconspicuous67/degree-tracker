/*
  app.js — the app's "brain". It runs first and:
    1. Loads your saved data
    2. Reads the web address to decide which screen to show
    3. Asks that screen's file in js/views/ to draw itself

  HOW SCREENS WORK: the part of the address after "#" picks the screen.
    #home                      → Home
    #plan/2026                 → Plan, showing the 2026–27 year
    #explore?term=2027-Winter  → Explore, adding classes to Winter 2027
    #course/ME%20102           → the ME 102 course page
    #class/new?code=ME%20102   → form to add ME 102
    #class/k3x9f2a1            → form to edit one of your classes
  When the address changes, the browser fires "hashchange" and we redraw.
*/

import { loadData, saveData } from './storage.js';
import * as homeView from './views/home.js';
import * as planView from './views/plan.js';
import * as requirementsView from './views/requirements.js';
import * as exploreView from './views/explore.js';
import * as courseView from './views/course.js';
import * as classFormView from './views/class-form.js';
import * as settingsView from './views/settings.js';
import * as programsView from './views/programs.js';

// Screen name → { view file, which bottom tab to highlight }
const screens = {
  home:         { view: homeView,         tab: 'home' },
  plan:         { view: planView,         tab: 'plan' },
  requirements: { view: requirementsView, tab: 'requirements' },
  explore:      { view: exploreView,      tab: 'explore' },
  course:       { view: courseView,       tab: 'explore' },
  class:        { view: classFormView,    tab: 'plan' },
  settings:     { view: settingsView,     tab: 'home' },
  programs:     { view: programsView,     tab: 'requirements' },
};

// "app" is handed to every screen so it can read and save data.
const app = {
  data: loadData(),
  save() {
    return saveData(this.data); // true if it worked
  },
  go(hash) {
    location.hash = hash; // switch screens from code
  },
};

function showCurrentScreen() {
  // "#course/ME%20102?x=1" → path "course/ME%20102", query "x=1"
  const [path, query = ''] = location.hash.slice(1).split('?');
  const [name, ...rest] = path.split('/');
  const screen = screens[name] || screens.home;

  // Extra info for the screen: the part after the "/" and the "?" options
  const route = {
    param: rest.length ? decodeURIComponent(rest.join('/')) : null,
    query: new URLSearchParams(query),
  };

  document.querySelectorAll('.tab-bar a').forEach((link) => {
    link.classList.toggle('active', link.dataset.tab === screen.tab);
  });

  const container = document.getElementById('view');
  container.innerHTML = '';
  container.onclick = null; // forget the previous screen's tap handler
  window.scrollTo(0, 0);
  screen.view.render(container, app, route);
}

window.addEventListener('hashchange', showCurrentScreen);
showCurrentScreen();
