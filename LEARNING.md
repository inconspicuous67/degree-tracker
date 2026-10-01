# LEARNING.md

A plain-language diary of how this app is built and why. One section per step.

---

## The big picture

This is a **web app**: a website made of three kinds of files that every phone browser understands.

| Kind | What it does | Our files |
|---|---|---|
| **HTML** | The *structure*: what's on the page | `index.html` |
| **CSS** | The *look*: colors, sizes, spacing | `css/styles.css` |
| **JavaScript (JS)** | The *behavior*: what happens when you tap, plus saving | everything in `js/` |

When you "Add to Home Screen" on iPhone, the website becomes an app icon and opens full-screen, like a normal app.

### Map of the files

```
degree-tracker/
├── index.html            ← the one page; holds the bottom tab bar
├── css/styles.css        ← all colors and layout (light + dark mode)
├── js/app.js             ← the "brain": loads data, picks the screen from the address
├── js/storage.js         ← saving and loading your data on the phone
├── js/catalog.js         ← loading and searching Stanford's course catalog
├── js/terms.js           ← quarter helpers (Autumn 2026, academic years...)
├── js/gpa.js             ← grade points, units earned, GPA
├── js/utils.js           ← small shared helpers (escapeHtml, Ways names)
├── js/views/             ← one file per screen; each draws itself
│   ├── home.js           ← "Where I stand"
│   ├── plan.js           ← four-year plan
│   ├── requirements.js   ← (next step)
│   ├── explore.js        ← catalog search
│   ├── course.js         ← one course's page
│   ├── class-form.js     ← add / edit / delete a class
│   └── settings.js
├── data/                 ← Stanford's 2026–27 catalog (made by the script below)
└── scripts/fetch_catalog.py ← downloads the catalog from ExploreCourses
```

**Rule of thumb:** if you want to change what a tab *shows*, open its file in `js/views/`. If you want to change how something *looks*, open `css/styles.css`.

---

## Step 1 — App shell

### Decisions and why

**1. A web app instead of a native iPhone app.**
Native iPhone apps need the full Xcode app, and without paying Apple $99/year they stop working every 7 days. A web app is free, needs no Xcode, and never expires. The tradeoff is that it feels slightly less "native".

**2. Plain HTML/CSS/JS with no framework (no React, etc.).**
Frameworks need extra tools and a "build" step before the code runs. Plain files run as-is, so you can open any file, read it, change it and reload.

**3. One page, with tabs drawn by JavaScript.**
`index.html` never changes. When you tap a tab, the end of the web address changes (for example `#classes`). `app.js` notices and asks that tab's file to draw itself into the `<main>` area. This is called a **router**. Ours is about 20 lines.

**4. All data lives in one object, saved in `localStorage`.**
`localStorage` is a small storage box that belongs to this website on this phone. It survives closing the app and restarting the phone, and it is never sent anywhere. The whole app's data is one object, with a section per feature (`settings`, `terms`, `classes`, `programs`, `catalog`). This shape is the app's "spine". See `emptyData()` in `js/storage.js`.

**5. Colors as variables, with automatic dark mode.**
Every color is defined once at the top of `styles.css` (like `--accent`). A second block redefines those colors for dark mode, and the phone picks the right block automatically.

**6. Text from users always goes through `escapeHtml()`.**
If a course title contained something like `<b>`, the browser would treat it as code. `escapeHtml` turns it into harmless text. Any time we show text you typed or imported, it goes through this function.

### How to run it

**On your Mac:** open Terminal and run:
```bash
cd ~/Claude/degree-tracker && python3 -m http.server 8000
```
Then open `http://localhost:8000` in Safari or Chrome. Press **Ctrl+C** in Terminal to stop the server.

**On your iPhone:** your phone and Mac must be on the **same Wi-Fi**.
1. Keep the command above running on your Mac.
2. Find your Mac's address with: `ipconfig getifaddr en0` (prints something like `10.30.40.116`).
3. On your iPhone, open Safari and go to `http://THAT-ADDRESS:8000`.
4. If your Mac asks whether Python may accept incoming connections, click **Allow**.

> Note: data saved while testing over Wi-Fi belongs to *that address*. When we move to the real hosted version in Step 7, it starts fresh. Step 6's export/import will carry your data over.

