-- 0011 — Phase 4: monetisation.
--
-- * Entitlement is decided in Postgres. has_full_access(user) is the single
--   rule (admin, or a subscription in good standing); chart_access(chart) adds
--   the free tier: any FIVE distinct charts per account, ever. Both the chart
--   text (chart_sections) and starting an attempt are gated in RLS, so the
--   paywall holds even if a page forgets to check.
-- * Billing events from the provider are applied by apply_billing_event(), in
--   one transaction: idempotent (billing_events.id), ordered (an older event
--   never overwrites a newer one), and service-role only. Learners can read
--   their own subscription row and nothing else here.


-- ---------------------------------------------------------------------------
-- Subscriptions: provider identity, raw status and ordering
-- ---------------------------------------------------------------------------

alter table public.subscriptions
  add column provider_subscription_id text unique,
  -- The provider's own word (e.g. Lemon Squeezy "unpaid"), kept for display and support.
  add column provider_status text,
  -- Time of the newest event applied; older events are ignored.
  add column last_event_at timestamptz;


-- ---------------------------------------------------------------------------
-- Entitlement
-- ---------------------------------------------------------------------------

create or replace function public.free_chart_limit()
returns integer
language sql
immutable
as $$ select 5 $$;

-- In good standing: active, trialing, or past due (the provider is still
-- retrying the card), or cancelled but inside the period already paid for.
create or replace function public.has_full_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = p_user_id and role = 'admin')
      or exists (
        select 1 from public.subscriptions s
        where s.user_id = p_user_id
          and (
            s.status in ('active', 'trialing', 'past_due')
            or (s.status = 'cancelled' and s.current_period_end > now())
          )
      );
$$;

