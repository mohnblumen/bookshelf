// Bookshelf app.
// Four screens, chosen by the end of the web address:
//   Home  (#)          – books grouped by year, newest first
//   Book  (#book/id)   – one book's ratings and review
//   Add   (#add)       – the form for logging a new book
//   Edit  (#edit/id)   – the same form, filled in, plus Delete
// Books are saved in the browser's database (IndexedDB). books.json is only the starting list.

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
let filter = "all"; // "all", "fiction" or "nonfiction"
let homeScroll = 0; // remembers how far down the home list you were
let currentHash = ""; // the screen being shown…
let previousHash = ""; // …and the one before it

// ---------- Saving (IndexedDB) ----------
// The browser's built-in database. Books saved here are still there after you close the page.
// Its commands report back later rather than straight away, so each one is wrapped in a Promise
// (a "result coming soon"), which lets the rest of the code simply `await` it.

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("bookshelf", 1);
    // Runs only the very first time: creates a "books" store where each book is found by its id.
    request.onupgradeneeded = () => request.result.createObjectStore("books", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function loadAllBooks() {
  return new Promise((resolve, reject) => {
    const request = db.transaction("books").objectStore("books").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Adds a new book, or replaces the saved copy of a book with the same id.
function saveBook(book) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("books", "readwrite");
    transaction.objectStore("books").put(book);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function deleteBook(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("books", "readwrite");
    transaction.objectStore("books").delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ---------- Starting up ----------

async function start() {
  try {
    db = await openDatabase();
    books = await loadAllBooks();
    if (books.length === 0) {
      // First visit: copy the starting list from books.json into the database.
      const response = await fetch("books.json");
      books = await response.json();
      for (const book of books) await saveBook(book);
    }
  } catch (error) {
    document.getElementById("app").innerHTML =
      '<p class="empty">Couldn’t load your books. Open the app through localhost, not by double-clicking the file.</p>';
    return;
  }
  const app = document.getElementById("app");
  window.addEventListener("hashchange", render);
  app.addEventListener("click", handleClick);
  app.addEventListener("change", handleChange);
  app.addEventListener("submit", handleSave);
  render();
}

// Draws whichever screen the address points to.
function render() {
  previousHash = currentHash;
  currentHash = location.hash;
  const app = document.getElementById("app");
  const bookMatch = location.hash.match(/^#book\/(.+)$/);
  const editMatch = location.hash.match(/^#edit\/(.+)$/);

  if (location.hash === "#add") {
    app.innerHTML = bookForm(null);
    window.scrollTo(0, 0);
  } else if (bookMatch || editMatch) {
    const book = books.find((b) => b.id === (bookMatch || editMatch)[1]);
    if (!book) {
      location.replace("#"); // e.g. going "back" to a book that's just been deleted
      return;
    }
    app.innerHTML = bookMatch ? bookScreen(book) : bookForm(book);
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
    render();
  }
  if (event.target.closest(".book-row")) {
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
  const remove = event.target.closest("[data-delete]");
  if (remove) {
    handleDelete(remove.dataset.delete);
  }
}

// Switching Fiction/Non-fiction on the form swaps which rating categories are shown (see style.css).
function handleChange(event) {
  if (event.target.name === "type") {
    event.target.form.dataset.type = event.target.value;
  }
}

// ---------- Home screen ----------

function homeScreen() {
  const shown = books.filter((b) => filter === "all" || b.type === filter);
  const years = [...new Set(shown.map((b) => b.year))].sort((a, b) => b - a); // newest year first

  const sections = years.map((year) => {
    const yearBooks = shown
      .filter((b) => b.year === year)
      .sort((a, b) => b.position - a.position); // most recently read first
    return `
      <section>
        <h2 class="year">${year} <span class="count">${yearBooks.length}</span></h2>
        <ol class="book-list">${yearBooks.map(bookRow).join("")}</ol>
      </section>`;
  });

  return `
    <header class="top">
      <div class="top-row">
        <h1>Bookshelf</h1>
        <a class="add-button" href="#add">＋ Log a book</a>
      </div>
      ${filterTabs()}
    </header>
    ${sections.join("") || '<p class="empty">No books here yet.</p>'}`;
}

function filterTabs() {
  const options = [["all", "All"], ["fiction", "Fiction"], ["nonfiction", "Non-fiction"]];
  const buttons = options.map(([value, label]) =>
    `<button data-filter="${value}" class="${filter === value ? "active" : ""}">${label}</button>`
  );
  return `<nav class="tabs">${buttons.join("")}</nav>`;
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

// ---------- Book screen ----------

function bookScreen(book) {
  const rows = CATEGORIES[book.type].map((category) => ratingRow(category, book.ratings[category]));
  return `
    <div class="bar">
      <a class="back" href="#">‹ Back</a>
      <a class="edit" href="#edit/${book.id}">Edit</a>
    </div>
    <article class="book">
      ${cover(book, "large")}
      <h1>${esc(book.title)}</h1>
      <p class="author">${esc(book.author)}</p>
      <p class="meta">${book.type === "fiction" ? "Fiction" : "Non-fiction"} · ${book.year}</p>
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

function bookForm(book) {
  const editing = book !== null;
  const type = editing ? book.type : "fiction";
  const ratings = editing ? book.ratings : {};

  // Both sets of categories are drawn; the stylesheet shows only the one matching the chosen type.
  const groups = Object.entries(CATEGORIES).map(([groupType, categories]) => `
    <div class="rate-group" data-for="${groupType}">
      ${categories.map((category) => rateInput(category, ratings[category])).join("")}
    </div>`);

  return `
    <a class="back" href="${editing ? `#book/${book.id}` : "#"}">‹ Cancel</a>
    <form class="book-form" data-type="${type}" data-id="${editing ? book.id : ""}">
      <h1>${editing ? "Edit book" : "Log a book"}</h1>
      <label>Title <input name="title" required autocomplete="off" value="${editing ? esc(book.title) : ""}"></label>
      <label>Author <input name="author" required autocomplete="off" value="${editing ? esc(book.author) : ""}"></label>
      <div class="choice">
        <label><input type="radio" name="type" value="fiction" ${type === "fiction" ? "checked" : ""}> Fiction</label>
        <label><input type="radio" name="type" value="nonfiction" ${type === "nonfiction" ? "checked" : ""}> Non-fiction</label>
      </div>
      <label>Year read <input name="year" type="number" inputmode="numeric" value="${editing ? book.year : new Date().getFullYear()}" required></label>
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

async function handleSave(event) {
  event.preventDefault(); // stops the browser's default for forms, which is to reload the page
  const form = event.target;
  const existing = books.find((b) => b.id === form.dataset.id); // undefined when adding a new book
  const type = form.elements.type.value;
  const year = Number(form.elements.year.value);

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

  const book = {
    // "..." copies everything from the old version first (such as the cover), then the lines below overwrite it.
    ...(existing || { id: newId(), coverUrl: null, coverPhoto: null }),
    title: form.elements.title.value.trim(),
    author: form.elements.author.value.trim(),
    type,
    year,
    position: keepsPlace ? existing.position : Math.max(0, ...positions) + 1,
    ratings,
    review: form.elements.review.value.trim(),
  };

  await saveBook(book);
  books = books.filter((b) => b.id !== book.id).concat(book);

  if (existing) {
    // Back to the book's page. If that's where we came from, step back so "back" doesn't reopen the form.
    if (previousHash === `#book/${book.id}`) history.back();
    else location.replace(`#book/${book.id}`);
  } else {
    homeScroll = 0;
    location.replace("#"); // back to home, replacing the form in history
  }
}

async function handleDelete(id) {
  const book = books.find((b) => b.id === id);
  // confirm() shows the phone's own "OK / Cancel" pop-up, a safety net against accidental taps.
  if (!confirm(`Delete “${book.title}”? This can’t be undone.`)) return;
  await deleteBook(id);
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

// Uses the real cover if there is one, otherwise a soft coloured block with the first letter.
function cover(book, size) {
  const src = book.coverPhoto || book.coverUrl;
  if (src) return `<img class="cover ${size}" src="${esc(src)}" alt="">`;
  return `<div class="cover ${size} placeholder" style="--hue: ${hue(book.title)}">${esc(book.title[0])}</div>`;
}

// Turns a title into a number from 0–359, so each book always gets the same colour.
function hue(text) {
  let n = 0;
  for (const c of text) n = (n * 31 + c.charCodeAt(0)) % 360;
  return n;
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
