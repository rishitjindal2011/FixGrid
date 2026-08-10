-- Fix RLS Function Inlining Issue
--
-- Postgres 14+ optimizes functions defined as `language sql` and `stable` by 
-- inlining them into the calling query. When an RLS policy calls an inlined 
-- function, it evaluates the function's logic under the caller's privileges, 
-- thereby stripping the `security definer` context. 
--
-- By redefining these RLS helpers as `language plpgsql`, we prevent them from 
-- being inlined, ensuring they evaluate correctly under the `postgres` role and 
-- bypass RLS when querying lookup tables (fixer_profiles, message_threads, disputes).

create or replace function owns_shop(p_fixer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
      from fixer_profiles f
     where f.id = p_fixer_id
       and f.owner_id = (select auth.uid())
  ) into v_exists;
  return v_exists;
end;
$$;

create or replace function is_thread_party(p_thread_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
      from message_threads t
     where t.id = p_thread_id
       and (t.customer_id = (select auth.uid()) or owns_shop(t.fixer_id))
  ) into v_exists;
  return v_exists;
end;
$$;

create or replace function is_dispute_party(p_dispute_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
      from disputes d
     where d.id = p_dispute_id
       and (d.customer_id = (select auth.uid()) or owns_shop(d.fixer_id))
  ) into v_exists;
  return v_exists;
end;
$$;
