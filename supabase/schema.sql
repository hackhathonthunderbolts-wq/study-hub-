/* =========================================================================
   Study Hub — Supabase schema + Row Level Security
   Paste this whole file into  Supabase Dashboard → SQL Editor → Run.
   Safe to run twice (idempotent).
   ========================================================================= */

-- ---------- 1. TABLES ---------------------------------------------------

create table if not exists public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  first_name  text check (char_length(first_name) <= 60),
  email       text not null,
  language    text not null default 'english'
              check (language in ('english', 'hindi', 'both')),
  interests   text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- lets the API answer "You're already subscribed" with a duplicate-key error
create unique index if not exists subscribers_email_unique
  on public.subscribers (lower(trim(email)));

create table if not exists public.topic_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text check (char_length(name) <= 60),
  email       text,                       -- optional by design
  title       text not null check (char_length(title) between 3 and 140),
  class_exam  text not null,
  subject     text not null,
  description text check (char_length(description) <= 500),
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'declined')),
  created_at  timestamptz not null default now()
);

-- staff accounts. Auth users only become admins by being listed here.
create table if not exists public.admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---------- 1b. ADMIN ROLE CHECK ----------------------------------------
-- security definer: runs as the table owner (postgres), so RLS on `admins`
-- does not block the check and anon visitors can never see the list.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
  );
$$;

-- ---------- 2. ROW LEVEL SECURITY --------------------------------------

grant usage on schema public to anon, authenticated;

alter table public.subscribers      enable row level security;
alter table public.topic_requests   enable row level security;

-- anonymous visitors may INSERT, and nothing else
drop policy if exists "anon_insert_subscribers" on public.subscribers;
create policy "anon_insert_subscribers"
  on public.subscribers
  for insert
  to anon
  with check (true);

drop policy if exists "anon_insert_topic_requests" on public.topic_requests;
create policy "anon_insert_topic_requests"
  on public.topic_requests
  for insert
  to anon
  with check (true);

-- signed-in staff: SELECT only when they are listed in `admins`
drop policy if exists "authenticated_read_topic_requests" on public.topic_requests;
drop policy if exists "admin_select_subscribers" on public.subscribers;
create policy "admin_select_subscribers"
  on public.subscribers
  for select
  to authenticated
  using (is_admin());

drop policy if exists "admin_select_topic_requests" on public.topic_requests;
create policy "admin_select_topic_requests"
  on public.topic_requests
  for select
  to authenticated
  using (is_admin());

-- and UPDATE the status of a request (approve / decline / move back)
drop policy if exists "admin_update_topic_requests" on public.topic_requests;
create policy "admin_update_topic_requests"
  on public.topic_requests
  for update
  to authenticated
  using (is_admin());

-- ---------- 3. NO EMAILS EVER LEAVE THE DATABASE ------------------------
-- anon gets INSERT on the tables, but SELECT only on the view below.
-- authenticated gets SELECT/UPDATE only behind the admin policies above.

revoke all on public.subscribers    from anon;
revoke all on public.topic_requests from anon;
grant insert on public.subscribers    to anon;
grant insert on public.topic_requests to anon;

revoke all on public.subscribers    from authenticated;
revoke all on public.topic_requests from authenticated;
grant select on public.subscribers            to authenticated;
grant select, update on public.topic_requests to authenticated;

-- ---------- 4. PUBLIC VIEW: approved requests, no emails ---------------
-- Owned by postgres, so the WHERE clause is always applied.
-- Columns deliberately exclude email, name and description.

create or replace view public.approved_topic_requests as
select id, title, class_exam, subject, created_at
from public.topic_requests
where status = 'approved'
order by created_at desc
limit 24;

grant select on public.approved_topic_requests to anon, authenticated;

-- ---------- 5. OPTIONAL SEED (delete if you do not want it) ------------
insert into public.topic_requests (title, class_exam, subject, status) values
  ('Probability with playing cards', 'Class 9-10', 'Maths', 'approved'),
  ('Ray diagrams for concave mirrors', 'Class 9-10', 'Physics', 'approved'),
  ('Organic reaction mechanisms cheat sheet', 'Class 11-12', 'Chemistry', 'approved'),
  ('How to memorise the biology diagrams', 'NEET', 'Biology', 'approved')
on conflict do nothing;

-- ---------- 5b. ADMIN SETUP --------------------------------------------
-- Do not insert a fake/all-zero UUID here.
-- After creating a real user in Authentication → Users, run:
-- INSERT INTO public.admins (user_id)
-- VALUES ('PASTE_REAL_AUTH_USER_UUID_HERE')
-- ON CONFLICT (user_id) DO NOTHING;


/* -------------------------------------------------------------------------
   HOW TO APPROVE A REQUEST
   Sign in to /admin.html, open Topic Requests and choose Approve / Decline.
   Approved requests appear on /request.html (public, anonymised) within seconds.

   HOW THE DUPLICATE EMAIL WORKS
   The unique index makes a second INSERT of the same address fail with
   Postgres error 23505; the front end turns that into
   "You're already subscribed".

   HOW ADMIN LOGIN WORKS
   /admin-login.html signs in through Supabase Auth (email + password).
   When the dashboard fetches data, RLS checks is_admin() and the SQL above;
   a signed-in non-admin sees an empty or 403 response and never any emails.

   API KEYS
   Settings → API → Project URL + anon public key → paste into js/config.js
   Never put the service_role key in this repo.
   ------------------------------------------------------------------------- */
