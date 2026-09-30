-- Second Serving: production database schema (Supabase / Postgres)
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

create extension if not exists pgcrypto;

-- Leftover food posted by event organizers
create table if not exists food_posts (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  organizer_id   text not null,
  organizer_name text not null,
  title          text not null check (char_length(title) between 2 and 80),
  location       text not null check (char_length(location) between 2 and 80),
  notes          text check (char_length(notes) <= 280),
  dietary        text not null default '',          -- comma-separated: vegetarian,vegan,halal,gluten-free
  portions       int  not null check (portions between 1 and 500),
  expires_at     timestamptz not null
);

-- One row each time a student claims a portion
create table if not exists claims (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id    uuid not null references food_posts(id) on delete cascade,
  user_id    text not null,
  user_name  text not null,
  portions   int  not null default 1 check (portions = 1)
);

-- Product telemetry: every meaningful user action
create table if not exists events (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  user_id     text not null,
  session_id  text not null,
  event_name  text not null,
  post_id     uuid,
  variant     text,                                  -- A/B test arm for the claim button
  page        text,
  properties  jsonb not null default '{}'::jsonb
);

create index if not exists events_occurred_at_idx on events (occurred_at);
create index if not exists claims_post_id_idx on claims (post_id);

-- Public claim counts, so the site can show "portions left" without exposing who claimed
create or replace view post_claim_counts as
  select post_id, count(*)::int as claimed from claims group by post_id;

-- Row-level security: the public (anon) key can read posts and write new rows,
-- but can never read other people's claims or events, or edit/delete anything.
alter table food_posts enable row level security;
alter table claims     enable row level security;
alter table events     enable row level security;

drop policy if exists "anyone can read posts"   on food_posts;
drop policy if exists "anyone can create posts" on food_posts;
drop policy if exists "anyone can claim"        on claims;
drop policy if exists "anyone can log events"   on events;

create policy "anyone can read posts"   on food_posts for select to anon using (true);
create policy "anyone can create posts" on food_posts for insert to anon with check (true);
create policy "anyone can claim"        on claims     for insert to anon with check (true);
create policy "anyone can log events"   on events     for insert to anon with check (true);

grant select on post_claim_counts to anon;
