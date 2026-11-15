-- 0013 — New accounts get full access by default.
--
-- Owner's decision: until paid plans start, every new account is treated
-- like a paying subscriber. The free tier, paywall and billing from 0011/0012
-- stay in place and apply to any account without this grant.
--
-- The switch is the column default. To start charging new sign-ups:
--   alter table public.profiles alter column complimentary_access set default false;
-- Accounts created before that keep their grant until it is revoked
-- (update public.profiles set complimentary_access = false where ...).
--
-- Learners cannot change the flag: their only column grant on profiles is
-- full_name (0006).

alter table public.profiles
  add column complimentary_access boolean not null default true;

comment on column public.profiles.complimentary_access is
  'Full access without a subscription. Defaults to true while paid plans are off; see migration 0013.';

-- The single access rule, now including the grant.
create or replace function public.has_full_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.profiles
           where id = p_user_id and (role = 'admin' or complimentary_access)
         )
      or exists (
        select 1 from public.subscriptions s
        where s.user_id = p_user_id
          and (
            s.status in ('active', 'trialing', 'past_due')
            or (s.status = 'cancelled' and s.current_period_end > now())
          )
      );
$$;

revoke execute on function public.has_full_access(uuid) from public, anon, authenticated;
grant  execute on function public.has_full_access(uuid) to service_role;
