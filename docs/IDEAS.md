# Ideas for later

Thinking-through notes for bigger ideas. Nothing here is built yet. Each idea lists the options, what they'd take, and a recommendation.

---

## 1. A "Suggest something to read" button

A button at the very bottom of the home screen that suggests books based on what you've logged and reviewed.

There are three ways to do it, from simplest to most impressive.

### Option A: "Copy my reading for Claude" (simplest)

The button copies a ready-made message to your clipboard: your books, ratings and reviews, plus "Based on this, suggest 5 books I'd love, and why." You paste it into Claude (or any AI chat) and get suggestions there.

- **Effort:** small, about an afternoon. It's mostly formatting text.
- **Cost:** free.
- **Upside:** it uses your **reviews**, which say far more about your taste than ratings do. Your notes on Garner, Szalay and Flanagan are exactly what makes good suggestions possible.
- **Downside:** it's two steps (copy, then paste), and the suggestions live in the chat, not the app.

### Option B: suggestions from Open Library (free, inside the app)

Take your highest-rated books, look up their authors and subjects on Open Library (e.g. "Tasmania", "mountaineering", "family drama"), and show other books with the same subjects that you haven't logged. Each would have a "+ Want to read" button.

- **Effort:** medium.
- **Cost:** free, with no account needed.
- **Downside:** it matches on labels, not taste, and it can't read your reviews. Expect some odd picks (subject tags on Open Library are patchy, like its years).

### Option C: AI suggestions inside the app

The app sends your books and reviews to an AI (like Claude) and shows suggestions with reasons, plus a "+ Want to read" button on each.

- **Effort:** medium to large. Using an AI from code needs a secret **API key**. A key must never sit in the app's files, because anyone viewing the page could copy it and spend your money. So it needs a tiny server to keep the key hidden. That fits naturally once the app is online (Phase 4), since hosting services like Netlify and Cloudflare offer small "functions" for exactly this.
- **Cost:** pay-as-you-go, typically a few cents or less per set of suggestions.
- **Privacy:** your reviews get sent to the AI company to generate suggestions.

### Recommendation

**Start with A.** It's quick, free, and gives the best suggestions right away, because it uses your reviews. Move to **C** after going online, if you find yourself using it a lot. B is the least useful of the three.

---

## 2. Seeing your partner's bookshelf (like Letterboxd friends)

This means two people, each with their own shelf, able to see each other's books and ratings.

### Where things stand (November 2026)

- ✅ **Online:** the app is at https://mohnblumen.github.io/bookshelf/
- ✅ **Cloud database:** your books are in Supabase, shared by all your devices.
- ✅ **View-only sharing already works:** send your partner the link, and they can browse your shelf but can't change it.

### What a second shelf would need

Right now the database holds **one** shelf, unlocked with **one** passphrase. For your partner to have their own:

1. **An owner on every book:** a column saying whose shelf each book belongs to.
2. **A passphrase per person** (or proper sign-in), so each of you can only edit your own shelf.
3. **A way to pick a shelf**, e.g. `…/bookshelf/#shelf/partner`, so a link can point to either one.

The privacy rules already work this way ("anyone can read, only the passphrase can change"); they'd just need to know *whose* passphrase goes with *which* books.

### What it would look like

- Your own shelf works exactly as now.
- A small switch or menu: **"Mine · [partner's]"** to flip between shelves. Theirs is read-only.
- Maybe later: "You both read *Stoner*", showing both sets of ratings side by side.

### Recommendation

This is the natural next step of Phase 5, and a medium-sized one: adding an owner to each book, a passphrase per person, and a shelf picker. One small thing too: "Mohnblume's Bookshelf" would become a name each person sets.

---

## 3. Suggested future features

Effort: **S** = an hour or two · **M** = a session or two · **L** = bigger, usually needs being online first.

### Already done

Backup (export/import) · real covers and the photo option · online with GitHub Pages · iPhone home-screen icon · cloud storage in Supabase with passphrase editing · List and Mosaic layouts.

### New ideas

| Feature | Effort | Notes |
|---|---|---|
| **Year in review** | M | Books per year, fiction vs non-fiction, average for each category, most-read authors (J.K. Rowling 7, Helen Garner 5 so far). A Letterboxd-style summary card. |
| **Shelf view** | S–M | The spine shelf from the design options as its own screen. Tap a spine to open the book. |
| **Author pages** | S | Tap an author to see every book of theirs you've read, with your ratings side by side. |
| **Search** | S | A search box for title or author. Worth it as the list grows (you're at 65 already). |
| **Reading goal** | S | "52 books in 2026", with a small progress bar on the year heading. |
| **Favourites** | S | A small heart on a book, and "Top books of the year". |
| **Currently reading** | S | A third state, alongside read and want to read. It would sit at the top of the home screen. |
| **Saved quotes** | S | A few lines from the book on its page. |
| **Re-reads** | S | Log the same book again in a later year, marked "re-read", without duplicating it. |
| **Sort and filter** | S | By rating, author or category score ("best prose of 2025"). |
| **Drag to reorder** | M | Fix the order if you log a book late. |
| **Share a book card** | M | Turn a book page into an image for Instagram stories or messages. |
| **Scan a barcode to add** | M–L | Point the camera at the ISBN barcode, and the title, author and cover fill in. iPhone Safari doesn't have built-in barcode reading, so it needs a small library. |
| **Import from Goodreads** | S–M | If you have Goodreads history, it can be exported as a CSV file and read in. |
| **Recommendations** | S → L | See idea 1 above. |
| **Partner's shelf** | M | See idea 2 above. The cloud database is already in place. |

### Where I'd start

Backup and covers are done. Next: **year in review** (the most fun), **search** (handy as the shelf grows), then **your partner's shelf**.
