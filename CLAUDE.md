# Bookshelf — notes for Claude

The full spec and roadmap are in `PLAN.md`. This file covers how to work on the project and why decisions were made.

## Who this is for and how to work

- The owner is learning to code. This is their first project, so **teaching matters as much as the app**.
- Explain every decision and trade-off in plain language, and explain each command before it's run.
- **Don't build anything without a specific instruction.** Plan first, then build when asked.
- Prefer the simplest thing that works. Avoid frameworks, build tools and new installs unless there's a clear reason, and explain the reason.
- There's no GitHub account yet. Git is local only.
- **Claude manages Git:** commit tested chunks of work without asking, and say briefly what was committed. Commits go on `main` until GitHub exists. After that, use branches and PRs.
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
- Phase 1 is in progress. Run the app with `python3 -m http.server 8000`.
  - Done: the home list (newest first), the fiction/non-fiction switch, the book screen, the log form (round + button) with tappable rating icons, and edit/delete. The same form is used for adding and editing; delete asks to confirm first.
  - Done: renamed to "Mohnblume's Bookshelf"; Published (Open Library) vs Read years; Want to read list at the bottom; 2025 list (52 books) added to `books.json`.
  - IndexedDB v2 has three stores: `books`, `wantToRead` and `meta`. `meta.starterIds` records which `books.json` books have been copied in, so new starter books get added once and deleted ones stay deleted.
  - Open Library years are often wrong for classics and translations. Known corrections are in `books.json`; a year the owner types is never overwritten.
  - Done: backup (export/import, replace with confirmation) and covers (automatic lookup, an editions picker, own photo).
  - Phases 1–3 are complete. Next is Phase 4 (on the iPhone, then online). Wait for the go-ahead before building.
  - Book lookups key off `olKey`: `undefined` means look it up in the background. The automatic lookup uses a precise title+author search. Picking "most editions" was tested and was worse (it chose study guides and the wrong Harry Potter).
  - The cover picker also pulls editions from the top 3 general-search matches, because the precise match is sometimes an empty duplicate record (Lord of the Rings, The Sailor…).
  - The app handles being open in two tabs: an old tab closes its database and reloads when a newer version needs it.
- **Design: Paper was chosen**, and it's what `style.css` already uses. Keep new screens in this style. The other options remain in `design-options.html` for reference. The spine shelf was set aside for now (the owner's call); it's still in `design-options.html` if wanted later.
- Ideas (recommendations, partner sharing, feature list) are in `docs/IDEAS.md`. The Open Library guide is in `docs/OPEN_LIBRARY.md`.
- Python's server lets browsers cache old files. After code changes, hard-refresh (Cmd+Shift+R).
- When testing, use port 8001 so the test data stays apart from the owner's real data on 8000. Delete the test database afterwards.
