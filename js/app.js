/*
  app.js — the app's "brain". It runs first and:
    1. Loads your saved data
    2. Decides which tab to show, based on the URL (#home, #classes, ...)
    3. Asks that tab's file in js/views/ to draw itself

  HOW TABS WORK: tapping a tab changes the end of the URL, e.g. to "#classes".
  The browser fires a "hashchange" event, and showCurrentTab() runs again.
*/

import { loadData, saveData } from './storage.js';
import * as homeView from './views/home.js';
import * as classesView from './views/classes.js';
import * as requirementsView from './views/requirements.js';
import * as catalogView from './views/catalog.js';
import * as settingsView from './views/settings.js';

// The list of tabs. To add a tab: make a file in js/views/, import it
// above, add a line here, and add a link in index.html's tab bar.
const tabs = {
  home:         { title: 'Home',         view: homeView },
  classes:      { title: 'Classes',      view: classesView },
  requirements: { title: 'Requirements', view: requirementsView },
  catalog:      { title: 'Catalog',      view: catalogView },
  settings:     { title: 'Settings',     view: settingsView },
};

// "app" is handed to every screen so they can read the data and save it.
const app = {
  data: loadData(),
  // Call app.save() after changing app.data. Returns true if it worked.
  save() {
    return saveData(this.data);
  },
};

function showCurrentTab() {
  // location.hash is e.g. "#classes" → remove the "#" → "classes"
  const name = location.hash.slice(1) || 'home';
  const tab = tabs[name] || tabs.home; // unknown name? go Home

  document.getElementById('page-title').textContent = tab.title;

  // Highlight the matching tab button at the bottom
  document.querySelectorAll('.tab-bar a').forEach((link) => {
    link.classList.toggle('active', link.dataset.tab === (tabs[name] ? name : 'home'));
  });

  // Clear the screen and let the tab draw itself
  const container = document.getElementById('view');
  container.innerHTML = '';
  tab.view.render(container, app);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', showCurrentTab);
showCurrentTab();
