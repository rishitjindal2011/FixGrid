-- 004_seo_schemas.sql

alter table public.seo_global add column if not exists global_expert_schema jsonb;
alter table public.seo_global add column if not exists global_organization_schema jsonb;
