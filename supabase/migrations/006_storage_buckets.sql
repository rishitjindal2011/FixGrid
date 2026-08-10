-- 006_storage_buckets.sql

-- Create the shop-photos bucket if it does not exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-photos',
  'shop-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- RLS for storage.objects in shop-photos bucket

-- 1. Anyone can view public photos
create policy "Anyone can read public photos"
  on storage.objects for select
  using ( bucket_id = 'shop-photos' );

-- 2. Shop owners can upload photos to their own folder (folder name must match their fixer_id)
create policy "Owners can upload shop photos"
  on storage.objects for insert
  with check (
    bucket_id = 'shop-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select id::text from public.fixer_profiles where owner_id = auth.uid()
    )
  );

-- 3. Shop owners can update their own photos
create policy "Owners can update shop photos"
  on storage.objects for update
  using (
    bucket_id = 'shop-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select id::text from public.fixer_profiles where owner_id = auth.uid()
    )
  );

-- 4. Shop owners can delete their own photos
create policy "Owners can delete shop photos"
  on storage.objects for delete
  using (
    bucket_id = 'shop-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select id::text from public.fixer_profiles where owner_id = auth.uid()
    )
  );
