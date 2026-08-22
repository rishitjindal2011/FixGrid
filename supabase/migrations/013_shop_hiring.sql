-- ════════════════════════════════════════════════════════════════════════════
-- 013 — Shop Hiring & Job Openings
--
-- Allows repair shops to post job vacancies, technician openings, apprenticeships,
-- and assistant roles. 100% free for shopkeepers, backed by RLS, and displayed
-- on both the shop dashboard and the public shop storefront (/expert/[slug]).
--
-- Every step is guarded so this file is safe to run twice.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── PHASE 1 · Enums ─────────────────────────────────────────────────────────

do $$ begin
  create type job_type as enum ('full_time', 'part_time', 'contract', 'apprenticeship');
exception when duplicate_object then null; end $$;

do $$ begin
  create type work_location as enum ('in_shop', 'on_field', 'hybrid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type salary_type as enum ('fixed', 'range', 'negotiable', 'commission');
exception when duplicate_object then null; end $$;

do $$ begin
  create type salary_period as enum ('month', 'week', 'day', 'per_job');
exception when duplicate_object then null; end $$;


-- ─── PHASE 2 · The Table ────────────────────────────────────────────────────

create table if not exists shop_jobs (
  id                  uuid primary key default gen_random_uuid(),
  fixer_id            uuid not null references fixer_profiles(id) on delete cascade,
  title               text not null,
  job_type            job_type not null default 'full_time',
  work_location       work_location not null default 'in_shop',
  experience_level    text not null default 'any',
  salary_type         salary_type not null default 'negotiable',
  salary_min          integer,
  salary_max          integer,
  salary_period       salary_period not null default 'month',
  salary_negotiable   boolean not null default true,
  description         text not null,
  skills_required     text[] not null default '{}',
  contact_phone       text,
  contact_whatsapp    text,
  contact_email       citext,
  is_active           boolean not null default true,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);


-- ─── PHASE 3 · Columns Guard ────────────────────────────────────────────────

alter table shop_jobs
  add column if not exists fixer_id          uuid references fixer_profiles(id) on delete cascade,
  add column if not exists title             text,
  add column if not exists job_type          job_type not null default 'full_time',
  add column if not exists work_location     work_location not null default 'in_shop',
  add column if not exists experience_level  text not null default 'any',
  add column if not exists salary_type       salary_type not null default 'negotiable',
  add column if not exists salary_min        integer,
  add column if not exists salary_max        integer,
  add column if not exists salary_period     salary_period not null default 'month',
  add column if not exists salary_negotiable boolean not null default true,
  add column if not exists description       text,
  add column if not exists skills_required   text[] not null default '{}',
  add column if not exists contact_phone     text,
  add column if not exists contact_whatsapp  text,
  add column if not exists contact_email     citext,
  add column if not exists is_active         boolean not null default true,
  add column if not exists sort_order        integer not null default 0,
  add column if not exists created_at        timestamptz not null default now(),
  add column if not exists updated_at        timestamptz not null default now();


-- ─── PHASE 4 · Constraints ──────────────────────────────────────────────────

do $$ begin
  alter table shop_jobs add constraint shop_jobs_title_length
    check (length(btrim(title)) between 2 and 120);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_jobs add constraint shop_jobs_salary_sanity
    check (salary_min is null or salary_min >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_jobs add constraint shop_jobs_salary_range_order
    check (salary_min is null or salary_max is null or salary_max >= salary_min);
exception when duplicate_object then null; end $$;


-- ─── PHASE 5 · Indexes ──────────────────────────────────────────────────────

-- Dashboard ordering: by fixer and sort_order / created_at
create index if not exists shop_jobs_fixer_idx
  on shop_jobs (fixer_id, sort_order, created_at desc);

-- Public profile panel: active vacancies only
create index if not exists shop_jobs_public_idx
  on shop_jobs (fixer_id, sort_order, created_at desc) where (is_active);


-- ─── PHASE 6 · updated_at Trigger ───────────────────────────────────────────

drop trigger if exists shop_jobs_touch on shop_jobs;
create trigger shop_jobs_touch
  before update on shop_jobs
  for each row execute function touch_updated_at();


-- ─── PHASE 7 · RLS Policies ─────────────────────────────────────────────────

alter table shop_jobs enable row level security;

-- Public can view active jobs
drop policy if exists "active jobs readable by all" on shop_jobs;
create policy "active jobs readable by all"
  on shop_jobs for select
  using (is_active);

-- Shop owner can view, insert, update, delete all their own jobs
drop policy if exists "owner manages own jobs" on shop_jobs;
create policy "owner manages own jobs"
  on shop_jobs for all
  to authenticated
  using (owns_shop(fixer_id))
  with check (owns_shop(fixer_id));


-- ─── PHASE 8 · Grants ───────────────────────────────────────────────────────

grant select on shop_jobs to anon;
grant select, insert, update, delete on shop_jobs to authenticated;
revoke insert, update, delete on shop_jobs from anon;
