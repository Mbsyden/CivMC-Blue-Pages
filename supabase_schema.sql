-- BLUE PAGES — SUPABASE SETUP
-- Run this whole file in Supabase SQL Editor.
-- This schema is designed for a public browser app using the publishable/anon key.
-- Do NOT put a service_role/secret key in the website.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text not null,
  location text not null,
  description text not null,
  services text,
  contact text not null,
  website text,
  verified boolean not null default false,
  priority integer not null default 0 check (priority between 0 and 100),
  status text not null default 'published' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  category text not null,
  location text not null,
  budget text,
  details text not null,
  contact text not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  title text not null,
  text text,
  image_url text,
  target_url text,
  active boolean not null default true,
  priority integer not null default 0 check (priority between 0 and 100),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists businesses_status_priority_idx
  on public.businesses(status, priority desc, created_at desc);

create index if not exists ads_active_priority_idx
  on public.ads(active, priority desc, created_at desc);

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

-- Automatically create a basic profile for each new authenticated user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper used by RLS. SECURITY DEFINER avoids recursive profile-policy checks.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.service_requests enable row level security;
alter table public.ads enable row level security;

-- Profiles: users can see/update their own profile; admins can manage profiles.
drop policy if exists "profiles own select" on public.profiles;
create policy "profiles own select" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
for update to authenticated
using (id = (select auth.uid()) or public.is_admin())
with check (id = (select auth.uid()) or public.is_admin());

-- Businesses: everyone can see published listings.
drop policy if exists "published businesses public read" on public.businesses;
create policy "published businesses public read" on public.businesses
for select to anon, authenticated
using (status = 'published' or owner_id = (select auth.uid()) or public.is_admin());

-- Authenticated users can submit businesses. New listings are pending.
drop policy if exists "users create businesses" on public.businesses;
create policy "users create businesses" on public.businesses
for insert to authenticated
with check (owner_id = (select auth.uid()) and status = 'pending' and verified = false and priority = 0);

-- Owners can edit their own listings but cannot grant themselves verification/priority.
drop policy if exists "owners edit businesses" on public.businesses;
create policy "owners edit businesses" on public.businesses
for update to authenticated
using (owner_id = (select auth.uid()) or public.is_admin())
with check (
  public.is_admin()
  or (
    owner_id = (select auth.uid())
    and verified = false
    and priority = 0
    and status in ('pending','published')
  )
);

drop policy if exists "admins delete businesses" on public.businesses;
create policy "admins delete businesses" on public.businesses
for delete to authenticated
using (public.is_admin());

-- Service requests: public read; logged-in users can post and manage their own.
drop policy if exists "open requests public read" on public.service_requests;
create policy "open requests public read" on public.service_requests
for select to anon, authenticated
using (status = 'open' or author_id = (select auth.uid()) or public.is_admin());

drop policy if exists "users create requests" on public.service_requests;
create policy "users create requests" on public.service_requests
for insert to authenticated
with check (author_id = (select auth.uid()));

drop policy if exists "owners manage requests" on public.service_requests;
create policy "owners manage requests" on public.service_requests
for update to authenticated
using (author_id = (select auth.uid()) or public.is_admin())
with check (author_id = (select auth.uid()) or public.is_admin());

drop policy if exists "admins delete requests" on public.service_requests;
create policy "admins delete requests" on public.service_requests
for delete to authenticated
using (public.is_admin());

-- Ads are public only while active and inside their date window.
drop policy if exists "active ads public read" on public.ads;
create policy "active ads public read" on public.ads
for select to anon, authenticated
using (
  active = true
  and starts_at <= now()
  and (ends_at is null or ends_at > now())
  or public.is_admin()
);

drop policy if exists "admins create ads" on public.ads;
create policy "admins create ads" on public.ads
for insert to authenticated
with check (public.is_admin());

drop policy if exists "admins update ads" on public.ads;
create policy "admins update ads" on public.ads
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins delete ads" on public.ads;
create policy "admins delete ads" on public.ads
for delete to authenticated
using (public.is_admin());

-- Grants for the browser Data API. RLS remains the security boundary.
grant usage on schema public to anon, authenticated;
grant select on public.businesses, public.service_requests, public.ads to anon, authenticated;
grant insert on public.businesses, public.service_requests to authenticated;
grant update on public.businesses, public.service_requests to authenticated;
grant delete on public.businesses, public.service_requests to authenticated;
grant select, update on public.profiles to authenticated;
grant insert, update, delete on public.ads to authenticated;

-- After your first account exists, promote YOUR account to admin:
-- update public.profiles set role = 'admin' where id = 'YOUR-AUTH-USER-UUID';