### Try it yourself (small changes)
- **Change the accent color:** in `css/styles.css`, change `--accent: #8c1515;` to another color (for example `#0a84ff` for blue). Save, then reload the page.
- **Rename a tab:** in `index.html`, change `<span>Reqs</span>` to `<span>Reqs!</span>`. The page title for each tab is set in the `tabs` list in `js/app.js`.
- **See the saved data:** on your Mac in Chrome, right-click → Inspect → Application → Local Storage → `degree-tracker-data`.

---

## Hosting — putting the app on the internet (free)

### What we did
- **Testing over Wi-Fi didn't work.** Campus Wi-Fi blocks devices from talking to each other, and the hotspot attempt didn't reach the Mac either. Rather than fight the network, we put the app online.
- **GitHub** stores the project's files. **GitHub Pages** turns those files into a website at
  `https://inconspicuous67.github.io/degree-tracker/`
- **GitHub Desktop** is the app that uploads changes from your Mac to GitHub with buttons instead of typed commands.

### Is it safe if the project is public?
Yes. Only the *code* is public. Your classes and grades are saved in your phone's browser storage and never uploaded. Anyone who opens the link sees an empty app with *their own* blank storage. There's no login and no server, so there's nothing to break into. `.gitignore` also blocks any file named like a backup or export from ever being uploaded.

### Key words
- **Repository (repo):** a project folder that remembers its history.
- **Commit:** a saved snapshot of the project, with a message describing it.
- **Push / Publish:** upload your commits to GitHub.
- **Branch `main`:** the main line of history. GitHub Pages builds the site from it.

### How to upload a new version yourself (every future step)
1. Open **GitHub Desktop**. Changed files appear under **Changes** on the left.
2. Bottom-left: type a short summary (for example "Step 2: classes"), then click **Commit to main**.
3. Click **Push origin** at the top.
4. Wait 1–2 minutes, then reload the app on your phone.

### Mistake we hit (so you can avoid it)
**File → New Repository** creates a *new, empty* project. To use a folder that already exists, use **File → Add Local Repository**.

---

## Step 2 — Redesign, Stanford catalog, and the Plan

### Decisions and why

**1. The whole Stanford catalog is built into the app.**
`scripts/fetch_catalog.py` asked Stanford ExploreCourses for every department's 2026–27 courses (256 departments, 15,792 courses) and saved them in `data/`. The app reads those files, so it never has to contact Stanford while you use it. **Next year:** run `python3 scripts/fetch_catalog.py 20272028` from the `degree-tracker` folder, then upload.

**2. The catalog is split into a small file and many description files.**
`data/courses.json` (codes, titles, units, quarters, Ways) loads once when you open Explore. Descriptions are big, so each subject has its own file in `data/desc/`. Only the subject you open gets downloaded. This keeps the app fast on a phone.

**3. Screens are chosen by the web address.**
Everything after `#` says which screen to show and what's on it, e.g. `#course/ME%2080?term=2026-Autumn`. (`%20` is how web addresses write a space.) This means the phone's back gesture works, and every screen has its own address.

**4. Each class stores its own quarter and status.**
A class looks like `{ code: 'ME 80', units: 4, season: 'Autumn', year: 2026, status: 'in-progress', grade: '' }`. The Plan screen just groups classes by quarter. Home adds up units and GPA from the same list. There's one list and many views of it, so nothing can get out of sync.

**5. Status is suggested from the quarter.**
Past quarter → Done, this quarter → In progress, future → Planned. You can always change it.

**6. GPA lives in one file (`js/gpa.js`).**
The grade-point table is at the top. ⚠️ Double-check it against the Stanford Registrar. If a value differs, change that one line and every GPA in the app updates.

**7. Searching codes beats searching titles.**
Typing "ME 80" shows only course codes starting with ME80. Only if no code matches does it search titles (e.g. "thermo").

### Try it yourself (small changes)
- **Add a quick-search button:** in `js/views/explore.js`, add a subject to the `QUICK` list, e.g. `'CEE'`.
- **Change "about N quarters at X units":** the estimate is in `js/views/home.js`. Search for `estimate`.
- **Change the Stanford red:** `--accent` at the top of `css/styles.css`.
