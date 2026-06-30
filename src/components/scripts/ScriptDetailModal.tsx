import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, ArrowLeft, Copy, Check, Loader2, AlertTriangle, Info, RefreshCw, Wrench,
  Calendar, Clock, Tag, Globe2, Monitor, ChevronDown,
} from "lucide-react";
import type { DbScript } from "@/lib/scriptando-db";
import { copyScriptToClipboard } from "@/lib/scriptando-db";
import { getLucideIcon } from "./iconRegistry";
import MarkdownView from "./MarkdownView";
import GalleryCarousel from "./GalleryCarousel";

interface Props {
  script: DbScript | null;
  open: boolean;
  onClose: () => void;
  onToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

const STATUS_META: Record<string, { label: string; dot: string }> = {
  online:      { label: "Online",        dot: "bg-emerald-400" },
  updated:     { label: "Atualizado",    dot: "bg-sky-400" },
  maintenance: { label: "Em manutenção", dot: "bg-amber-400" },
  offline:     { label: "Offline",       dot: "bg-rose-400" },
};

const NOTICE_META = {
  info:        { Icon: Info,           color: "from-sky-500/15 to-sky-500/0",      border: "border-sky-400/30",    text: "text-sky-200" },
  warning:     { Icon: AlertTriangle,  color: "from-amber-500/15 to-amber-500/0",  border: "border-amber-400/30",  text: "text-amber-200" },
  update:      { Icon: RefreshCw,      color: "from-violet-500/15 to-violet-500/0",border: "border-violet-400/30", text: "text-violet-200" },
  maintenance: { Icon: Wrench,         color: "from-rose-500/15 to-rose-500/0",    border: "border-rose-400/30",   text: "text-rose-200" },
} as const;

export default function ScriptDetailModal({ script, open, onClose, onToast }: Props) {
  const [copyState, setCopyState] = useState<"idle" | "loading" | "done" | "fail">("idle");

  useEffect(() => {
    if (!open) return;
    setCopyState("idle");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!script) return null;
  const Icon = getLucideIcon(script.icon);
  const status = STATUS_META[script.status] ?? STATUS_META.online;
  const accent = script.accentColor;
  const extras = script.extras || {};

  const handleCopy = async () => {
    setCopyState("loading");
    const ok = await copyScriptToClipboard(script.id);
    if (ok) {
      setCopyState("done");
      onToast?.("Script copiado com sucesso.", "success");
      setTimeout(() => setCopyState("idle"), 2400);
    } else {
      setCopyState("fail");
      onToast?.("Não foi possível copiar o script. Tente novamente.", "error");
      setTimeout(() => setCopyState("idle"), 2400);
    }
  };

  const updatedFmt = script.updatedAt
    ? new Date(script.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xl overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.99 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative min-h-screen w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12"
          >
            {/* Top bar */}
            <div className="sticky top-0 z-20 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 bg-black/60 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between mb-8">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar à biblioteca
              </button>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
              ><X className="w-4 h-4" /></button>
            </div>

            {/* Header */}
            <section className="relative rounded-[32px] border border-white/10 bg-white/[0.035] backdrop-blur-2xl p-8 sm:p-10 mb-8 overflow-hidden">
              {accent && (
                <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none"
                     style={{ background: accent }} />
              )}
              <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                <div
                  className="w-20 h-20 rounded-3xl border border-white/15 bg-white/[0.04] flex items-center justify-center shrink-0 shadow-2xl"
                  style={accent ? { borderColor: `${accent}50`, background: `${accent}15` } : undefined}
                >
                  <Icon className="w-10 h-10 text-white" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/80">{status.label}</span>
                    </div>
                    {extras.version && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-white/70">
                        <Tag className="w-3 h-3" /> v{extras.version}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-white/70">
                      <Calendar className="w-3 h-3" /> {updatedFmt}
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">{script.title}</h1>
                  {(script.shortDescription || script.description) && (
                    <p className="mt-3 text-white/60 text-base leading-relaxed max-w-2xl">
                      {script.shortDescription || script.description}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Notices */}
            {script.notices && script.notices.length > 0 && (
              <section className="mb-8 space-y-3">
                {script.notices.map((n, i) => {
                  const meta = NOTICE_META[n.type] ?? NOTICE_META.info;
                  return (
                    <div key={i} className={`rounded-2xl border ${meta.border} bg-gradient-to-r ${meta.color} backdrop-blur-xl p-5 flex gap-4`}>
                      <meta.Icon className={`w-5 h-5 ${meta.text} shrink-0 mt-0.5`} />
                      <div className="flex-1">
                        {n.title && <h4 className={`font-semibold ${meta.text} mb-1`}>{n.title}</h4>}
                        <p className="text-sm text-white/80 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Gallery */}
            {script.images && script.images.length > 0 && (
              <Section title="Galeria de demonstração">
                <GalleryCarousel images={script.images} />
              </Section>
            )}

            {/* Long description */}
            {script.longDescription && (
              <Section title="Sobre esta automação">
                <div className="rounded-3xl border border-white/10 bg-white/[0.025] backdrop-blur-2xl p-8">
                  <MarkdownView source={script.longDescription} />
                </div>
              </Section>
            )}

            {/* Tutorial */}
            {script.tutorial && (
              <Section title="Tutorial de utilização">
                <div className="rounded-3xl border border-white/10 bg-white/[0.025] backdrop-blur-2xl p-8">
                  <MarkdownView source={script.tutorial} />
                </div>
              </Section>
            )}

            {/* Copy script — primary action */}
            <Section title="Utilizar script">
              <div className="relative rounded-[32px] border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl p-8 sm:p-10 overflow-hidden">
                <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">Pronto para executar</h3>
                    <p className="text-white/60 text-sm leading-relaxed max-w-md">
                      O conteúdo do script é enviado diretamente para sua área de transferência. Por segurança, ele nunca aparece em tela.
                    </p>
                  </div>
                  <button
                    onClick={handleCopy}
                    disabled={copyState === "loading"}
                    className="group relative inline-flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-white text-black font-semibold text-base shadow-2xl hover:shadow-white/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 min-w-[220px]"
                  >
                    <AnimatePresence mode="wait">
                      {copyState === "loading" && (
                        <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" /> Copiando...
                        </motion.span>
                      )}
                      {copyState === "done" && (
                        <motion.span key="d" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2 text-emerald-600">
                          <Check className="w-5 h-5" /> Copiado!
                        </motion.span>
                      )}
                      {copyState === "fail" && (
                        <motion.span key="f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2 text-rose-600">
                          <AlertTriangle className="w-5 h-5" /> Tentar novamente
                        </motion.span>
                      )}
                      {copyState === "idle" && (
                        <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2">
                          <Copy className="w-5 h-5" /> Copiar Script
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>
            </Section>

            {/* Extras */}
            {(extras.compatibility || extras.browsers || extras.version || extras.lastUpdate || extras.duration || extras.notes) && (
              <Section title="Informações adicionais">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {extras.compatibility && <ExtraCard icon={Monitor}   label="Compatibilidade" value={extras.compatibility} />}
                  {extras.browsers      && <ExtraCard icon={Globe2}    label="Navegadores"     value={extras.browsers} />}
                  {extras.version       && <ExtraCard icon={Tag}       label="Versão"          value={`v${extras.version}`} />}
                  {extras.lastUpdate    && <ExtraCard icon={Calendar}  label="Atualizado"      value={extras.lastUpdate} />}
                  {extras.duration      && <ExtraCard icon={Clock}     label="Duração"         value={extras.duration} />}
                  {extras.notes         && <ExtraCard icon={Info}      label="Observações"     value={extras.notes} />}
                </div>
              </Section>
            )}

            <div className="h-16" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40 mb-4 pl-1">{title}</h2>
      {children}
    </section>
  );
}

function ExtraCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-white/70" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">{label}</div>
        <div className="text-sm text-white/85 break-words">{value}</div>
      </div>
    </div>
  );
}
