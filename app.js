// Mohnblume's Bookshelf.
// Screens, chosen by the end of the web address:
//   Home  (#)               – books grouped by year (newest first), then the Want to read list
//   Book  (#book/id)        – one book's details, ratings and review
//   Add   (#add)            – the form for logging a new book
//   Add   (#add/want/id)    – the same, filled in from a Want to read item
//   Edit  (#edit/id)        – the same form, filled in, plus Delete
//   Backup (#backup)        – export everything to a file, or import a file back
//   Cover (#cover/id)       – pick a cover from the book's editions, or use your own photo
// Everything is saved in the browser's database (IndexedDB). books.json is only the starting list.

// ---------- Settings ----------

const CATEGORIES = {
  fiction: ["characters", "plot", "style"],
  nonfiction: ["prose", "insight", "storytelling"],
};

// Line icons from Lucide (lucide.dev, ISC licence). Each is the inside of a 24×24 SVG.
const ICONS = {
  characters: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  plot: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  style: '<path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/>',
  prose: '<path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"/><path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"/><path d="m2.3 2.3 7.286 7.286"/><circle cx="11" cy="11" r="2"/>',
  insight: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  storytelling: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
};

// ---------- State (what the app currently knows) ----------

let db; // the open database
let books = [];
let wantList = []; // books you'd like to read: just { id, title, author, added }
let filter = "all"; // "all", "fiction" or "nonfiction"
let view = loadView(); // "list" or "mosaic"
let lastExport = null; // when a backup was last exported (a timestamp), or null if never
let homeScroll = 0; // remembers how far down the home list you were
let currentHash = ""; // the screen being shown…
let previousHash = ""; // …and the one before it

// ---------- Saving (IndexedDB) ----------
// The browser's built-in database. What's saved here is still there after you close the page.
// It has separate "stores" (like drawers): "books", "wantToRead", and "meta" for the app's own notes.
// Its commands report back later rather than straight away, so each one is wrapped in a Promise
// (a "result coming soon"), which lets the rest of the code simply `await` it.

function openDatabase() {
  // Bumping the version number (1 → 2) tells the browser the layout changed,
  // so it runs onupgradeneeded once to add what's missing. Saved books are untouched.
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("bookshelf", 2);
    request.onupgradeneeded = (event) => {
      const database = request.result;
      if (event.oldVersion < 1) database.createObjectStore("books", { keyPath: "id" });
      if (event.oldVersion < 2) {
        database.createObjectStore("wantToRead", { keyPath: "id" });
        database.createObjectStore("meta", { keyPath: "id" });
      }
    };
    // Another tab still has the old version open, so the upgrade has to wait. Say so instead of showing a blank page.
    request.onblocked = () => {
      document.getElementById("app").innerHTML =
        '<p class="empty">Updating… If this doesn’t finish, close any other tabs with the bookshelf open.</p>';
    };
    request.onsuccess = () => {
      const database = request.result;
      // If a newer version of the app opens in another tab, step aside: close and reload to get the new code.
      database.onversionchange = () => {
        database.close();
        location.reload();
      };
      resolve(database);
    };
    request.onerror = () => reject(request.error);
  });
}

