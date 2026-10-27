// Bookshelf prototype.
// Reads books.json and shows two screens:
//   Home  (address ends in #)         – books grouped by year
//   Book  (address ends in #book/id)  – one book's ratings and review

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

let books = [];
let filter = "all"; // "all", "fiction" or "nonfiction"
let homeScroll = 0; // remembers how far down the home list you were

// ---------- Starting up ----------

async function start() {
  try {
    const response = await fetch("books.json");
    books = await response.json();
  } catch (error) {
    document.getElementById("app").innerHTML =
      '<p class="empty">Couldn’t load books.json. Open the app through localhost, not by double-clicking the file.</p>';
    return;
  }
  window.addEventListener("hashchange", render);
  document.getElementById("app").addEventListener("click", handleClick);
  render();
}

// Draws whichever screen the address points to.
function render() {
  const app = document.getElementById("app");
  const match = location.hash.match(/^#book\/(.+)$/);

  if (match) {
    const book = books.find((b) => b.id === match[1]);
    app.innerHTML = book ? bookScreen(book) : '<p class="empty">Book not found. <a href="#">Back</a></p>';
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
}

// ---------- Home screen ----------

function homeScreen() {
  const shown = books.filter((b) => filter === "all" || b.type === filter);
  const years = [...new Set(shown.map((b) => b.year))].sort((a, b) => b - a); // newest year first

  const sections = years.map((year) => {
    const yearBooks = shown
      .filter((b) => b.year === year)
      .sort((a, b) => a.position - b.position); // reading order within the year
    return `
      <section>
        <h2 class="year">${year} <span class="count">${yearBooks.length}</span></h2>
        <ol class="book-list">${yearBooks.map(bookRow).join("")}</ol>
      </section>`;
  });

  return `
    <header class="top">
      <h1>Bookshelf</h1>
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
    <a class="back" href="#">‹ Back</a>
    <article class="book">
      ${cover(book, "large")}
      <h1>${esc(book.title)}</h1>
      <p class="author">${esc(book.author)}</p>
      <p class="meta">${book.type === "fiction" ? "Fiction" : "Non-fiction"} · ${book.year}</p>
      <div class="ratings">${rows.join("")}</div>
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

// ---------- Small pieces used by both screens ----------

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

// Makes text safe to put inside HTML, so a title like "<b>" shows as text instead of becoming code.
function esc(text) {
  const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(text).replace(/[&<>"']/g, (c) => replacements[c]);
}

start();
