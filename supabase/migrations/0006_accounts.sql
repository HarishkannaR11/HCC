-- Accounts: profiles (with role), subscriptions, daily activity.


-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by trigger. Role defaults to
-- learner; nothing a user sends at signup can make them an admin. Admins are
-- promoted with `npm run admin:grant -- <email>` (service role).
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('learner', 'admin');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text check (char_length(full_name) <= 120),
  role       public.app_role not null default 'learner',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    -- Email signup sends full_name; Google sends full_name and name.
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 120), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users that existed before this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- is_admin(): the one role check every admin policy uses. SECURITY DEFINER so
-- it can read profiles without recursing into profiles' own RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- subscriptions: written only by the billing webhook (service role, Phase 4).
-- ---------------------------------------------------------------------------
create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired'
);

create table public.subscriptions (
  user_id              uuid primary key references public.profiles (id) on delete cascade,
  provider             text not null check (provider in ('lemonsqueezy', 'paddle', 'dodo')),
  provider_customer_id text not null,
  plan                 text not null,
  status               public.subscription_status not null,
  current_period_end   timestamptz,
  updated_at           timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- daily_activity: one row per user per day with at least one submission.
-- Written server-side on submit (Phase 2/3); read by the dashboard.
-- ---------------------------------------------------------------------------
create table public.daily_activity (
  user_id          uuid    not null references public.profiles (id) on delete cascade,
  activity_date    date    not null,
  charts_completed integer not null default 0 check (charts_completed >= 0),
  primary key (user_id, activity_date)
);


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.daily_activity enable row level security;

create policy "read own profile, admins read all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Column privileges below limit this to full_name; role is not updatable.
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "read own subscription" on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "read own activity" on public.daily_activity
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.profiles, public.subscriptions, public.daily_activity from anon;
revoke insert, update, delete, truncate, references, trigger on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.subscriptions, public.daily_activity
  from authenticated;
