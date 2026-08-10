-- 005_blog_posts.sql

create type public.blog_status as enum ('draft', 'published', 'archived');

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  status blog_status not null default 'draft',
  content text,
  meta_title text,
  meta_description text,
  keywords text[],
  og_image_url text,
  author_id uuid references public.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.blog_posts enable row level security;

create policy "Anyone can read published blog posts"
  on public.blog_posts
  for select
  using (status = 'published');

-- Admins will access via service role, bypassing RLS.
