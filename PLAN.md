# Mohnblume's Bookshelf — Plan

A simple, good-looking reading log. Like logging a film on Letterboxd: add a book when you finish it, rate it, and see each year's books in the order you read them.

Related docs: `docs/OPEN_LIBRARY.md` (how book details are looked up) · `docs/IDEAS.md` (recommendations, partner sharing, future features) · `design-options.html` (five visual directions + spine shelf).

## What the app does

**Home screen**
- The title "Mohnblume's Bookshelf" and a round **+** button to log a book.
- A switch: **All · Fiction · Non-fiction**.
- Books grouped by year, most recently read at the top.
- Each book shows its cover, title, author and an overall score as five dots (rounded to the nearest half, e.g. ●●●◐○). Unrated books show no dots.
- At the very bottom: a small **Want to read** list. Type "Title by Author" to add, tap **Read** to log one (the form opens filled in), and × to remove.

**Book screen** (tap a book)
- Large cover, title, author, fiction or non-fiction.
- **Published** (looked up from Open Library) and **Read** (the year you read it), side by side.
- A rating for each category, shown as five single-colour line icons.
- The review.
- **Edit** at the top right, with **Delete** at the bottom of the edit form (it asks first).

**Logging or editing a book**
- Title, author, fiction or non-fiction, year read, and published (leave it blank and it's looked up automatically).
- Category ratings: optional; tap an icon again to clear it.
- Review: optional.

## Rating categories

Each category is scored out of 5. The overall score is **calculated** from whichever categories were scored, and is never stored.

| Fiction | Icon | Non-fiction | Icon |
|---|---|---|---|
| Characters | person | Prose | pen nib |
| Plot | winding path | Insight | lightbulb |
| Style | feather pen | Storytelling | open book |

## Data

Saved in the browser's IndexedDB (database version 2), which has three stores:

- `books`: logged books.
- `wantToRead`: `{ id, title, author, added }`.
- `meta`: the app's own notes, e.g. which starter books have already been copied in.

`books.json` is the starter list: 2026 (12 books) and 2025 (52 books). Any starter book a browser hasn't seen is copied in once. Deleted books stay deleted.

```json
{
  "id": "b2026-01",
  "title": "Monkey Grip",
  "author": "Helen Garner",
  "type": "fiction",
  "year": 2026,
  "position": 1,
  "published": 1977,
  "ratings": { "characters": 4, "plot": 3 },
  "review": "…",
  "coverUrl": null,
  "coverPhoto": null
}
```

- `published`: a number = known; `null` = Open Library doesn't know it; missing = not looked up yet.
- `ratings`: only the categories actually scored. `{}` = unrated.

## Tech choices

- Plain **HTML, CSS and JavaScript**: no framework, no build tools.
- **Git** for snapshots (local; GitHub later).
- **Python's built-in server** for `localhost`.
- **Open Library** for publication years, and covers later (free, no account).

## Roadmap

- [x] **Phase 0, setup:** Command Line Tools, Git.
- [ ] **Phase 1, the core**
  - [x] Home list, filter, book screen
  - [x] Log, edit and delete; category ratings
  - [x] Publication year from Open Library
  - [x] Want to read list
  - [x] 2025 list imported
  - [ ] Backup: export/import a file
- [x] **Phase 2, design:** chose **Paper** from `design-options.html` (warm off-white, Iowan Old Style + system sans; nothing extra to load). It's already applied.
- [ ] **Phase 3, covers:** Open Library search showing a few editions to pick from, plus taking a photo.
- [ ] **Phase 4, iPhone:** first over home Wi-Fi, then online (needs a GitHub account) and added to the home screen.
- [ ] **Phase 5, sync and sharing:** a cloud database (Supabase), so phone and laptop share one list and your partner can see your shelf. See `docs/IDEAS.md`.

**Later:** recommendations, year in review, shelf view, search and more. See `docs/IDEAS.md`.

## Open questions

- Is the spine shelf a background, its own screen, or just for fun?
