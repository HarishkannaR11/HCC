-- 0012 — Phase 4: the free tier is a fixed set of five charts.
--
-- 0011 kept open "any chart the learner has started", which meant a chart
-- started while subscribed stayed open after the subscription ended: a month
-- of paying would unlock every chart opened in that month, for ever. The free
-- tier is now the FIRST five distinct charts an account starts. Those stay
-- open to re-code; everything else needs a subscription in good standing.

-- The learner's free charts: the first five distinct charts they started.
create or replace function public.free_chart_ids(p_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select chart_id
  from public.attempts
  where user_id = p_user_id
  group by chart_id
  order by min(started_at), chart_id
  limit public.free_chart_limit();
$$;

revoke execute on function public.free_chart_ids(uuid) from public, anon, authenticated;
grant  execute on function public.free_chart_ids(uuid) to service_role;

-- May the caller read and attempt this chart? Full access, or one of their
-- free charts, or a free slot left. (The RLS policies from 0011 call this.)
create or replace function public.chart_access(p_chart_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_full_access((select auth.uid()))
      or p_chart_id in (select public.free_chart_ids((select auth.uid())))
      or (select count(distinct chart_id) from public.attempts where user_id = (select auth.uid()))
         < public.free_chart_limit();
$$;

-- The caller's own entitlement, for the UI, now with the free charts' ids.
-- A new column changes the return type, so drop and recreate.
drop function public.my_entitlement();
create function public.my_entitlement()
returns table (full_access boolean, free_used integer, free_limit integer, free_chart_ids uuid[])
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_full_access((select auth.uid())),
    least(
      (select count(distinct chart_id)::integer from public.attempts where user_id = (select auth.uid())),
      public.free_chart_limit()
    ),
    public.free_chart_limit(),
    coalesce(array(select public.free_chart_ids((select auth.uid()))), '{}');
$$;

revoke execute on function public.my_entitlement() from public, anon;
grant  execute on function public.my_entitlement() to authenticated, service_role;
