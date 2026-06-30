import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Save, Eye, Loader2, Plus, Trash2, ImagePlus, GripVertical, Check,
  AlertTriangle, Info, RefreshCw, Wrench,
} from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AdminScript, ScriptImage, ScriptNotice, ScriptExtras, PlatformStatus } from "@/lib/scriptando-db";
import { COMMON_ICON_NAMES, getLucideIcon } from "@/components/scripts/iconRegistry";
import ScriptDetailModal from "@/components/scripts/ScriptDetailModal";
import MarkdownView from "@/components/scripts/MarkdownView";

const TABS = ["Geral", "Mídia", "Descrição", "Tutorial", "Avisos", "Extras", "Script"] as const;
type TabName = typeof TABS[number];

interface Props {
  script: AdminScript;
  onClose: () => void;
  onSave: (patch: Partial<AdminScript>) => Promise<AdminScript | null>;
}

export default function PlatformEditor({ script, onClose, onSave }: Props) {
  const [tab, setTab] = useState<TabName>("Geral");
  const [form, setForm] = useState<AdminScript>(script);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initial = useRef(true);

  // Auto-save (debounced)
  useEffect(() => {
    if (initial.current) { initial.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      const updated = await onSave(form);
      setSaving(false);
      if (updated) setSavedAt(new Date());
    }, 1200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !previewing) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, previewing]);

  const set = <K extends keyof AdminScript>(k: K, v: AdminScript[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setExtras = (patch: Partial<ScriptExtras>) => setForm((f) => ({ ...f, extras: { ...f.extras, ...patch } }));

  const Icon = getLucideIcon(form.icon);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-stretch sm:items-center justify-end sm:justify-center"
      >
        <motion.div
          initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-4xl h-full sm:h-[92vh] sm:rounded-[28px] bg-[#0a0a0a] border border-white/10 overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] backdrop-blur-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white truncate">{form.title || "Nova plataforma"}</h2>
                <p className="text-[11px] text-white/40 font-mono">
                  {saving ? "Salvando..." : savedAt ? `Salvo às ${savedAt.toLocaleTimeString("pt-BR")}` : "Edições serão salvas automaticamente"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewing(true)}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 transition-all"
              ><Eye className="w-4 h-4" /> Pré-visualizar</button>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white"
              ><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 sm:px-6 border-b border-white/10 bg-black/40 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${
                    tab === t ? "text-white" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {t}
                  {tab === t && (
                    <motion.span layoutId="editor-tab" className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            {tab === "Geral" && (
              <GeneralTab form={form} set={set} />
            )}
            {tab === "Mídia" && (
              <MediaTab images={form.images} onChange={(imgs) => set("images", imgs)} />
            )}
            {tab === "Descrição" && (
              <MarkdownEditor
                label="Descrição completa"
                hint="O que faz, como funciona, benefícios, recursos. Suporta Markdown."
                value={form.longDescription}
                onChange={(v) => set("longDescription", v)}
              />
            )}
            {tab === "Tutorial" && (
              <MarkdownEditor
                label="Tutorial passo a passo"
                hint="Passos numerados, imagens entre os passos, avisos e destaques. Use `![alt](url)` para inserir imagens da galeria."
                value={form.tutorial}
                onChange={(v) => set("tutorial", v)}
              />
            )}
            {tab === "Avisos" && (
              <NoticesTab notices={form.notices} onChange={(n) => set("notices", n)} />
            )}
            {tab === "Extras" && (
              <ExtrasTab extras={form.extras} setExtras={setExtras} />
            )}
            {tab === "Script" && (
              <ScriptTab value={form.content} onChange={(v) => set("content", v)} />
            )}
          </div>
        </motion.div>

        {previewing && (
          <ScriptDetailModal script={form} open={true} onClose={() => setPreviewing(false)} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ============ Tabs ============

function GeneralTab({ form, set }: { form: AdminScript; set: <K extends keyof AdminScript>(k: K, v: AdminScript[K]) => void }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <Field label="Nome da plataforma">
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ex: Khan Academy"
          className="input-dark"
        />
      </Field>

      <Field label="Descrição curta" hint="Aparece no card da biblioteca (1 linha).">
        <input
          value={form.shortDescription}
          onChange={(e) => set("shortDescription", e.target.value)}
          placeholder="Resolve qualquer questão em segundos"
          className="input-dark"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as PlatformStatus)}
            className="input-dark"
          >
            <option value="online">Online</option>
            <option value="updated">Atualizado</option>
            <option value="maintenance">Em manutenção</option>
            <option value="offline">Offline</option>
          </select>
        </Field>

        <Field label="Cor de destaque (opcional)">
          <div className="flex gap-2">
            <input
              type="color"
              value={form.accentColor || "#ffffff"}
              onChange={(e) => set("accentColor", e.target.value)}
              className="w-12 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer"
            />
            <input
              value={form.accentColor || ""}
              onChange={(e) => set("accentColor", e.target.value || null)}
              placeholder="#ffffff"
              className="input-dark flex-1"
            />
            {form.accentColor && (
              <button onClick={() => set("accentColor", null)} className="px-3 rounded-xl border border-white/10 text-white/60 hover:text-white text-xs">Limpar</button>
            )}
          </div>
        </Field>
      </div>

      <Field label="Ícone">
        <IconPicker value={form.icon} onChange={(v) => set("icon", v)} />
      </Field>

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
        <div>
          <div className="text-sm font-medium text-white">Plataforma ativa</div>
          <div className="text-xs text-white/50">Quando desativada, deixa de aparecer para os usuários.</div>
        </div>
        <button
          type="button"
          onClick={() => set("active", !form.active)}
          className={`w-12 h-7 rounded-full transition-colors relative ${form.active ? "bg-white" : "bg-white/15"}`}
        >
          <span className={`absolute top-0.5 ${form.active ? "left-6" : "left-0.5"} w-6 h-6 rounded-full bg-black transition-all`} />
        </button>
      </div>
    </div>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState("");
  const all = [...new Set([value, ...COMMON_ICON_NAMES])].filter((n) => n.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar ícone... (também aceita digitar nome livre)"
        className="input-dark mb-3"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Terminal"
        className="input-dark mb-3 font-mono text-xs"
      />
      <div className="max-h-56 overflow-y-auto grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 rounded-2xl border border-white/10 bg-black/30">
        {all.slice(0, 80).map((n) => {
          const Ic = getLucideIcon(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              title={n}
              className={`aspect-square rounded-xl border flex items-center justify-center transition-all ${
                value === n ? "border-white bg-white/10 text-white" : "border-white/5 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white"
              }`}
            >
              <Ic className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MediaTab({ images, onChange }: { images: ScriptImage[]; onChange: (i: ScriptImage[]) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || "");
        onChange([...images, { url, caption: "" }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInput.current?.click()}
        className="cursor-pointer rounded-3xl border-2 border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/30 p-10 text-center transition-all"
      >
        <ImagePlus className="w-10 h-10 mx-auto mb-3 text-white/50" />
        <p className="text-white font-medium">Arraste imagens aqui ou clique para enviar</p>
        <p className="text-xs text-white/50 mt-1">PNG, JPG ou WEBP — múltiplas imagens permitidas</p>
        <input
          ref={fileInput} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {images.length > 0 && (
        <div className="space-y-3">
          {images.map((img, i) => (
            <div key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <img src={img.url} alt="" className="w-24 h-24 object-cover rounded-xl border border-white/10" />
              <div className="flex-1 flex flex-col gap-2">
                <input
                  value={img.caption || ""}
                  onChange={(e) => {
                    const next = [...images]; next[i] = { ...img, caption: e.target.value }; onChange(next);
                  }}
                  placeholder="Legenda (opcional)"
                  className="input-dark text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={() => move(i, i - 1)} disabled={i === 0} className="px-3 py-1.5 rounded-lg border border-white/10 text-white/70 hover:text-white text-xs disabled:opacity-30">↑</button>
                  <button onClick={() => move(i, i + 1)} disabled={i === images.length - 1} className="px-3 py-1.5 rounded-lg border border-white/10 text-white/70 hover:text-white text-xs disabled:opacity-30">↓</button>
                  <button onClick={() => onChange(images.filter((_, j) => j !== i))} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-300 hover:text-rose-200 text-xs">
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarkdownEditor({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (before: string, after = before) => {
    const el = ref.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = value.slice(s, e);
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, e + before.length); });
  };
  const prefix = (p: string) => {
    const el = ref.current; if (!el) return;
    const s = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const next = value.slice(0, lineStart) + p + value.slice(lineStart);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">{label}</h3>
        {hint && <p className="text-xs text-white/45 mt-0.5">{hint}</p>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "B", cb: () => wrap("**"), title: "Negrito" },
          { label: "I", cb: () => wrap("*"), title: "Itálico" },
          { label: "H2", cb: () => prefix("## "), title: "Título" },
          { label: "H3", cb: () => prefix("### "), title: "Subtítulo" },
          { label: "• Lista", cb: () => prefix("- "), title: "Lista" },
          { label: "1. Lista", cb: () => prefix("1. "), title: "Numerada" },
          { label: "Link", cb: () => wrap("[", "](https://)"), title: "Link" },
          { label: "Citação", cb: () => prefix("> "), title: "Citação" },
          { label: "Imagem", cb: () => wrap("![", "](url)"), title: "Imagem" },
          { label: "Linha", cb: () => onChange(value + "\n\n---\n\n"), title: "Separador" },
        ].map((b) => (
          <button key={b.label} type="button" title={b.title} onClick={b.cb}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80">{b.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={18}
          placeholder="Escreva em Markdown..."
          className="input-dark font-mono text-sm leading-relaxed resize-none min-h-[420px]"
        />
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 overflow-y-auto max-h-[60vh]">
          {value.trim() ? (
            <MarkdownView source={value} />
          ) : (
            <p className="text-xs text-white/40 italic">Pré-visualização aparecerá aqui.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function NoticesTab({ notices, onChange }: { notices: ScriptNotice[]; onChange: (n: ScriptNotice[]) => void }) {
  const types: { value: ScriptNotice["type"]; label: string; Icon: any }[] = [
    { value: "info", label: "Informação", Icon: Info },
    { value: "warning", label: "Aviso", Icon: AlertTriangle },
    { value: "update", label: "Atualização", Icon: RefreshCw },
    { value: "maintenance", label: "Manutenção", Icon: Wrench },
  ];
  return (
    <div className="space-y-4 max-w-3xl">
      {notices.map((n, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
          <div className="flex items-center gap-3">
            <select
              value={n.type}
              onChange={(e) => {
                const next = [...notices]; next[i] = { ...n, type: e.target.value as ScriptNotice["type"] }; onChange(next);
              }}
              className="input-dark w-auto"
            >
              {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              value={n.title}
              onChange={(e) => { const next = [...notices]; next[i] = { ...n, title: e.target.value }; onChange(next); }}
              placeholder="Título do aviso"
              className="input-dark flex-1"
            />
            <button onClick={() => onChange(notices.filter((_, j) => j !== i))} className="p-2 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-300">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={n.message}
            onChange={(e) => { const next = [...notices]; next[i] = { ...n, message: e.target.value }; onChange(next); }}
            placeholder="Mensagem do aviso..."
            rows={2}
            className="input-dark text-sm resize-none"
          />
        </div>
      ))}
      <button
        onClick={() => onChange([...notices, { type: "info", title: "", message: "" }])}
        className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-white/70 hover:text-white hover:border-white/40 text-sm inline-flex items-center justify-center gap-2"
      ><Plus className="w-4 h-4" /> Adicionar aviso</button>
    </div>
  );
}

function ExtrasTab({ extras, setExtras }: { extras: ScriptExtras; setExtras: (p: Partial<ScriptExtras>) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
      <Field label="Compatibilidade"><input className="input-dark" value={extras.compatibility || ""} onChange={(e) => setExtras({ compatibility: e.target.value })} placeholder="Ex: Mobile & Desktop" /></Field>
      <Field label="Navegadores"><input className="input-dark" value={extras.browsers || ""} onChange={(e) => setExtras({ browsers: e.target.value })} placeholder="Chrome, Safari, Edge" /></Field>
      <Field label="Versão"><input className="input-dark" value={extras.version || ""} onChange={(e) => setExtras({ version: e.target.value })} placeholder="4.0.2" /></Field>
      <Field label="Última atualização"><input className="input-dark" value={extras.lastUpdate || ""} onChange={(e) => setExtras({ lastUpdate: e.target.value })} placeholder="30 de junho de 2026" /></Field>
      <Field label="Duração estimada"><input className="input-dark" value={extras.duration || ""} onChange={(e) => setExtras({ duration: e.target.value })} placeholder="< 30 segundos" /></Field>
      <Field label="Observações adicionais" className="sm:col-span-2">
        <textarea className="input-dark resize-none" rows={3} value={extras.notes || ""} onChange={(e) => setExtras({ notes: e.target.value })} placeholder="Notas livres..." />
      </Field>
    </div>
  );
}

function ScriptTab({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3 text-amber-200">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <strong className="font-semibold">Privado.</strong> Este conteúdo é exibido apenas para administradores. Usuários finais nunca conseguem visualizar este script — apenas copiá-lo via botão.
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={20}
        placeholder="javascript:(function(){...})();"
        className="input-dark font-mono text-xs leading-relaxed resize-none min-h-[480px]"
        spellCheck={false}
      />
    </div>
  );
}

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className || ""}`}>
      <div className="text-[11px] font-mono uppercase tracking-widest text-white/45 mb-2">{label}</div>
      {children}
      {hint && <div className="text-[11px] text-white/40 mt-1.5">{hint}</div>}
    </label>
  );
}
