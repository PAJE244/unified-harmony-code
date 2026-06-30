
## Objetivo

Substituir os cards atuais de "scripts" por uma experiência premium em duas camadas:

1. **Grid de plataformas** (`Dashboard`) — apenas cards elegantes: ícone, nome, descrição curta, status, botão "Abrir". O script nunca é exibido aqui.
2. **Página de detalhes** (modal fullscreen com animações) — cabeçalho, galeria de imagens, descrição rica, tutorial passo-a-passo, avisos, informações extras e o botão "Copiar Script" (sem nunca exibir o código).

Tudo gerenciado pelo painel admin com editor moderno.

---

## Mudanças de banco (1 migração)

Estender `app_scripts` mantendo compatibilidade com os scripts já cadastrados:

```sql
ALTER TABLE public.app_scripts
  ADD COLUMN icon text DEFAULT 'Terminal',         -- nome do ícone lucide
  ADD COLUMN status text DEFAULT 'online',         -- online | updated | maintenance | offline
  ADD COLUMN accent_color text,                    -- hex opcional para destaque
  ADD COLUMN short_description text DEFAULT '',    -- 1 linha (card)
  ADD COLUMN long_description text DEFAULT '',     -- markdown rico (página)
  ADD COLUMN tutorial text DEFAULT '',             -- markdown rico passo a passo
  ADD COLUMN images jsonb NOT NULL DEFAULT '[]',   -- [{url, caption?}]
  ADD COLUMN notices jsonb NOT NULL DEFAULT '[]',  -- [{type, title, message}]
  ADD COLUMN extras jsonb NOT NULL DEFAULT '{}',   -- {compat, browsers, version, lastUpdate, duration, notes}
  ADD COLUMN sort_order int NOT NULL DEFAULT 0,
  ADD COLUMN active boolean NOT NULL DEFAULT true,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
```

Trigger `updated_at` em `UPDATE`. Sem novos GRANTs/policies (tabela já existe; admin lê via service role).

---

## Storage de imagens

- Bucket público `script-images` criado via `supabase--storage_create_bucket`.
- Policy de upload restrita a admin via server function (upload acontece através de `apiCall` que já valida `me.role === 'admin'`).
- Endpoint novo no `scriptando-api.functions.ts`:
  - `POST /api/admin/upload-image` — recebe `{ base64, filename }`, faz upload pelo `supabaseAdmin.storage`, retorna `{ url }`.

---

## API (extensões em `scriptando-api.functions.ts`)

- `GET /api/scripts` passa a retornar todos os novos campos **exceto `content`** (o código nunca trafega para clientes comuns nessa rota).
- `POST /api/scripts/:id/copy` — único endpoint que retorna `{ content }`; só responde com o script para usuários autenticados, registra log "Copiou script X". Cliente chama isso só no `onClick` do botão Copiar.
- `POST /api/admin/scripts` / `PUT /api/admin/scripts/:id` aceita todos os novos campos.
- `POST /api/admin/scripts/:id/duplicate` — duplica.
- `PUT /api/admin/scripts/reorder` — recebe array de IDs e reescreve `sort_order`.

---

## Frontend — Dashboard (cards)

Em `PlatformApp.tsx`, refazer a seção do dashboard:

- Grid responsivo (1/2/3 colunas) de `<PlatformCard>` glassmórficos.
- Cada card: ícone (lucide dinâmico por nome), nome, descrição curta, badge de status colorido sutil, botão "Abrir".
- Hover: leve translate-y, sombra ampliada, borda branca/10 → branca/20.
- Animações `framer-motion` stagger na entrada.
- Sem nenhuma referência a `script.content` (removido do tipo público no client).

---

## Frontend — Página de detalhes

Novo componente `ScriptDetailModal.tsx`:

