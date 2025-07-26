-- Add missing columns to existing tables
ALTER TABLE public.igraci 
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS word text;

ALTER TABLE public.partije 
ADD COLUMN IF NOT EXISTS custom_words text[] DEFAULT '{}';

-- Update existing records to have default values
UPDATE public.igraci SET role = NULL WHERE role IS NULL;
UPDATE public.partije SET custom_words = '{}' WHERE custom_words IS NULL;