-- May the caller read and attempt this chart? Full access, or a chart they
-- have already started, or a free slot left.
create or replace function public.chart_access(p_chart_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_full_access((select auth.uid()))
      or exists (select 1 from public.attempts where user_id = (select auth.uid()) and chart_id = p_chart_id)
      or (select count(distinct chart_id) from public.attempts where user_id = (select auth.uid()))
         < public.free_chart_limit();
$$;

-- The caller's own entitlement, for the UI.
create or replace function public.my_entitlement()
returns table (full_access boolean, free_used integer, free_limit integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_full_access((select auth.uid())),
    (select count(distinct chart_id)::integer from public.attempts where user_id = (select auth.uid())),
    public.free_chart_limit();
$$;

revoke execute on function public.has_full_access(uuid) from public, anon, authenticated;
grant  execute on function public.has_full_access(uuid) to service_role;
revoke execute on function public.chart_access(uuid) from public, anon;
grant  execute on function public.chart_access(uuid) to authenticated, service_role;
revoke execute on function public.my_entitlement() from public, anon;
grant  execute on function public.my_entitlement() to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- The paywall, in RLS
-- ---------------------------------------------------------------------------

drop policy "read sections of published charts" on public.chart_sections;
create policy "read sections of accessible published charts" on public.chart_sections
  for select to authenticated
  using (
    (select public.is_admin())
    or (
      exists (
        select 1 from public.charts c
        where c.id = chart_sections.chart_id and c.status = 'published'
      )
      and public.chart_access(chart_sections.chart_id)
    )
  );

drop policy "start an attempt on a published chart" on public.attempts;
create policy "start an attempt on an accessible published chart" on public.attempts
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and submitted_at is null
    and exists (select 1 from public.charts c where c.id = chart_id and c.status = 'published')
    and public.chart_access(chart_id)
  );


-- ---------------------------------------------------------------------------
-- Billing events: the idempotency ledger
-- ---------------------------------------------------------------------------

create table public.billing_events (
  id                       text primary key,   -- provider event identity
  provider                 text not null,
  event_name               text not null,
  user_id                  uuid references public.profiles (id) on delete set null,
  provider_subscription_id text,
  occurred_at              timestamptz,
  received_at              timestamptz not null default now(),
  outcome                  text not null check (outcome in ('applied', 'stale', 'unmatched', 'ignored')),
  payload                  jsonb not null
);

create index billing_events_subscription_idx on public.billing_events (provider_subscription_id);

alter table public.billing_events enable row level security;
-- No policies: service role only.
revoke all on public.billing_events from anon, authenticated;


-- ---------------------------------------------------------------------------
-- Applying an event
-- ---------------------------------------------------------------------------

-- p_subscription (normalised by lib/billing), or null for events that carry no
-- subscription state (e.g. invoices):
--   { provider_subscription_id, provider_customer_id, plan, status,
--     provider_status, current_period_end }
-- Returns 'duplicate' | 'applied' | 'stale' | 'unmatched' | 'ignored'.
create or replace function public.apply_billing_event(
  p_event_id     text,
  p_provider     text,
  p_event_name   text,
  p_occurred_at  timestamptz,
  p_user_id      uuid,
  p_payload      jsonb,
  p_subscription jsonb
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_user     uuid;
  v_sub_id   text := p_subscription ->> 'provider_subscription_id';
  v_status   public.subscription_status;
  v_existing public.subscriptions%rowtype;
  v_outcome  text;
begin
  -- Claim the event first: a concurrent or repeated delivery stops here.
  insert into public.billing_events (id, provider, event_name, provider_subscription_id, occurred_at, outcome, payload)
  values (p_event_id, p_provider, p_event_name, v_sub_id, p_occurred_at, 'ignored', p_payload)
  on conflict (id) do nothing;
  if not found then
    return 'duplicate';
  end if;

  if p_subscription is null then
    return 'ignored';
  end if;

  -- Whose subscription: the user id we attached at checkout, else the owner
  -- of this provider subscription.
  select id into v_user from public.profiles where id = p_user_id;
  if v_user is null and v_sub_id is not null then
    select user_id into v_user from public.subscriptions where provider_subscription_id = v_sub_id;
  end if;

  if v_user is null then
    v_outcome := 'unmatched';
  else
    v_status := (p_subscription ->> 'status')::public.subscription_status;
    select * into v_existing from public.subscriptions where user_id = v_user for update;

    if found and v_existing.last_event_at is not null and v_existing.last_event_at > p_occurred_at then
      -- An older event, delivered late.
      v_outcome := 'stale';
    elsif found
      and v_existing.provider_subscription_id is distinct from v_sub_id
      and (v_existing.status in ('active', 'trialing', 'past_due')
           or (v_existing.status = 'cancelled' and v_existing.current_period_end > now()))
      and not (v_status in ('active', 'trialing', 'past_due'))
    then
      -- A previous subscription winding down must not displace a live one.
      v_outcome := 'stale';
    else
      insert into public.subscriptions (
        user_id, provider, provider_customer_id, provider_subscription_id, plan,
        status, provider_status, current_period_end, last_event_at, updated_at
      )
      values (
        v_user, p_provider,
        p_subscription ->> 'provider_customer_id',
        v_sub_id,
        p_subscription ->> 'plan',
        v_status,
        p_subscription ->> 'provider_status',
        (p_subscription ->> 'current_period_end')::timestamptz,
        p_occurred_at,
        now()
      )
      on conflict (user_id) do update set
        provider                 = excluded.provider,
        provider_customer_id     = excluded.provider_customer_id,
        provider_subscription_id = excluded.provider_subscription_id,
        plan                     = excluded.plan,
        status                   = excluded.status,
        provider_status          = excluded.provider_status,
        current_period_end       = excluded.current_period_end,
        last_event_at            = excluded.last_event_at,
        updated_at               = now();
      v_outcome := 'applied';
    end if;
  end if;

  update public.billing_events set outcome = v_outcome, user_id = v_user where id = p_event_id;
  return v_outcome;
end;
$$;

revoke execute on function public.apply_billing_event(text, text, text, timestamptz, uuid, jsonb, jsonb) from public, anon, authenticated;
grant  execute on function public.apply_billing_event(text, text, text, timestamptz, uuid, jsonb, jsonb) to service_role;
