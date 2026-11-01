-- Mohnblume's Bookshelf: database setup for Supabase.
-- Paste this whole file into Supabase → SQL Editor → New query, then press Run. Run it once, on a new project.
--
-- How it works:
--   • Anyone can READ the books (so the shelf can be shared, view-only).
--   • Nobody can change anything directly. All changes go through the functions below,
--     and each one first checks the passphrase. The Want to read list is only readable with it too.
--   • The passphrase itself is never stored, only a bcrypt "hash" of it (a scrambled fingerprint
--     that can check a guess but can't be turned back into the passphrase).

-- ---------- The tables ----------

-- Books you've read: one row per book, matching books.json.
create table public.books (
  id          text    primary key,
  title       text    not null,
  author      text    not null,
  type        text    not null check (type in ('fiction', 'nonfiction')),
  year        integer not null,
  position    integer not null,
  published   integer,                              -- year first published, if known
  ol_key      text,                                 -- Open Library record, e.g. /works/OL2431270W
  looked_up   boolean not null default false,       -- has the app asked Open Library yet?
  ratings     jsonb   not null default '{}'::jsonb, -- e.g. {"characters": 4, "plot": 3}
  review      text    not null default '',
  cover_url   text,                                 -- an Open Library cover
  cover_photo text,                                 -- your own photo, as a data URL
  updated_at  timestamptz not null default now()
);

-- Want to read (private).
create table public.want_to_read (
  id     text   primary key,
  title  text   not null,
  author text   not null default '',
  added  bigint not null                            -- when it was added (milliseconds), for ordering
);

-- The passphrase hash lives in a "private" schema, which Supabase never exposes to the internet.
create schema if not exists private;
create table private.settings (
  id              integer primary key default 1 check (id = 1),   -- only ever one row
  passphrase_hash text not null
);

-- ---------- Privacy rules (row-level security) ----------
-- With RLS on, nobody can read or change a row unless a rule allows it.
-- The only rule: anyone may read books. There are no rules for changing anything,
-- and none at all for want_to_read, so those only happen through the functions below.
alter table public.books        enable row level security;
alter table public.want_to_read enable row level security;
create policy "Anyone can read books" on public.books for select to anon, authenticated using (true);

-- ---------- Checking the passphrase ----------

create function private.passphrase_ok(passphrase text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.settings s
    where s.passphrase_hash = extensions.crypt(passphrase, s.passphrase_hash)
  );
$$;

create function private.require_passphrase(passphrase text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if passphrase is null or not private.passphrase_ok(passphrase) then
    raise exception 'Wrong passphrase' using errcode = '28000';
  end if;
end;
$$;

-- Adds a book, or replaces the saved version of a book with the same id.
create function private.upsert_book(book jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.books (id, title, author, type, year, position, published, ol_key, looked_up, ratings, review, cover_url, cover_photo)
  values (
    book->>'id', book->>'title', book->>'author', book->>'type',
    (book->>'year')::integer, (book->>'position')::integer, (book->>'published')::integer,
    book->>'ol_key', coalesce((book->>'looked_up')::boolean, false),
    coalesce(book->'ratings', '{}'::jsonb), coalesce(book->>'review', ''),
    book->>'cover_url', book->>'cover_photo'
  )
  on conflict (id) do update set
    title = excluded.title, author = excluded.author, type = excluded.type,
    year = excluded.year, position = excluded.position, published = excluded.published,
    ol_key = excluded.ol_key, looked_up = excluded.looked_up, ratings = excluded.ratings,
    review = excluded.review, cover_url = excluded.cover_url, cover_photo = excluded.cover_photo,
    updated_at = now();
$$;

-- ---------- What the app can call ----------
-- These are the only ways to change anything. Each checks the passphrase first.

-- Is this the right passphrase? (Used by the app's Unlock screen.)
create function public.check_passphrase(passphrase text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.passphrase_ok(passphrase);
$$;

create function public.save_book(passphrase text, book jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_passphrase(passphrase);
  perform private.upsert_book(book);
end;
$$;

create function public.delete_book(passphrase text, book_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_passphrase(passphrase);
  delete from public.books where id = book_id;
end;
$$;

create function public.list_want_to_read(passphrase text) returns setof public.want_to_read
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_passphrase(passphrase);
  return query select * from public.want_to_read order by added;
end;
$$;

create function public.save_want_to_read(passphrase text, item jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_passphrase(passphrase);
  insert into public.want_to_read (id, title, author, added)
  values (item->>'id', item->>'title', coalesce(item->>'author', ''), (item->>'added')::bigint)
  on conflict (id) do update set title = excluded.title, author = excluded.author, added = excluded.added;
end;
$$;

create function public.delete_want_to_read(passphrase text, item_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_passphrase(passphrase);
  delete from public.want_to_read where id = item_id;
end;
$$;

-- Restoring a backup: replaces everything in one go. If anything fails, nothing changes.
create function public.replace_everything(passphrase text, books jsonb, want_to_read jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  item jsonb;
begin
  perform private.require_passphrase(passphrase);
  delete from public.books where true;
  delete from public.want_to_read where true;
  for item in select * from jsonb_array_elements(books) loop
    perform private.upsert_book(item);
  end loop;
  for item in select * from jsonb_array_elements(want_to_read) loop
    insert into public.want_to_read (id, title, author, added)
    values (item->>'id', item->>'title', coalesce(item->>'author', ''), (item->>'added')::bigint);
  end loop;
end;
$$;

-- ---------- Exactly what the app is allowed to do ----------
-- Spelled out, so it works whatever "expose new tables" setting the project was created with.
-- Visitors ("anon"): read books, and call the functions above. Nothing else.
revoke all on public.books, public.want_to_read from anon, authenticated;
grant select on public.books to anon, authenticated;

revoke all on all functions in schema public  from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function
  public.check_passphrase(text),
  public.save_book(text, jsonb),
  public.delete_book(text, text),
  public.list_want_to_read(text),
  public.save_want_to_read(text, jsonb),
  public.delete_want_to_read(text, text),
  public.replace_everything(text, jsonb, jsonb)
to anon, authenticated;

-- ---------- Setting (or changing) the passphrase ----------
-- Run this on its own in the SQL Editor, with your own passphrase between the quotes.
-- It replaces any previous passphrase; devices using the old one get locked.
-- (Don't save it as a snippet, and don't put your real passphrase in this file.)
--
--   insert into private.settings (id, passphrase_hash)
--   values (1, extensions.crypt('YOUR PASSPHRASE HERE', extensions.gen_salt('bf')))
--   on conflict (id) do update set passphrase_hash = excluded.passphrase_hash;
