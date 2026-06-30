DROP TRIGGER IF EXISTS app_scripts_set_updated_at ON public.app_scripts;
CREATE TRIGGER app_scripts_set_updated_at
BEFORE UPDATE ON public.app_scripts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();