- Modal fullscreen com `motion` (fade + slide-up, backdrop-blur). Esc/botão "Voltar" fecha.
- **Seções verticais com ancoragem lateral em desktop**:
  1. **Cabeçalho**: ícone grande, nome, descrição, badges (status, compatibilidade, versão, última atualização).
  2. **Galeria**: carrossel com `embla-carousel-react` (já instalado), setas, dots, lazy-loading via `loading="lazy"`, clique abre lightbox com zoom (componente próprio com `transform: scale`).
  3. **Descrição completa**: renderizador markdown leve (uso `react-markdown` + `remark-gfm`, instalar).
  4. **Tutorial**: mesmo renderizador, com estilos especiais para imagens entre parágrafos e blocos `> [!warning]`.
  5. **Utilizar Script**: card destacado com botão grande "Copiar Script". onClick chama `/api/scripts/:id/copy`, copia para clipboard via `navigator.clipboard.writeText`, toast de sucesso + checkmark animado. O conteúdo é descartado da memória imediatamente após a cópia (variável local, sem state).
  6. **Informações extras**: grid de chips (compatibilidade, navegadores, versão, atualização, duração).
  7. **Avisos**: cards coloridos por tipo (info/warning/update/maintenance).

Skeletons enquanto o detalhe carrega.

---

## Frontend — Admin editor

Nova aba "Plataformas" no admin (substitui o CRUD atual de Scripts):

- Lista reordenável (drag-and-drop com `@dnd-kit/sortable`, instalar).
- Por linha: ícone, nome, status, switches "ativo", botões editar/duplicar/excluir.
- Botão "Nova plataforma".

Editor (drawer lateral fullheight):

- Abas: **Geral** · **Mídia** · **Descrição** · **Tutorial** · **Avisos** · **Extras** · **Script**.
- **Geral**: nome, ícone (combobox de ícones lucide), status, cor de destaque, descrição curta.
- **Mídia**: dropzone (drag-and-drop) + clique para upload, miniaturas reordenáveis, remover, caption opcional.
- **Descrição / Tutorial**: textarea markdown com toolbar leve (B / I / H / lista / link / citação / imagem) e preview ao vivo (split). Não vou trazer dependência pesada tipo TipTap — markdown + preview cobre 100% do escopo pedido e mantém o bundle leve.
- **Avisos**: lista editável `{type, title, message}`.
- **Extras**: form simples dos campos.
- **Script**: textarea monoespaçado, só visível para admin (rota normal de admin). Aviso "este conteúdo nunca aparece para usuários finais".
- **Auto-save** debounced (1.2s) chamando `PUT /api/admin/scripts/:id`. Indicador "Salvo às hh:mm".
- Botão "Pré-visualizar" abre a página de detalhes em modo readonly.

---

## Segurança do script

- Tipo `DbScript` exposto ao client (`scriptando-db.ts`) **não inclui `content`** (apenas admin recebe via rota admin).
- Único caminho de leitura para usuários: `POST /api/scripts/:id/copy`, e a resposta vai direto para `navigator.clipboard.writeText` sem nunca ser colocada em estado React, DOM, log ou atributo HTML.
- Sem `dangerouslySetInnerHTML` recebendo `content`.

---

## Dependências novas

- `react-markdown` + `remark-gfm` (renderização)
- `@dnd-kit/core` + `@dnd-kit/sortable` (reorder no admin)

(Embla, framer-motion e lucide já estão no projeto.)

---

## Arquivos criados / editados

- `supabase` migration (novos campos + bucket)
- `src/lib/scriptando-api.functions.ts` — novos endpoints (copy, upload, duplicate, reorder, campos extras)
- `src/lib/scriptando-db.ts` — tipos atualizados, helpers `copyScript`, `uploadImage`
- `src/components/PlatformApp.tsx` — substitui dashboard e admin de scripts
- `src/components/scripts/PlatformCard.tsx`
- `src/components/scripts/ScriptDetailModal.tsx`
- `src/components/scripts/MarkdownView.tsx`
- `src/components/scripts/GalleryCarousel.tsx`
- `src/components/scripts/Lightbox.tsx`
- `src/components/admin/PlatformsAdmin.tsx`
- `src/components/admin/PlatformEditor.tsx` (com sub-abas)
- `src/components/admin/MarkdownEditor.tsx`
- `src/components/admin/IconPicker.tsx`
- `src/components/admin/ImageDropzone.tsx`

Login, permissões, realtime, sessões e checkout permanecem inalterados.

---

## O que **não** vou mudar

- Lógica de auth, RLS, sessões, banimentos, settings, checkout, landing page, tutorial mobile (continua na aba do user).
- O endpoint `/api/scripts` continua existindo para listar (sem `content`) — preserva a aba Tutorial e qualquer outro consumidor.
