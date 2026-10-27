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
- Below that: a quiet **Backup** link showing when you last exported.

**Book screen** (tap a book)
- Large cover with a **Change cover** link, then title, author, fiction or non-fiction.
- **Published** (looked up from Open Library) and **Read** (the year you read it), side by side.
- A rating for each category, shown as five single-colour line icons.
- The review.
- **Edit** at the top right, with **Delete** at the bottom of the edit form (it asks first).

**Logging or editing a book**
- Title, author, fiction or non-fiction, year read, and published (leave it blank and it's looked up automatically).
- Category ratings: optional; tap an icon again to clear it.
- Review: optional.

**Covers**
- Looked up automatically from Open Library in the background.
- **Change cover** opens a picker with covers from the book's editions (English first). You can also take or choose a photo (shrunk to at most 600px tall), or remove the cover.

**Backup** (`#backup`)
- **Export** downloads everything as `mohnblumes-bookshelf-YYYY-MM-DD.json`.
- **Import** checks the file is really a backup, asks to confirm, then replaces everything.

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
  "olKey": "/works/OL2431270W",
  "ratings": { "characters": 4, "plot": 3 },
  "review": "…",
  "coverUrl": "https://covers.openlibrary.org/b/id/8523846-M.jpg",
  "coverPhoto": null
}
```

- `published`: a number = known; `null` = Open Library doesn't know it; missing = not looked up yet.
- `olKey`: the book's Open Library record. Missing = not looked up yet (the app looks it up in the background); `null` = not found.
- `coverPhoto`: your own photo as a data URL (the image written out as text). It wins over `coverUrl`.
- `ratings`: only the categories actually scored. `{}` = unrated.

## Tech choices

- Plain **HTML, CSS and JavaScript**: no framework, no build tools.
- **Git** for snapshots (local; GitHub later).
- **Python's built-in server** for `localhost`.
- **Open Library** for publication years, and covers later (free, no account).

## Roadmap

- [x] **Phase 0, setup:** Command Line Tools, Git.
- [x] **Phase 1, the core:** home list, filter, book screen; log, edit, delete; ratings; publication years; Want to read; 2025 list; backup.
- [x] **Phase 2, design:** chose **Paper** from `design-options.html` (warm off-white, Iowan Old Style + system sans; nothing extra to load). It's already applied.
- [x] **Phase 3, covers:** automatic covers from Open Library, an editions picker, and your own photo.
- [ ] **Phase 4, iPhone:** first over home Wi-Fi, then online (needs a GitHub account) and added to the home screen.
- [ ] **Phase 5, sync and sharing:** a cloud database (Supabase), so phone and laptop share one list and your partner can see your shelf. See `docs/IDEAS.md`.

**Later:** recommendations, year in review, shelf view, search and more. See `docs/IDEAS.md`.

