# Bookshelf — notes for Claude

The full spec and roadmap are in `PLAN.md`. This file covers how to work on the project and why decisions were made.

## Who this is for and how to work

- The owner is learning to code. This is their first project, so **teaching matters as much as the app**.
- Explain every decision and trade-off in plain language, and explain each command before it's run.
- **Don't build anything without a specific instruction.** Plan first, then build when asked.
- Prefer the simplest thing that works. Avoid frameworks, build tools and new installs unless there's a clear reason, and explain the reason.
- There's no GitHub account yet. Git is local only.
- Main device: **iPhone**. Development happens on a Mac.

## Decisions so far (and why)

- **Web app, not native iOS.** One codebase for laptop and phone. Free, no Apple developer account, and it teaches web fundamentals. Native Swift would mean installing Xcode, and the app would expire on the phone every 7 days without a $99/year account.
- **Plain HTML/CSS/JS.** Every line is readable, with no hidden machinery.
- **Local browser storage (IndexedDB) first.** Photos are too big for localStorage (~5MB limit). Export/import is the backup until there's a cloud database.
- **No dates, just year + position.** Logging works like Letterboxd. Reading order matters, not the exact day.
- **Category ratings only, out of 5, all optional.** The overall score is calculated from the scored categories, never stored (single source of truth).
- **Different categories for fiction and non-fiction**, kept in one `CATEGORIES` setting in the code (configuration, not data).
  - Fiction: characters, plot, style.
  - Non-fiction: prose, insight, storytelling. "Gripping" was considered and rejected.
- **The old /10 scores were dropped** (option b). The 12 imported books start unrated, to be re-rated in categories. Category scores weren't guessed from the old scores.
- **The home screen stays minimal:** cover, title, author and overall dots (half-dot rounding). Category icons and the review appear only on the book screen.
- **Icons are single-colour line icons (Lucide), not emoji.** Apple emoji are always colourful, and the owner wants a simple, non-garish look.
- **Covers:** Open Library lookup showing a few editions to pick from, plus a photo option. The owner likes having the exact cover they read, so a photo overrides the lookup.
- **Fiction/non-fiction is one `type` field**, not free-form tags, to keep it simple and avoid typos.

## Data

- `books.json` holds the 2026 list converted from the owner's Notes app. The review text is word for word, apart from one apostrophe made consistent. The original RTF was moved to the Trash.
- Non-fiction books: *Into Thin Air* and *Joe Cinque's Consolation*. Everything else is fiction.

## Design direction

- Simple and clear. A design session in Phase 2 will compare a few options.
- Ratings show as dots/icons rather than numbers.

## Status

- Planning is complete.
- Phase 0 is done: Command Line Tools installed (Git 2.50, Python 3.9), repo created on branch `main`, first commit saved.
- Phase 1 has started. A read-only prototype (`index.html`, `app.js`, `style.css`) shows the home list, the fiction/non-fiction switch and the book screen, reading straight from `books.json`. Run it with `python3 -m http.server 8000`.
- Next in Phase 1: adding, editing and rating books, saving to IndexedDB, and export/import. Wait for the go-ahead before building.
