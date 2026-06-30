import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Edit2, Trash2, Copy as CopyIcon, ArrowUp, ArrowDown, Eye, EyeOff,
  X, Image as ImageIcon, Upload, Trash, ChevronDown, ChevronUp,
  Save, Loader2, Eye as EyeIcon, Pencil,
} from "lucide-react";
import { apiFetch } from "@/lib/scriptando-db";
import type { DbScript, ScriptNotice, ScriptStatus } from "@/lib/scriptando-db";
import { PLATFORM_ICONS, PLATFORM_ICON_LIST, STATUS_META } from "./platform-meta";
import MarkdownView from "./MarkdownView";

interface Props {
  token: string | null;
  onToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

type Draft = Omit<DbScript, "id" | "createdAt" | "updatedAt"> & { id?: string };

const emptyDraft: Draft = {
  title: "", content: "", description: "", shortDescription: "", longDescription: "",
  tutorial: "", icon: "Terminal", status: "online", accentColor: null,
  images: [], notices: [], extras: {}, sortOrder: 0, active: true,
};

async function fileToDataUrl(file: File, maxW = 1400, quality = 0.82): Promise<string> {
  const img = new Image();
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((res, rej) => {
    reader.onload = () => res(reader.result as string);
    reader.onerror = () => rej(reader.error);
    reader.readAsDataURL(file);
  });
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("img")); img.src = dataUrl; });
  const ratio = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function AdminScriptsManager({ token, onToast }: Props) {
  const [scripts, setScripts] = useState<DbScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const r = await apiFetch("/api/admin/scripts", { headers: { "Authorization": `Bearer ${token}` } });
    if (r.ok) setScripts(await r.json());
    setLoading(false);
  };
  useEffect(() => { if (token) fetchAll(); /* eslint-disable-line */ }, [token]);

  const openNew = () => setEditing({ ...emptyDraft, sortOrder: scripts.length });
  const openEdit = (s: DbScript) => setEditing({ ...emptyDraft, ...s });

  const handleDelete = async (s: DbScript) => {
    if (!confirm(`Excluir permanentemente "${s.title}"?`)) return;
    const r = await apiFetch(`/api/admin/scripts/${s.id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
    if (r.ok) { onToast("Script excluído.", "success"); fetchAll(); }
    else { const d = await r.json(); onToast(d?.error || "Erro.", "error"); }
  };

  const handleDuplicate = async (s: DbScript) => {
    const r = await apiFetch(`/api/admin/scripts/${s.id}/duplicate`, { method: "POST", headers: { "Authorization": `Bearer ${token}` } });
    if (r.ok) { onToast("Plataforma duplicada (desativada).", "success"); fetchAll(); }
    else onToast("Erro ao duplicar.", "error");
  };

  const toggleActive = async (s: DbScript) => {
    const r = await apiFetch(`/api/admin/scripts/${s.id}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    if (r.ok) { onToast(s.active ? "Plataforma desativada." : "Plataforma ativada.", "success"); fetchAll(); }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...scripts];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setScripts(next);
    await apiFetch("/api/admin/scripts/reorder", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((s) => s.id) }),
    });
  };

  const saveDraft = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.content?.toString().trim()) {
      onToast("Título e script são obrigatórios.", "warning"); return;
    }
    setSaving(true);
    const payload = {
      title: editing.title, content: editing.content, description: editing.shortDescription,
      shortDescription: editing.shortDescription, longDescription: editing.longDescription,
      tutorial: editing.tutorial, icon: editing.icon, status: editing.status, accentColor: editing.accentColor,
      images: editing.images, notices: editing.notices, extras: editing.extras,
      sortOrder: editing.sortOrder, active: editing.active,
    };
    const url = editing.id ? `/api/admin/scripts/${editing.id}` : "/api/admin/scripts";
    const method = editing.id ? "PUT" : "POST";
    const r = await apiFetch(url, {
      method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (r.ok) { onToast(editing.id ? "Plataforma atualizada." : "Plataforma criada.", "success"); setEditing(null); fetchAll(); }
    else { const d = await r.json(); onToast(d?.error || "Erro ao salvar.", "error"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-white">Plataformas e Scripts</h3>
          <p className="text-xs text-[#666666]">Gestão completa do catálogo premium.</p>
        </div>
        <button
          onClick={openNew}
          className="bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" /> Nova plataforma
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0,1,2,3].map((i) => (
            <div key={i} className="h-44 rounded-[28px] bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scripts.map((s, idx) => {
            const Icon = PLATFORM_ICONS[s.icon] || PLATFORM_ICONS.Terminal;
            const status = STATUS_META[s.status] ?? STATUS_META.online;
            return (
              <div key={s.id} className={`rounded-[28px] border bg-[#0a0a0a] p-5 flex flex-col gap-4 transition-all ${s.active ? "border-[#1f1f1f]" : "border-[#1a1a1a] opacity-60"}`}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white truncate">{s.title}</h4>
                      <span className={`text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded-md border ${status.cls}`}>{status.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{s.shortDescription || s.description || "—"}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                      <span>{s.images?.length || 0} img</span>
                      <span>{s.notices?.length || 0} avisos</span>
                      {s.extras?.version && <span>v{s.extras.version}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
                  <button onClick={() => openEdit(s)} className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-white inline-flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={() => handleDuplicate(s)} className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-white inline-flex items-center gap-1.5">
                    <CopyIcon className="w-3.5 h-3.5" /> Duplicar
                  </button>
                  <button onClick={() => toggleActive(s)} className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-white inline-flex items-center gap-1.5">
                    {s.active ? <><EyeOff className="w-3.5 h-3.5" /> Desativar</> : <><Eye className="w-3.5 h-3.5" /> Ativar</>}
                  </button>
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => move(idx, 1)} disabled={idx === scripts.length - 1} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
          {scripts.length === 0 && (
            <div className="md:col-span-2 text-center py-14 text-zinc-500 border border-dashed border-white/10 rounded-[28px]">
              Nenhuma plataforma cadastrada ainda.
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <DraftEditor
            draft={editing}
            saving={saving}
            onChange={setEditing as any}
            onCancel={() => setEditing(null)}
            onSave={saveDraft}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============= Draft Editor (fullscreen modal) =============

function DraftEditor({ draft, saving, onChange, onCancel, onSave }: {
  draft: Draft; saving: boolean;
  onChange: (d: Draft) => void; onCancel: () => void; onSave: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"basic" | "long" | "tutorial" | "images" | "notices" | "extras" | "script">("basic");

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => onChange({ ...draft, [k]: v });
  const setExtras = (k: string, v: string) => onChange({ ...draft, extras: { ...draft.extras, [k]: v } });

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next = [...draft.images];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      try { next.push(await fileToDataUrl(f)); } catch {}
    }
    set("images", next);
  };

  return (
    <motion.div
      key="editor"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl overflow-y-auto"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-screen"
      >
        <div className="sticky top-0 z-10 backdrop-blur-2xl bg-black/70 border-b border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0"><Pencil className="w-4 h-4 text-white" /></div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white truncate">{draft.id ? "Editar plataforma" : "Nova plataforma"}</h3>
                <p className="text-[11px] uppercase tracking-widest font-mono text-zinc-500 mt-0.5">Editor avançado</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onCancel} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"><X className="w-4 h-4" /></button>
              <button onClick={onSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 inline-flex items-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 overflow-x-auto">
            <div className="flex gap-1 pb-2">
              {([
                ["basic", "Básico"], ["long", "Descrição"], ["tutorial", "Tutorial"],
                ["images", "Imagens"], ["notices", "Avisos"], ["extras", "Extras"], ["script", "Script"],
              ] as const).map(([k, lbl]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    tab === k ? "bg-white text-black" : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >{lbl}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {tab === "basic" && (
            <div className="space-y-5">
              <Field label="Nome da plataforma">
                <input type="text" value={draft.title} onChange={(e) => set("title", e.target.value)} className={inputCls} placeholder="Ex: Khan Academy" />
              </Field>
              <Field label="Descrição curta (1 linha)">
                <input type="text" value={draft.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={inputCls} placeholder="Aparece no card e no cabeçalho" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Ícone">
                  <select value={draft.icon} onChange={(e) => set("icon", e.target.value)} className={inputCls}>
                    {PLATFORM_ICON_LIST.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={draft.status} onChange={(e) => set("status", e.target.value as ScriptStatus)} className={inputCls}>
                    <option value="online">Online</option>
                    <option value="updated">Atualizado</option>
                    <option value="maintenance">Em manutenção</option>
                    <option value="offline">Offline</option>
                  </select>
                </Field>
                <Field label="Cor de destaque (hex, opcional)">
                  <div className="flex items-center gap-2">
                    <input type="color" value={draft.accentColor || "#ffffff"} onChange={(e) => set("accentColor", e.target.value)} className="h-11 w-14 rounded-lg bg-transparent border border-white/10 cursor-pointer" />
                    <input type="text" value={draft.accentColor || ""} onChange={(e) => set("accentColor", e.target.value || null)} className={inputCls} placeholder="#7c3aed" />
                  </div>
                </Field>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} className="w-4 h-4 accent-white" />
                <span className="text-sm text-zinc-300">Ativa (visível para os usuários)</span>
              </label>
            </div>
          )}

          {tab === "long" && (
            <MarkdownPair label="Descrição completa" value={draft.longDescription} onChange={(v) => set("longDescription", v)} placeholder="Use **negrito**, listas, títulos `#`, links [texto](url)..." />
          )}
          {tab === "tutorial" && (
            <MarkdownPair label="Tutorial passo a passo" value={draft.tutorial} onChange={(v) => set("tutorial", v)} placeholder="### Passo 1...\n\n![imagem](url)\n\n### Passo 2..." />
          )}
          {tab === "script" && (
            <Field label="Conteúdo do script (visível apenas para admin)">
              <textarea value={draft.content || ""} onChange={(e) => set("content", e.target.value)} rows={16} className={`${inputCls} font-mono text-[12px] resize-y`} placeholder="javascript:(function(){...})();" />
            </Field>
          )}

          {tab === "images" && (
            <div className="space-y-4">
              <div
                className="rounded-2xl border-2 border-dashed border-white/15 hover:border-white/30 bg-white/[0.02] p-8 text-center cursor-pointer transition-all"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              >
                <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-300">Clique ou arraste imagens (jpg, png, webp)</p>
                <p className="text-[11px] text-zinc-500 mt-1">São redimensionadas para 1400px e otimizadas automaticamente.</p>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </div>
              {draft.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {draft.images.map((img, i) => (
                    <div key={i} className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black">
                      <img src={img} alt="" className="w-full aspect-video object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                        <button onClick={() => { const next = [...draft.images]; if (i > 0) { [next[i], next[i - 1]] = [next[i - 1], next[i]]; set("images", next); } }} className="p-2 rounded-lg bg-white/10 border border-white/20 text-white"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { const next = [...draft.images]; if (i < next.length - 1) { [next[i], next[i + 1]] = [next[i + 1], next[i]]; set("images", next); } }} className="p-2 rounded-lg bg-white/10 border border-white/20 text-white"><ArrowDown className="w-3.5 h-3.5" /></button>
                        <button onClick={() => set("images", draft.images.filter((_, j) => j !== i))} className="p-2 rounded-lg bg-rose-500/30 border border-rose-500/40 text-white"><Trash className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "notices" && (
            <div className="space-y-3">
              {draft.notices.map((n, i) => (
                <div key={n.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <div className="flex gap-2">
                    <select value={n.type} onChange={(e) => { const next = [...draft.notices]; next[i] = { ...n, type: e.target.value as ScriptNotice["type"] }; set("notices", next); }} className={`${inputCls} max-w-[180px]`}>
                      <option value="info">Informativo</option>
                      <option value="success">Sucesso</option>
                      <option value="warning">Atenção</option>
                      <option value="critical">Crítico</option>
                    </select>
                    <input type="text" value={n.title} onChange={(e) => { const next = [...draft.notices]; next[i] = { ...n, title: e.target.value }; set("notices", next); }} placeholder="Título do aviso" className={inputCls} />
                    <button onClick={() => set("notices", draft.notices.filter((_, j) => j !== i))} className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300"><Trash className="w-4 h-4" /></button>
                  </div>
                  <textarea value={n.body} onChange={(e) => { const next = [...draft.notices]; next[i] = { ...n, body: e.target.value }; set("notices", next); }} rows={2} placeholder="Mensagem do aviso" className={`${inputCls} resize-y`} />
                </div>
              ))}
              <button onClick={() => set("notices", [...draft.notices, { id: Math.random().toString(36).slice(2), type: "info", title: "", body: "" }])} className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-sm font-semibold text-white inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Novo aviso
              </button>
            </div>
          )}

          {tab === "extras" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ["compatibility", "Compatibilidade"],
                ["browsers", "Navegadores suportados"],
                ["version", "Versão"],
                ["lastUpdate", "Última atualização"],
                ["estimatedTime", "Tempo estimado"],
                ["notes", "Observações"],
              ] as const).map(([k, lbl]) => (
                <Field key={k} label={lbl}>
                  <input type="text" value={(draft.extras as any)[k] || ""} onChange={(e) => setExtras(k, e.target.value)} className={inputCls} />
                </Field>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

const inputCls = "w-full bg-[#0e0e0e] border border-[#222] focus:border-[#444] rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-[#555] outline-none transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-widest text-[#666] mb-2">{label}</label>
      {children}
    </div>
  );
}

function MarkdownPair({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [mode, setMode] = useState<"edit" | "split" | "preview">("split");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="text-[10px] font-mono uppercase tracking-widest text-[#666]">{label}</label>
        <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-1">
          {(["edit", "split", "preview"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`px-3 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider ${mode === m ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>
              {m === "edit" ? "Editar" : m === "split" ? "Dividido" : "Pré-visualizar"}
            </button>
          ))}
        </div>
      </div>
      <div className={`grid gap-3 ${mode === "split" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        {mode !== "preview" && (
          <textarea
            value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            rows={20}
            className="w-full bg-[#0a0a0a] border border-[#222] focus:border-[#444] rounded-2xl py-4 px-5 text-sm text-white placeholder-[#555] font-mono outline-none transition-all resize-y"
          />
        )}
        {mode !== "edit" && (
          <div className="rounded-2xl border border-[#222] bg-[#080808] p-5 overflow-auto" style={{ maxHeight: 600 }}>
            <MarkdownView source={value || ""} />
          </div>
        )}
      </div>
    </div>
  );
}
