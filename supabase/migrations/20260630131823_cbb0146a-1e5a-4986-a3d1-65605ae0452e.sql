
ALTER TABLE public.app_scripts
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'Terminal',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS short_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS long_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tutorial text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notices jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_scripts_set_updated_at ON public.app_scripts;
CREATE TRIGGER app_scripts_set_updated_at
BEFORE UPDATE ON public.app_scripts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Initialize sort_order based on insertion order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.app_scripts
  WHERE sort_order = 0
)
UPDATE public.app_scripts s
SET sort_order = ordered.rn
FROM ordered
WHERE s.id = ordered.id AND s.sort_order = 0;
