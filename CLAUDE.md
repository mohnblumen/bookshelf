# Bookshelf — notes for Claude

The full spec and roadmap are in `PLAN.md`. This file covers how to work on the project and why decisions were made.

## Privacy rule (permanent)

**Never put the owner's real name or personal email anywhere in this project.** That covers code, docs, file names, commit authors and messages, tags, pull requests and GitHub. The project is public.

- The app is called **Mohnblume's Bookshelf**. Use the handle **mohnblumen** wherever a name is needed.
- Git author: `mohnblumen <349276585+mohnblumen@users.noreply.github.com>` (set globally).
- Refer to the owner as "the owner" or "you" in docs.
- **Never merge pull requests on GitHub** (the web button or `gh pr merge`). GitHub creates that merge commit with the account's primary email, which leaked it once. Instead, merge locally with `git merge --ff-only <branch>` on `main`, then push `main`. GitHub marks the PR as merged by itself.
- Before every push, check: `git grep -i -E "<first name>|<surname>|gmail"` and the commit authors. The real name and email aren't written here on purpose; the owner's home folder path contains the name, so never paste local paths into committed files.

## Who this is for and how to work

- The owner is learning to code. This is their first project, so **teaching matters as much as the app**.
- Explain every decision and trade-off in plain language, and explain each command before it's run.
- **Don't build anything without a specific instruction.** Plan first, then build when asked.
- Prefer the simplest thing that works. Avoid frameworks, build tools and new installs unless there's a clear reason, and explain the reason.
- **On GitHub:** repo `mohnblumen/bookshelf` (public), live at https://mohnblumen.github.io/bookshelf/ through GitHub Pages, which serves `main` from the root. A push to `main` updates the live site in about a minute.
- **Claude manages Git:** commit tested chunks of work without asking, and say briefly what was committed. **Work on a branch and open a pull request**; never push straight to `main`, because `main` is the live site.
- Commits use the handle and private noreply email above. The history was rewritten to remove the owner's real name and email, and the GitHub repo was recreated, so nothing older survives online.
- The GitHub CLI `gh` is installed at `~/.local/bin/gh` (the official zip, checksum-verified; there's no Homebrew), and `~/.zshrc` adds that folder to PATH. In non-interactive shells, prefix commands with `PATH="$HOME/.local/bin:$PATH"`.
- Main device: **iPhone**. Development happens on a Mac.

## Decisions so far (and why)

- **Web app, not native iOS.** One codebase for laptop and phone. Free, no Apple developer account, and it teaches web fundamentals. Native Swift would mean installing Xcode, and the app would expire on the phone every 7 days without a $99/year account.
- **Plain HTML/CSS/JS.** Every line is readable, with no hidden machinery.
- **Storage: Supabase** (project `yooxqwqqfvyvcaqwsmpb`, Sydney). The site stays on GitHub Pages; the app talks to Supabase with plain `fetch` (no library). **Anyone can view; only a device that knows the passphrase can change things.** There's no sign-in, at the owner's request. Writes go only through passphrase-checked database functions (`supabase/setup.sql`), and the passphrase is stored only as a bcrypt hash in `private.settings`. Want to read is private (passphrase needed to read it). The publishable key in `app.js` is public by design. Never put the secret key or the database password in the code. (Earlier versions used the browser's IndexedDB; that was replaced because each device kept its own copy.)
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
- Phases 1–3 are complete. To run it locally: `python3 -m http.server 8000`. It reads and writes the real Supabase data.
  - Done: the home list (newest first), the fiction/non-fiction switch, the book screen, the log form (round + button) with tappable rating icons, and edit/delete. The same form is used for adding and editing; delete asks to confirm first.
  - Done: renamed to "Mohnblume's Bookshelf"; Published (Open Library) vs Read years; Want to read list at the bottom; 2025 list (52 books) added to `books.json`.
  - The app no longer reads `books.json`; the books live in Supabase. The file stays for `design-options.html` and as a record of the starting lists.
  - Open Library years are often wrong for classics and translations. Known corrections are in `books.json`; a year the owner types is never overwritten.
  - Done: backup (export/import, replace with confirmation) and covers (automatic lookup, an editions picker, own photo).
  - Phase 4 is done apart from the owner's own step: the app has an icon and manifest (`icons/`, `manifest.json`) and is online. The owner adds it to their iPhone home screen and unlocks it there.
  - On iPhone, a home-screen app has storage separate from Safari's, so it needs unlocking separately (the passphrase is remembered per device, in localStorage).
  - Book lookups key off `olKey`: `undefined` means look it up in the background. The automatic lookup uses a precise title+author search. Picking "most editions" was tested and was worse (it chose study guides and the wrong Harry Potter).
  - The cover picker also pulls editions from the top 3 general-search matches, because the precise match is sometimes an empty duplicate record (Lord of the Rings, The Sailor…).
- **Two home layouts, switched with tabs on the page:** List and Mosaic (tile size follows the rating; see `tileSize()`). Keep both working; the owner wants to switch in the app, not in Git.
  - A "Cards" layout (big covers, 2 across) was tried and removed at the owner's request. Git tags: `v1` = before the experiments; `v2-cards` = the last snapshot with Cards.
- **Design: Paper was chosen**, and it's what `style.css` already uses. Keep new screens in this style. The other options remain in `design-options.html` for reference. The spine shelf was set aside for now (the owner's call); it's still in `design-options.html` if wanted later.
- Ideas (recommendations, partner sharing, feature list) are in `docs/IDEAS.md`. The Open Library guide is in `docs/OPEN_LIBRARY.md`.
- Python's server lets browsers cache old files. After code changes, hard-refresh (Cmd+Shift+R).
- **Testing touches the real Supabase database** (there's no separate test copy). Test with clearly-named test books, delete them afterwards, and never wipe or replace everything without the owner's go-ahead. Never ask for the passphrase or use it; the temporary test passphrase from setup was replaced by the owner's own.

## Where we left off (1 Nov 2026)

- **Live:** https://mohnblumen.github.io/bookshelf/ (GitHub Pages from `main`). There are 65 books in Supabase, 6 of them rated. The owner has set their own passphrase.
- **The owner's next step:** add the app to the iPhone home screen and unlock it there and on the laptop.
- **Ideas for next sessions** (see `docs/IDEAS.md`): year in review, search, a "Share backup" button using the iPhone share sheet, the partner's own shelf (needs an owner per book and a passphrase per person), and whether to remove the reviews from the public `books.json` now that the app doesn't read it.
- **Unresolved from earlier:** the Open Library cover is missing for the three Lord of the Rings books and The Sailor Who Fell from Grace with the Sea. The owner can fix these with Change cover.
