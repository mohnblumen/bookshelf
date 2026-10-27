# Open Library: a guide

Open Library is where Mohnblume's Bookshelf gets publication years, and later book covers. This guide covers what it is, how to use it yourself, and how the app talks to it.

## The short version

- **You don't need an account, password or key** to *read* from Open Library. The app is already using it.
- An account (free) is only needed if you want to **fix mistakes** in its records, for yourself and everyone else.

## What it is

[Open Library](https://openlibrary.org) is a free online catalogue of books run by the Internet Archive, a non-profit. Its goal is "one web page for every book ever published". Like Wikipedia, volunteers can edit it, which is why some records have mistakes (more on that below).

It has a public **API**, short for *Application Programming Interface*. It's a set of web addresses that send back data for programs to read, instead of web pages for people. The app asks a question by visiting an address, and Open Library answers in **JSON**, the same format as `books.json`.

Two words you'll see a lot:

- **Work:** the book itself, e.g. *Monkey Grip*.
- **Edition:** one particular printing of a work: a paperback, a translation, a 2017 reissue. One work can have hundreds of editions, each with its own cover. That's how the app will offer "the cover you actually read" in Phase 3.

## Try it yourself (no setup needed)

Paste these into Safari or Chrome. You'll see raw JSON. Firefox and Chrome show it neatly; Safari shows it as plain text, which is fine.

**1. Search for a book**

```
https://openlibrary.org/search.json?title=monkey+grip&author=helen+garner
```

You'll get a big block of text. Look for `"first_publish_year": 1977` and `"cover_i": 8523846`. The `+` signs stand in for spaces, because web addresses can't contain spaces.

**2. Ask for only what you need**

The full answer is long. Adding `fields=` trims it down, and `limit=1` returns just the top result:

```
https://openlibrary.org/search.json?title=monkey+grip&author=helen+garner&limit=1&fields=title,first_publish_year,cover_i,key
```

**3. See a cover**

Take the `cover_i` number from above and put it in this address. Change `-M` to `-S` (small) or `-L` (large):

```
https://covers.openlibrary.org/b/id/8523846-M.jpg
```

**4. Look at the work's own record**

The `key` from the search (e.g. `/works/OL2431270W`) leads to the full record:

```
https://openlibrary.org/works/OL2431270W.json
```

…and to all of its editions:

```
https://openlibrary.org/works/OL2431270W/editions.json
```

**5. Search the way the app's fallback does**

`q=` searches everything at once. It's looser, but it finds books listed under another title:

```
https://openlibrary.org/search.json?q=the+dinner+herman+koch&limit=3&fields=title,author_name,first_publish_year
```

This finds *Het Diner*, the Dutch original of *The Dinner*.

## How the app uses it

It's in `app.js`, in the section headed **Open Library**.

**Automatic lookup** (`searchOpenLibrary()` and `fillInDetails()`)

1. Any book that hasn't been looked up yet (it has no `olKey`) gets searched by title and author.
2. If that finds nothing, the app tries the looser `q=` search.
3. It saves three things:
   - `key` → `olKey`: the book's Open Library record.
   - `first_publish_year` → `published`, unless you've typed one.
   - `cover_i` → `coverUrl`, unless you've already got a cover or photo.

The search can give three kinds of answer:

| Answer | Meaning | What the book page shows |
|---|---|---|
| a match | found it | the year and cover |
| `null` | looked, but Open Library doesn't know this book | — and a coloured placeholder |
| `undefined` | couldn't ask (no internet?) | … (it tries again next time the app opens) |

**The cover picker** (`findEditionCovers()`)

"Change cover" lists covers from every edition of the book, English editions first. Open Library sometimes has duplicate, nearly empty records for the same book. So the picker also pulls editions from the top three matches of a general search. That's how *The Fellowship of the Ring* goes from no covers to more than 70. It asks for all of these at once (`Promise.allSettled`), so it takes about a second.

This runs in the background, so the app never waits for it. Your browser is allowed to ask Open Library directly because Open Library says "any website may ask me". That permission is called **CORS**, and some APIs don't give it.

## When it gets things wrong

Open Library's data is crowd-sourced, so some years are off. Checking your 64 books turned up these, and I've corrected them in `books.json`:

| Book | Open Library said | Actually |
|---|---|---|
| Americanah | 1969 | 2013 |
| The Fellowship of the Ring | 1905 | 1954 |
| The Two Towers | 2024 | 1954 |
| The Return of the King | 2024 | 1955 |
| Death of a Salesman | 1940 | 1949 |
| The Narrow Road to the Deep North | 2000 | 2013 |
| The Sailor Who Fell from Grace with the Sea | 1990 | 1963 |
| The Season (Garner) | 2025 | 2024 |
| Child's Play (Malouf) | 1993 | 1982 |
| Wuthering Heights | 1846 | 1847 |

**Two of these, *Child's Play* and *Wuthering Heights*, are already saved in your laptop's browser,** so the corrections in `books.json` won't reach them. Fix them in the app: open the book, tap **Edit**, type the year into **Published**, and save.

For any book: if the year looks wrong, type the right one into **Published**. A year you type is never overwritten. Clearing the box makes the app look it up again.

## Optional: an account, to fix records for everyone

1. Go to [openlibrary.org](https://openlibrary.org) and choose **Sign Up**. You'll need an email address and a password, and you set these up yourself.
2. Find the book, open its page, and use the **Edit** button to correct details or add a cover.
3. Your fix then reaches every app that uses Open Library, including this one, the next time it looks a book up.

The account is for you as a person. The app doesn't need it and never logs in.

## Good manners and limits

Open Library is free and run by a non-profit, so it asks programs to be considerate:

- **Small, occasional requests are fine.** This app makes one or two per book, and only for books without a year.
- **Don't hammer it.** The app looks books up one at a time, never all at once.
- **Cover images by ISBN or edition ID are rate-limited** (roughly 100 per 5 minutes per device, at the time of writing). Covers by cover ID (`/b/id/…`), which the app will use, aren't limited the same way.
- For big jobs, such as millions of books, they provide downloadable data dumps instead of the API.

## Official docs

- Overview: https://openlibrary.org/developers/api
- Search: https://openlibrary.org/dev/docs/api/search
- Covers: https://openlibrary.org/dev/docs/api/covers
