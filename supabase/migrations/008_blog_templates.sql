-- 008_blog_templates.sql

create table public.blog_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  html_template text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Add foreign key to blog_posts
alter table public.blog_posts 
  add column template_id uuid references public.blog_templates(id) on delete set null;

-- Enable RLS
alter table public.blog_templates enable row level security;

-- Policies
create policy "Anyone can read blog templates"
  on public.blog_templates for select
  using ( true );

create policy "Admins can insert blog templates"
  on public.blog_templates for insert
  with check ( auth.role() = 'authenticated' );

create policy "Admins can update blog templates"
  on public.blog_templates for update
  using ( auth.role() = 'authenticated' );

create policy "Admins can delete blog templates"
  on public.blog_templates for delete
  using ( auth.role() = 'authenticated' );

-- Insert default template
insert into public.blog_templates (id, name, html_template)
values (
  '11111111-1111-1111-1111-111111111111',
  'Modern Hero',
  '<article class="min-h-screen bg-wash pb-24">
  <header class="relative overflow-hidden bg-enamel pt-32 pb-32 px-4 text-center isolate">
    <div class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-signal/20 via-enamel to-enamel"></div>
    <div class="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[100px] bg-gradient-to-tr from-signal to-blue-500 rounded-full mix-blend-screen"></div>

    <div class="mx-auto max-w-4xl">
      <a href="/" class="inline-flex items-center gap-2 mb-8 text-sm font-medium text-steel hover:text-white transition-colors duration-200">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Home
      </a>
      
      <h1 class="mb-8 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl font-sans normal-case leading-tight" style="text-wrap: balance;">
        {{title}}
      </h1>
      
      <div class="flex items-center justify-center gap-3 text-steel">
        <time class="text-sm font-medium tracking-wide uppercase text-white/80">
          {{date}}
        </time>
      </div>
    </div>
  </header>

  <div class="mx-auto max-w-4xl px-4 -mt-16 relative z-10">
    <div class="rounded-2xl bg-white p-8 md:p-12 lg:p-16 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-black/5">
      <div class="prose prose-slate prose-lg md:prose-xl max-w-none text-enamel prose-headings:font-sans prose-headings:normal-case prose-headings:font-bold prose-headings:tracking-tight prose-a:text-signal prose-a:no-underline hover:prose-a:underline prose-p:leading-relaxed prose-strong:text-enamel prose-strong:font-bold" style="text-wrap: pretty;">
        {{content}}
      </div>
    </div>
  </div>
</article>'
);

-- Update existing blog posts to use the default template
update public.blog_posts set template_id = '11111111-1111-1111-1111-111111111111';