function load(store, id) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function loadAll(store) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Adds a new item, or replaces the saved copy of an item with the same id.
function save(store, item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    transaction.objectStore(store).put(item);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Empties a store and fills it with `items`, all in one go: if anything fails, nothing changes.
function replaceAll(store, items) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    const objectStore = transaction.objectStore(store);
    objectStore.clear();
    for (const item of items) objectStore.put(item);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function remove(store, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    transaction.objectStore(store).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ---------- Open Library (book details from the internet) ----------
// A free book database: no account or key needed. See docs/OPEN_LIBRARY.md.

// Searches Open Library for a book. Gives back:
//   { key, first_publish_year, cover_i }  – the best match (key is its "work" address, e.g. /works/OL2431270W)
//   null                                  – looked, but Open Library doesn't know this book
//   undefined                             – couldn't ask (no internet?), so try again another time
async function searchOpenLibrary(title, author) {
  // A precise search first (title + author). If that finds nothing, a looser general search,
  // which catches books listed under another title, like The Dinner (Het Diner).
  const searches = [{ title, author }, { q: `${title} ${author}` }];
  for (const search of searches) {
    const params = new URLSearchParams({ ...search, limit: 1, fields: "key,first_publish_year,cover_i" });
    try {
      const response = await fetch(`https://openlibrary.org/search.json?${params}`);
      const data = await response.json();
      if (data.docs[0]) return data.docs[0];
    } catch (error) {
      return undefined;
    }
  }
  return null;
}

// The web address of a cover image. Sizes: "S", "M" or "L".
function coverAddress(coverId, size = "M") {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

// Looks up any book that hasn't been looked up yet (no olKey), one at a time, and fills in
// its publication year and a cover. Anything you've set yourself is never overwritten.
async function fillInDetails() {
  const missing = books.filter((b) => b.olKey === undefined);
  for (const book of missing) {
    const match = await searchOpenLibrary(book.title, book.author);
    if (match === undefined) return; // no internet: stop, and try again next time the app opens
    book.olKey = match?.key ?? null;
    if (book.published === undefined) book.published = match?.first_publish_year ?? null;
    if (!book.coverUrl && !book.coverPhoto && match?.cover_i) book.coverUrl = coverAddress(match.cover_i);
    await save("books", book);
  }
  if (missing.length > 0) refresh();
}

// Covers from every edition of a book, English editions first, for the cover picker.
// Open Library sometimes has duplicate records for one book (and the one the app found can be
// an empty one), so this gathers editions from the book's own record AND the top few matches
// of a general search. You pick by eye, so a few extra options don't hurt.
async function findEditionCovers(book) {
  const params = new URLSearchParams({ q: `${book.title} ${book.author}`, limit: 3, fields: "key" });
  const search = await (await fetch(`https://openlibrary.org/search.json?${params}`)).json();
  const keys = [...new Set([book.olKey, ...search.docs.map((d) => d.key)].filter(Boolean))];

  // Promise.allSettled asks for all the records at the same time, instead of one after another,
  // and carries on with whichever answered, so one hiccup doesn't lose all the covers.
  const results = await Promise.allSettled(
    keys.map((key) => fetch(`https://openlibrary.org${key}/editions.json?limit=50`).then((r) => r.json()))
  );
  if (results.every((r) => r.status === "rejected")) throw new Error("Open Library didn't answer");

  const seen = new Set();
  const covers = [];
  for (const result of results.filter((r) => r.status === "fulfilled")) {
    for (const edition of result.value.entries) {
      const coverId = edition.covers?.find((c) => c > 0); // -1 means "no cover"
      if (!coverId || seen.has(coverId)) continue;
      seen.add(coverId);
      // Show the edition's title only if it's different, e.g. a translation or a box set.
      const otherTitle = edition.title && edition.title.toLowerCase() !== book.title.toLowerCase() ? edition.title : "";
      covers.push({
        coverId,
        caption: [otherTitle, edition.publishers?.[0], edition.publish_date].filter(Boolean).join(", "),
        english: edition.languages?.some((l) => l.key === "/languages/eng") ?? false,
      });
    }
  }
  return covers.sort((a, b) => b.english - a.english);
}

// ---------- Starting up ----------

async function start() {
  try {
    db = await openDatabase();
    books = await loadAll("books");
    wantList = await loadAll("wantToRead");
    lastExport = (await load("meta", "lastExport"))?.at ?? null;
    await copyInStarterBooks();
  } catch (error) {
    document.getElementById("app").innerHTML =
      '<p class="empty">Couldn’t load your books. Open the app through localhost, not by double-clicking the file.</p>';
    return;
  }
  const app = document.getElementById("app");
  window.addEventListener("hashchange", render);
  app.addEventListener("click", handleClick);
  app.addEventListener("change", handleChange);
  app.addEventListener("submit", handleSubmit);
  render();
  fillInDetails(); // runs in the background; no `await`, so the app doesn't wait for it
}

// books.json is the starter list, and it can grow (like when the 2025 list was added).
// This copies in any starter book this browser hasn't had before. It remembers which ones
// it has copied, so a book you delete stays deleted instead of coming back.
async function copyInStarterBooks() {
  const response = await fetch("books.json");
  const starters = await response.json();
  const record = await load("meta", "starterIds");

  let copied;
  if (record) copied = record.ids;
  else if (books.length === 0) copied = []; // a brand new browser: copy everything
  else copied = starters.filter((b) => b.year === 2026).map((b) => b.id); // the 2026 list was copied before this tracking existed

  for (const book of starters) {
    if (!copied.includes(book.id)) {
      await save("books", book);
      books.push(book);
    }
  }
  await save("meta", { id: "starterIds", ids: starters.map((b) => b.id) });
}

// Moving to a new screen: remember where we came from, then draw it.
function render() {
  previousHash = currentHash;
  currentHash = location.hash;
  draw();
}

// Redraws the current screen in place after a background update, keeping the scroll position.
// Forms, and screens with a file picker, are left alone so nothing you're typing or choosing gets wiped.
function refresh() {
  if (/^#(add|edit\/|cover\/)/.test(location.hash)) return;
  const scroll = window.scrollY;
  draw();
  window.scrollTo(0, scroll);
}

// Draws whichever screen the address points to.
function draw() {
  const app = document.getElementById("app");
  const bookMatch = location.hash.match(/^#book\/(.+)$/);
  const editMatch = location.hash.match(/^#edit\/(.+)$/);
  const coverMatch = location.hash.match(/^#cover\/(.+)$/);
  const wantMatch = location.hash.match(/^#add\/want\/(.+)$/);

  if (location.hash === "#add") {
    app.innerHTML = bookForm(null);
    window.scrollTo(0, 0);
  } else if (location.hash === "#backup") {
    app.innerHTML = backupScreen();
    window.scrollTo(0, 0);
  } else if (wantMatch) {
    const item = wantList.find((w) => w.id === wantMatch[1]);
    app.innerHTML = bookForm(null, item);
    window.scrollTo(0, 0);
  } else if (bookMatch || editMatch || coverMatch) {
    const book = books.find((b) => b.id === (bookMatch || editMatch || coverMatch)[1]);
    if (!book) {
      location.replace("#"); // e.g. going "back" to a book that's just been deleted
      return;
    }
    if (bookMatch) app.innerHTML = bookScreen(book);
    else if (editMatch) app.innerHTML = bookForm(book);
    else {
      app.innerHTML = coverScreen(book);
      showEditionCovers(book);
    }
    window.scrollTo(0, 0);
  } else {
    app.innerHTML = homeScreen();
    window.scrollTo(0, homeScroll);
  }
}

function handleClick(event) {
  const tab = event.target.closest("[data-filter]");
  if (tab) {
    filter = tab.dataset.filter;
    refresh();
  }
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    view = viewButton.dataset.view;
    saveView(view);
    refresh();
  }
  if (event.target.closest(".book-row, .tile, .want-read")) {
    homeScroll = window.scrollY;
  }
  const rate = event.target.closest("[data-rate]");
  if (rate) {
    const icons = rate.parentElement;
    const score = Number(rate.dataset.score);
    // Tapping the score that's already chosen clears it.
    icons.dataset.value = Number(icons.dataset.value) === score ? "" : score;
    const value = Number(icons.dataset.value);
    icons.querySelectorAll("svg").forEach((svg, i) => svg.classList.toggle("on", i < value));
  }
  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) {
    handleDelete(deleteButton.dataset.delete);
  }
  const removeWant = event.target.closest("[data-remove-want]");
  if (removeWant) {
    handleRemoveWant(removeWant.dataset.removeWant);
  }
  if (event.target.closest("[data-export]")) {
    exportBackup();
  }
  const pick = event.target.closest("[data-pick-cover]");
  if (pick) {
    setCover({ coverUrl: coverAddress(pick.dataset.pickCover), coverPhoto: null });
  }
  if (event.target.closest("[data-clear-cover]")) {
    setCover({ coverUrl: null, coverPhoto: null });
  }
}

function handleChange(event) {
  // Switching Fiction/Non-fiction on the form swaps which rating categories are shown (see style.css).
  if (event.target.name === "type") {
    event.target.form.dataset.type = event.target.value;
  }
  // A backup file was picked on the Backup screen.
  if (event.target.name === "import-file" && event.target.files[0]) {
    importBackup(event.target.files[0]);
    event.target.value = ""; // so picking the same file again still counts as a change
  }
  // A photo was taken or chosen on the cover screen.
  if (event.target.name === "cover-photo" && event.target.files[0]) {
    useCoverPhoto(event.target.files[0]);
  }
}

// There are two forms: the little "Want to read" box and the big book form.
function handleSubmit(event) {
  event.preventDefault(); // stops the browser's default for forms, which is to reload the page
  if (event.target.classList.contains("want-add")) handleAddWant(event.target);
  else handleSave(event.target);
}

// ---------- Home screen ----------

function homeScreen() {
  const shown = books.filter((b) => filter === "all" || b.type === filter);
  const years = [...new Set(shown.map((b) => b.year))].sort((a, b) => b - a); // newest year first

  const sections = years.map((year) => {
    const yearBooks = shown
      .filter((b) => b.year === year)
      .sort((a, b) => b.position - a.position); // most recently read first
    const list = view === "mosaic"
      ? `<ol class="book-mosaic">${yearBooks.map(bookTile).join("")}</ol>`
      : `<ol class="book-list">${yearBooks.map(bookRow).join("")}</ol>`;
    return `
      <section>
        <h2 class="year">${year} <span class="count">${yearBooks.length}</span></h2>
        ${list}
      </section>`;
  });

  return `
    <header class="top">
      <div class="top-row">
        <h1>Mohnblume’s Bookshelf</h1>
        <a class="add-button" href="#add" aria-label="Log a book">+</a>
      </div>
      ${viewTabs()}
      ${filterTabs()}
    </header>
    ${sections.join("") || '<p class="empty">No books here yet.</p>'}
    ${wantSection()}
    <a class="backup-link" href="#backup">Backup · ${lastExport ? "last saved " + formatDate(lastExport) : "never saved"}</a>`;
}

function filterTabs() {
  const options = [["all", "All"], ["fiction", "Fiction"], ["nonfiction", "Non-fiction"]];
  const buttons = options.map(([value, label]) =>
    `<button data-filter="${value}" class="${filter === value ? "active" : ""}">${label}</button>`
  );
  return `<nav class="tabs">${buttons.join("")}</nav>`;
}

// Two tabs that switch the home screen between the list and the mosaic.
function viewTabs() {
  const options = [["list", "List"], ["mosaic", "Mosaic"]];
  const buttons = options.map(([value, label]) =>
    `<button data-view="${value}" class="${view === value ? "active" : ""}">${label}</button>`
  );
  return `<nav class="tabs view-tabs">${buttons.join("")}</nav>`;
}

// localStorage is the browser's simple "remember this setting" box. It suits small preferences;
// it can be unavailable (e.g. some private-browsing modes), so it's wrapped in try/catch.
function loadView() {
  try {
    return localStorage.getItem("view") === "mosaic" ? "mosaic" : "list"; // anything else (like the old "cards") → list
  } catch (error) {
    return "list";
  }
}

function saveView(value) {
  try {
    localStorage.setItem("view", value);
  } catch (error) {
    // Not remembered this time; nothing else to do.
  }
}

// Mosaic: better books get bigger tiles. Sizes snap to whole grid cells so they always fit together:
//   1 = small (1×1): unrated or under 3.5 · 2 = medium (2×2): 3.5–4.4 · 3 = large (3×3): 4.5 and up
function tileSize(book) {
  const avg = average(book);
  if (avg === null || avg < 3.5) return 1;
  if (avg < 4.5) return 2;
  return 3;
}

function bookTile(book) {
  return `
    <li class="tile size-${tileSize(book)}">
      <a href="#book/${book.id}" aria-label="${esc(book.title)}">${cover(book, "tile")}</a>
    </li>`;
}

function bookRow(book) {
  return `
    <li>
      <a class="book-row" href="#book/${book.id}">
        ${cover(book, "small")}
        <div class="info">
          <p class="title">${esc(book.title)}</p>
          <p class="author">${esc(book.author)}</p>
          ${dots(book)}
        </div>
      </a>
    </li>`;
}

// ---------- Want to read (bottom of the home screen) ----------

function wantSection() {
  const items = [...wantList].sort((a, b) => a.added - b.added); // in the order you added them
  const rows = items.map((item) => `
    <li>
      <div class="want-text">
        <span class="want-title">${esc(item.title)}</span>
        ${item.author ? `<span class="want-author">${esc(item.author)}</span>` : ""}
      </div>
      <a class="want-read" href="#add/want/${item.id}" aria-label="Log ${esc(item.title)} as read">Read</a>
      <button class="want-remove" data-remove-want="${item.id}" aria-label="Remove ${esc(item.title)}">×</button>
    </li>`);

  return `
    <section class="want">
      <h2 class="year">Want to read <span class="count">${items.length || ""}</span></h2>
      <ul class="want-list">${rows.join("")}</ul>
      <form class="want-add">
        <input name="want" placeholder="Title by Author" autocomplete="off" aria-label="Add a book you want to read">
        <button type="submit">Add</button>
      </form>
    </section>`;
}

async function handleAddWant(form) {
  const text = form.elements.want.value.trim();
  if (!text) return;
  // "Stand by Me by Stephen King" → split at the last " by ", so titles containing "by" still work.
  const split = text.toLowerCase().lastIndexOf(" by ");
  const item = {
    id: newId(),
    title: split > 0 ? text.slice(0, split).trim() : text,
    author: split > 0 ? text.slice(split + 4).trim() : "",
    added: Date.now(),
  };
  await save("wantToRead", item);
  wantList.push(item);
  refresh();
  document.querySelector(".want-add input").focus(); // ready to add another
}

async function handleRemoveWant(id) {
  await remove("wantToRead", id);
  wantList = wantList.filter((w) => w.id !== id);
  refresh();
}

// ---------- Backup screen ----------
// Your books live only in this browser, so a backup file is the safety net.
// It's plain JSON, the same format as books.json, so you can open and read it.

const BACKUP_LABEL = "mohnblumes-bookshelf"; // written into every backup, so import can recognise one

function backupScreen() {
  return `
    <a class="back" href="#">‹ Back</a>
    <div class="backup">
      <h1>Backup</h1>
      <p>Your books are saved only in this browser. Export a copy every so often and keep it somewhere safe, like iCloud Drive.</p>
      <button class="save" type="button" data-export>Export backup</button>
      <p class="hint">${lastExport ? "Last exported " + formatDate(lastExport) : "Never exported"} · ${books.length} books, ${wantList.length} want to read</p>

      <h2>Restore</h2>
      <p>Load a backup file. This <strong>replaces</strong> everything currently in the app with what’s in the file.</p>
      <label class="import-button">Import backup<input type="file" name="import-file" accept=".json,application/json"></label>
      <p class="status" role="status"></p>
    </div>`;
}

async function exportBackup() {
  const backup = {
    app: BACKUP_LABEL,
    version: 1,
    exported: new Date().toISOString(),
    books,
    wantToRead: wantList,
  };
  // A "Blob" is a chunk of file data made in the browser. Linking to it and "clicking" the link downloads it.
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `mohnblumes-bookshelf-${localDate()}.json`;
  link.click();
  URL.revokeObjectURL(link.href); // tidy up: the browser no longer needs to hold the file

  lastExport = Date.now();
  await save("meta", { id: "lastExport", at: lastExport });
  refresh();
}

async function importBackup(file) {
  const status = () => document.querySelector(".status");

  // Check the file really is a backup before trusting it with your books.
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch (error) {
    status().textContent = "That file isn’t a backup (it couldn’t be read as JSON). Nothing was changed.";
    return;
  }
  // Any label ending in "bookshelf" counts, so backups made under the app's earlier name still import.
  const looksRight =
    /bookshelf$/.test(backup.app) &&
    Array.isArray(backup.books) &&
    backup.books.every((b) => b.id && b.title && b.year && CATEGORIES[b.type]);
  if (!looksRight) {
    status().textContent = "That file isn’t a Mohnblume’s Bookshelf backup. Nothing was changed.";
    return;
  }

  const newWant = Array.isArray(backup.wantToRead) ? backup.wantToRead : [];
  const message =
    `Replace your ${books.length} books and ${wantList.length} want to read ` +
    `with the ${backup.books.length} books and ${newWant.length} want to read in this backup` +
    ` from ${formatDate(Date.parse(backup.exported))}?`;
  if (!confirm(message)) return;

  await replaceAll("books", backup.books);
  await replaceAll("wantToRead", newWant);
  books = backup.books;
  wantList = newWant;
  refresh();
  status().textContent = `Done: ${books.length} books and ${wantList.length} want to read restored.`;
}

// ---------- Cover screen ----------

function coverScreen(book) {
  return `
    <a class="back" href="#book/${book.id}">‹ Back</a>
    <div class="cover-picker">
      <h1>Choose a cover</h1>
      <p class="hint">${esc(book.title)} · ${esc(book.author)}</p>
      <label class="import-button">Take or choose a photo<input type="file" name="cover-photo" accept="image/*"></label>
      ${book.coverUrl || book.coverPhoto ? '<button class="delete" type="button" data-clear-cover>Remove cover</button>' : ""}
      <h2>Editions</h2>
      <div class="cover-grid"><p class="hint">Finding editions…</p></div>
    </div>`;
}

// Fills the grid once Open Library answers (the screen is drawn first, so it doesn't feel stuck).
async function showEditionCovers(book) {
  let covers;
  try {
    covers = await findEditionCovers(book);
  } catch (error) {
    covers = null;
  }
  const grid = document.querySelector(".cover-grid");
  if (!grid || location.hash !== `#cover/${book.id}`) return; // you've moved on to another screen
  if (covers === null) {
    grid.innerHTML = '<p class="hint">Couldn’t reach Open Library. Check your internet and try again.</p>';
  } else if (covers.length === 0) {
    grid.innerHTML = '<p class="hint">No covers found for this book. Try a photo instead.</p>';
  } else {
    grid.innerHTML = covers.map((c) => `
      <button type="button" data-pick-cover="${c.coverId}">
        <img src="${coverAddress(c.coverId)}" loading="lazy" alt="">
        <span>${esc(c.caption)}</span>
      </button>`).join("");
  }
}

// Saves a new cover for the book on screen, then goes back to its page.
async function setCover(changes) {
  const book = books.find((b) => b.id === location.hash.split("/")[1]);
  Object.assign(book, changes); // copies the changed fields onto the book
  await save("books", book);
  returnToBook(book.id);
}

async function useCoverPhoto(file) {
  try {
    setCover({ coverPhoto: await shrinkPhoto(file) });
  } catch (error) {
    document.querySelector(".cover-picker .hint").textContent = "That photo couldn’t be read. Try another.";
  }
}

// Phone photos are huge (often 3MB+). This redraws the photo at most 600px tall on an invisible
// <canvas> and saves it as a small JPEG, usually around 50–100KB. The result is a "data URL":
// the whole image written out as text, so it fits in the database and in backup files.
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 600 / image.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(image.src);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

// ---------- Book screen ----------

function bookScreen(book) {
  const rows = CATEGORIES[book.type].map((category) => ratingRow(category, book.ratings[category]));
  // undefined = still being looked up; null = Open Library didn't know it
  const published = book.published ?? (book.published === undefined ? "…" : "—");
  return `
    <div class="bar">
      <a class="back" href="#">‹ Back</a>
      <a class="edit" href="#edit/${book.id}">Edit</a>
    </div>
    <article class="book">
      ${cover(book, "large")}
      <a class="change-cover" href="#cover/${book.id}">Change cover</a>
      <h1>${esc(book.title)}</h1>
      <p class="author">${esc(book.author)}</p>
      <p class="meta">${book.type === "fiction" ? "Fiction" : "Non-fiction"}</p>
      <dl class="facts">
        <div><dt>Published</dt><dd>${published}</dd></div>
        <div><dt>Read</dt><dd>${book.year}</dd></div>
      </dl>
      <div class="ratings">${rows.join("")}</div>
      ${average(book) === null ? '<p class="hint unrated">Not rated yet. Tap Edit to rate it.</p>' : ""}
      ${book.review ? `<p class="review">${esc(book.review)}</p>` : ""}
    </article>`;
}

function ratingRow(category, score) {
  let icons = "";
  for (let i = 1; i <= 5; i++) {
    icons += `<svg class="icon ${score >= i ? "on" : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[category]}</svg>`;
  }
  return `
    <div class="rating-row">
      <span class="label">${category}</span>
      <span class="icons" aria-label="${score ? score + " out of 5" : "not rated"}">${icons}</span>
    </div>`;
}

// ---------- Add / edit screen ----------
// One form does both jobs. With no book it's blank ("Log a book"); with a book it's filled in ("Edit").
// `from` is an optional Want to read item, used to fill in the title and author.

function bookForm(book, from) {
  const editing = book !== null;
  const type = editing ? book.type : "fiction";
  const ratings = editing ? book.ratings : {};
  const title = editing ? book.title : from?.title ?? "";
  const author = editing ? book.author : from?.author ?? "";

  // Both sets of categories are drawn; the stylesheet shows only the one matching the chosen type.
  const groups = Object.entries(CATEGORIES).map(([groupType, categories]) => `
    <div class="rate-group" data-for="${groupType}">
      ${categories.map((category) => rateInput(category, ratings[category])).join("")}
    </div>`);

  return `
    <a class="back" href="${editing ? `#book/${book.id}` : "#"}">‹ Cancel</a>
    <form class="book-form" data-type="${type}" data-id="${editing ? book.id : ""}" data-want="${from?.id ?? ""}">
      <h1>${editing ? "Edit book" : "Log a book"}</h1>
      <label>Title <input name="title" required autocomplete="off" value="${esc(title)}"></label>
      <label>Author <input name="author" required autocomplete="off" value="${esc(author)}"></label>
      <div class="choice">
        <label><input type="radio" name="type" value="fiction" ${type === "fiction" ? "checked" : ""}> Fiction</label>
        <label><input type="radio" name="type" value="nonfiction" ${type === "nonfiction" ? "checked" : ""}> Non-fiction</label>
      </div>
      <div class="pair">
        <label>Year read <input name="year" type="number" inputmode="numeric" value="${editing ? book.year : new Date().getFullYear()}" required></label>
        <label>Published <input name="published" type="number" inputmode="numeric" value="${editing ? book.published ?? "" : ""}" placeholder="Auto"></label>
      </div>
      <fieldset>
        <legend>Ratings <span class="hint">optional · tap again to clear</span></legend>
        ${groups.join("")}
      </fieldset>
      <label>Review <span class="hint">optional</span> <textarea name="review" rows="6">${editing ? esc(book.review) : ""}</textarea></label>
      <button class="save" type="submit">${editing ? "Save changes" : "Save book"}</button>
      ${editing ? `<button class="delete" type="button" data-delete="${book.id}">Delete book</button>` : ""}
    </form>`;
}

// Five tappable icons for one category. The chosen score is kept in data-value.
function rateInput(category, score) {
  let buttons = "";
  for (let i = 1; i <= 5; i++) {
    buttons += `<button type="button" data-rate="${category}" data-score="${i}" aria-label="${category} ${i} out of 5">
      <svg class="icon ${score >= i ? "on" : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[category]}</svg>
    </button>`;
  }
  return `
    <div class="rating-row">
      <span class="label">${category}</span>
      <span class="icons" data-category="${category}" data-value="${score || ""}">${buttons}</span>
    </div>`;
}

async function handleSave(form) {
  const existing = books.find((b) => b.id === form.dataset.id); // undefined when adding a new book
  const type = form.elements.type.value;
  const year = Number(form.elements.year.value);
  const publishedText = form.elements.published.value;

  // Only keep the categories that were actually scored, for the chosen type.
  const ratings = {};
  for (const category of CATEGORIES[type]) {
    const value = Number(form.querySelector(`[data-category="${category}"]`).dataset.value);
    if (value) ratings[category] = value;
  }

  // A book keeps its place unless it's new or moved to a different year;
  // then it goes after every other book already logged for that year.
  const keepsPlace = existing && existing.year === year;
  const positions = books.filter((b) => b.year === year && b !== existing).map((b) => b.position);
  const title = form.elements.title.value.trim();
  const author = form.elements.author.value.trim();
  // Look the book up (again) on Open Library if it's new, renamed, or its Published box was left blank.
  const needsLookup = !existing || existing.title !== title || existing.author !== author || !publishedText;

  const book = {
    // "..." copies everything from the old version first (such as the cover), then the lines below overwrite it.
    ...(existing || { id: newId(), coverUrl: null, coverPhoto: null }),
    title,
    author,
    type,
    year,
    position: keepsPlace ? existing.position : Math.max(0, ...positions) + 1,
    published: publishedText ? Number(publishedText) : undefined, // blank = look it up
    olKey: needsLookup ? undefined : existing.olKey,
    ratings,
    review: form.elements.review.value.trim(),
  };

  await save("books", book);
  books = books.filter((b) => b.id !== book.id).concat(book);

  // Logged from the Want to read list? Then it comes off that list.
  if (form.dataset.want) await handleRemoveWant(form.dataset.want);

  if (existing) {
    returnToBook(book.id);
  } else {
    homeScroll = 0;
    location.replace("#"); // back to home, replacing the form in history
  }
  fillInDetails(); // looks up the year and cover in the background, if needed
}

// Back to a book's page. If that's where we came from, step back so "back" doesn't reopen the form or picker.
function returnToBook(id) {
  if (previousHash === `#book/${id}`) history.back();
  else location.replace(`#book/${id}`);
}

async function handleDelete(id) {
  const book = books.find((b) => b.id === id);
  // confirm() shows the phone's own "OK / Cancel" pop-up, a safety net against accidental taps.
  if (!confirm(`Delete “${book.title}”? This can’t be undone.`)) return;
  await remove("books", id);
  books = books.filter((b) => b.id !== id);
  location.replace("#");
}

// ---------- Small pieces used by several screens ----------

// The overall score is worked out from the categories, never stored.
function average(book) {
  const scores = Object.values(book.ratings).filter((s) => s != null);
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

// Five dots, rounded to the nearest half. Unrated books get no dots.
function dots(book) {
  const avg = average(book);
  if (avg === null) return "";
  const rounded = Math.round(avg * 2) / 2;
  let html = "";
  for (let i = 1; i <= 5; i++) {
    const kind = rounded >= i ? "full" : rounded >= i - 0.5 ? "half" : "";
    html += `<span class="dot ${kind}"></span>`;
  }
  return `<div class="dots" aria-label="${rounded} out of 5">${html}</div>`;
}

// Your photo if there is one, then the Open Library cover, otherwise a soft coloured block with the first letter.
// The book's colour sits behind the image too, so there's no blank gap while it loads.
// loading="lazy" means images further down the list only load as you scroll to them.
function cover(book, size) {
  let src = book.coverPhoto || book.coverUrl;
  if (src && size !== "small" && !book.coverPhoto) src = src.replace("-M.jpg", "-L.jpg"); // sharper for the big ones
  if (src) return `<img class="cover ${size}" src="${esc(src)}" loading="lazy" alt="" style="--hue: ${hue(book.title)}">`;
  // Mosaic tiles have no text underneath, so their placeholder shows the whole title, not just the first letter.
  const label = size === "tile" ? book.title : book.title[0];
  return `<div class="cover ${size} placeholder" style="--hue: ${hue(book.title)}">${esc(label)}</div>`;
}

// Turns a title into a number from 0–359, so each book always gets the same colour.
function hue(text) {
  let n = 0;
  for (const c of text) n = (n * 31 + c.charCodeAt(0)) % 360;
  return n;
}

// A timestamp as a short date in your phone's own style, e.g. "27 Oct 2026".
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// Today's date as 2026-10-27, for file names (this order sorts correctly in a folder).
function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// A random label like "mf3k9x2a7q" so every book can be told apart.
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Makes text safe to put inside HTML, so a title like "<b>" shows as text instead of becoming code.
function esc(text) {
  const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(text).replace(/[&<>"']/g, (c) => replacements[c]);
}

start();
