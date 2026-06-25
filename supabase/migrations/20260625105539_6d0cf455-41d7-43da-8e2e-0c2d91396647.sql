
-- Users
CREATE TABLE public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','banned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_users TO service_role;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Scripts
CREATE TABLE public.app_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_scripts TO service_role;
ALTER TABLE public.app_scripts ENABLE ROW LEVEL SECURITY;

-- Logs
CREATE TABLE public.app_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_logs TO service_role;
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

-- Sessions
CREATE TABLE public.app_sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_sessions TO service_role;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;

-- Settings (singleton row, id=1)
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Seed admin
INSERT INTO public.app_users (username, password_hash, role, status)
VALUES ('gabriel', 'h_8d36f9db_18', 'admin', 'active');

-- Seed scripts
INSERT INTO public.app_scripts (title, content, description) VALUES
  ('Khan Academy', '// Script Khan Academy - automatiza exercícios e desafios.
(function(){ console.log(''Khan Academy Bot ativo''); })();', 'Script automatizado para a plataforma Khan Academy.'),
  ('Leia Paraná', '// Script Leia Paraná - acelera leituras e atividades.
(function(){ console.log(''Leia PR Bot ativo''); })();', 'Acelere suas leituras e atividades no Leia Paraná.'),
  ('Redação Paraná', '// Script Redação Paraná - otimiza redações.
(function(){ console.log(''Redação PR Bot ativo''); })();', 'Otimize suas redações e feedback no Redação Paraná.'),
  ('Inglês Paraná', '// Script Inglês Paraná - pratique de forma inteligente.
(function(){ console.log(''Inglês PR Bot ativo''); })();', 'Pratique de forma inteligente no Inglês Paraná.'),
  ('Quizizz', '// Script Quizizz - auxiliar de respostas.
(function(){ console.log(''Quizizz Bot ativo''); })();', 'Auxiliar de respostas e estudos para o Quizizz.');

-- Seed settings
INSERT INTO public.app_settings (id, data) VALUES (1, '{
  "pixKey": "gabrieldacechen6@gmail.com",
  "pixAmount": "9.90",
  "pixName": "SCRIPTANDO PAJE",
  "pixCity": "CURITIBA",
  "whatsappNumber": "5547991295765",
  "supportEmail": "gabrieldacechen6@gmail.com",
  "heroTitle": "CANSADO DE PERDER TEMPO COM ATIVIDADES ESCOLARES?",
  "heroSubtitle": "Automatize Khan Academy, Quizizz, Redação PR, Inglês PR e Leia PR em segundos.",
  "loteText": "Últimos 37 acessos liberados por R$9,90. O valor sobe amanhã.",
  "priceLabel": "R$9,90"
}'::jsonb);

-- Seed initial log
INSERT INTO public.app_logs (username, action) VALUES ('Sistema', 'Plataforma inicializada na nuvem.');
