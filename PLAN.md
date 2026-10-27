# Bookshelf — Plan

A simple, good-looking reading log. Like logging a film on Letterboxd: add a book when you finish it, rate it, and see the year's books in the order you read them.

## What the app does

**Home screen**
- Books grouped by year, in reading order.
- Each book shows its cover, title, author and an overall score as five dots (rounded to the nearest half dot, e.g. ●●●◐○). Unrated books show no dots.
- A switch at the top: **All · Fiction · Non-fiction**.
- A "＋ Log a book" button.

**Book screen** (tap a book to open it)
- Large cover, title and author.
- A rating for each category, shown as five single-colour line icons (filled = score).
- The review/note.
- Edit, delete or change the cover.
- The web address changes (e.g. `#book/3`) so the iPhone back gesture works.

**Logging a book**
- Title, author, fiction or non-fiction. The year and reading position are filled in automatically.
- Category ratings: optional, any of them can be skipped.
- Review: optional, with room for a full paragraph.
- Cover: search Open Library and pick one of a few results, or take a photo. A photo always wins.

## Rating categories

Each category is scored out of 5. The overall score is **calculated** from whichever categories were scored, and is never stored.

| Fiction | Icon idea | Non-fiction | Icon idea |
|---|---|---|---|
| Characters | person | Prose | pen nib |
| Plot | winding path | Insight | lightbulb |
| Style | feather pen | Storytelling | open book |

Icons: the [Lucide](https://lucide.dev) open-source set, copied into the project, in one colour to match the design.

## Data shape

Stored in the browser (IndexedDB) on the device. `books.json` holds the 12 books imported from the 2026 notes list.

```json
{
  "id": "b2026-01",
  "title": "Monkey Grip",
  "author": "Helen Garner",
  "type": "fiction",
  "year": 2026,
  "position": 1,
  "ratings": { "characters": 4, "plot": 3 },
  "review": "…",
  "coverUrl": null,
  "coverPhoto": null
}
```

- `type`: `"fiction"` or `"nonfiction"`.
- `position`: hidden reading order within the year. No dates are stored.
- `ratings`: only the categories actually scored. `{}` = unrated.
- `coverPhoto` is used instead of `coverUrl` when it's set.

## Tech choices

- Plain **HTML, CSS and JavaScript**: no framework and no build tools.
- **Git** for snapshots (on the laptop; GitHub not needed yet).
- **Python's built-in server** to run it on `localhost`.
- **Open Library** for cover lookup (free, no account needed).
- Photos are shrunk before saving so storage doesn't fill up.

## Roadmap

- [x] **Phase 0, setup:** Command Line Tools, Terminal basics, Git and the first snapshot.
- [ ] **Phase 1, the core:** home and book screens; add, edit and delete; the fiction/non-fiction switch; import `books.json`; export/import a backup.
- [ ] **Phase 2, design session:** compare a few visual directions (simple and clear), pick fonts, colours and icons.
- [ ] **Phase 3, covers:** Open Library search with a choice of results, plus taking a photo.
- [ ] **Phase 4, iPhone:** first over home Wi-Fi, then online (Netlify/Cloudflare Pages; needs a GitHub account) and added to the home screen.

**Later ideas:** sync between phone and laptop (e.g. Supabase), drag to reorder, genre tags.

## Open questions

- Newest or oldest first within a year? (The notes list is oldest first.)
- Are the category names final? They're easy to change in one place.
