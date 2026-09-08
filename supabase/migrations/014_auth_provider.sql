-- Add auth_provider column to seo_global to act as a master feature flag
-- between Supabase and Clerk authentication.

ALTER TABLE public.seo_global 
ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'supabase';

-- Ensure only valid providers can be set
ALTER TABLE public.seo_global
ADD CONSTRAINT check_valid_auth_provider 
CHECK (auth_provider IN ('supabase', 'clerk'));

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
