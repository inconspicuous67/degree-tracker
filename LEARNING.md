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
├── index.html          ← the one page; holds the top bar and the tab bar
├── css/styles.css      ← all colors and layout (light + dark mode)
├── js/app.js           ← the "brain": loads data, switches tabs
├── js/storage.js       ← saving and loading your data on the phone
├── js/utils.js         ← small shared helpers
└── js/views/           ← one file per tab; each one draws its own screen
    ├── home.js
    ├── classes.js
    ├── requirements.js
    ├── catalog.js
    └── settings.js
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
