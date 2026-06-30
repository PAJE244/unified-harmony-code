import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Copy, ChevronLeft, ChevronRight, Calendar, Monitor,
  Tag, Clock, Info, AlertTriangle, CheckCircle, ShieldAlert,
  ZoomIn, Loader2, FileCode,
} from "lucide-react";
import type { DbScript } from "@/lib/scriptando-db";
import { apiFetch } from "@/lib/scriptando-db";
import MarkdownView from "./MarkdownView";
import { PLATFORM_ICONS, STATUS_META } from "./platform-meta";

interface Props {
  script: DbScript | null;
  token: string | null;
  onClose: () => void;
  onToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

const noticeMeta: Record<string, { icon: any; cls: string }> = {
  info:     { icon: Info,         cls: "bg-white/[0.04] border-white/10 text-zinc-200" },
  success:  { icon: CheckCircle,  cls: "bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-200" },
  warning:  { icon: AlertTriangle,cls: "bg-amber-500/[0.06] border-amber-500/20 text-amber-200" },
  critical: { icon: ShieldAlert,  cls: "bg-rose-500/[0.06] border-rose-500/20 text-rose-200" },
};

function copyTextFallback(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("aria-hidden", "true");
  ta.style.position = "fixed"; ta.style.opacity = "0"; ta.style.pointerEvents = "none";
  document.body.appendChild(ta);
  ta.focus({ preventScroll: true }); ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

export default function PlatformDetailModal({ script, token, onClose, onToast }: Props) {
  const [gIndex, setGIndex] = useState(0);
  const [zoom, setZoom] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setGIndex(0); setCopied(false); }, [script?.id]);

  useEffect(() => {
    if (!script) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (zoom) setZoom(null); else onClose(); }
      if (e.key === "ArrowRight") setGIndex((i) => Math.min(i + 1, (script.images?.length || 1) - 1));
      if (e.key === "ArrowLeft") setGIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [script, zoom, onClose]);

  const status = useMemo(() => STATUS_META[script?.status || "online"] ?? STATUS_META.online, [script?.status]);
  const Icon = PLATFORM_ICONS[script?.icon || "Terminal"] || PLATFORM_ICONS.Terminal;

  const handleCopy = async () => {
    if (!script || copying) return;
    setCopying(true);
    try {
      const r = await apiFetch(`/api/scripts/${script.id}/copy`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (!r.ok) { onToast(data?.error || "Falha ao obter o script.", "error"); return; }
      const text = String(data?.content ?? "");
      if (!text.trim()) { onToast("Este script está vazio.", "warning"); return; }
      let ok = false;
      try {
        if (navigator.clipboard?.writeText && window.isSecureContext) {
          await navigator.clipboard.writeText(text); ok = true;
        }
      } catch { ok = false; }
      if (!ok) ok = copyTextFallback(text);
      if (ok) {
        setCopied(true);
        onToast("Script copiado com sucesso!", "success");
        setTimeout(() => setCopied(false), 2500);
      } else {
        onToast("Não foi possível copiar automaticamente.", "error");
      }
    } finally { setCopying(false); }
  };

  return (
    <AnimatePresence>
      {script && (
        <motion.div
          key="detail"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-screen w-full"
          >
            {/* Top bar */}
            <div className="sticky top-0 z-10 backdrop-blur-2xl bg-black/60 border-b border-white/5">
              <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center"
                    style={script.accentColor ? { boxShadow: `inset 0 0 0 1px ${script.accentColor}33` } : undefined}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white leading-none">{script.title}</h2>
                    <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-widest font-mono">Detalhes da plataforma</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-24">
              {/* Header card */}
              <motion.section
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="relative rounded-[32px] bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/10 p-6 sm:p-10 overflow-hidden"
                style={script.accentColor ? { boxShadow: `0 30px 80px -40px ${script.accentColor}55, inset 0 0 0 1px rgba(255,255,255,0.04)` } : undefined}
              >
                <div className="absolute inset-0 pointer-events-none opacity-[0.15]" style={{ background: script.accentColor ? `radial-gradient(60% 100% at 0% 0%, ${script.accentColor}, transparent 70%)` : undefined }} />
                <div className="relative flex flex-col md:flex-row md:items-center gap-8">
                  <div
                    className="w-24 h-24 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center backdrop-blur-xl shrink-0"
                    style={script.accentColor ? { boxShadow: `inset 0 0 0 1px ${script.accentColor}55` } : undefined}
                  >
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono px-2.5 py-1 rounded-md border ${status.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      {script.extras?.version && (
                        <span className="text-[10px] uppercase tracking-widest font-mono px-2.5 py-1 rounded-md border border-white/10 text-zinc-400">v{script.extras.version}</span>
                      )}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-white">{script.title}</h1>
                    <p className="text-[15px] text-zinc-400 leading-relaxed max-w-2xl">
                      {script.shortDescription || script.description || "Plataforma premium com automação otimizada."}
                    </p>
                    <div className="flex flex-wrap gap-3 pt-3 text-[11px] text-zinc-500 font-mono uppercase tracking-widest">
                      <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Atualizado em {new Date(script.updatedAt || script.createdAt).toLocaleDateString("pt-BR")}</span>
                      {script.extras?.compatibility && (
                        <span className="inline-flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> {script.extras.compatibility}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Notices */}
              {script.notices && script.notices.length > 0 && (
                <section className="space-y-3">
                  {script.notices.map((n) => {
                    const m = noticeMeta[n.type] || noticeMeta.info;
                    const N = m.icon;
                    return (
                      <div key={n.id} className={`rounded-2xl border p-4 flex gap-3 backdrop-blur-xl ${m.cls}`}>
                        <N className="w-5 h-5 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">{n.title}</p>
                          <p className="text-sm opacity-90 mt-0.5 leading-relaxed">{n.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}

              {/* Gallery */}
              {script.images && script.images.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs uppercase tracking-widest font-mono text-zinc-500">Galeria de demonstração</h3>
                    <span className="text-xs text-zinc-500 font-mono">{gIndex + 1} / {script.images.length}</span>
                  </div>
                  <div className="relative rounded-[28px] border border-white/10 bg-black/40 overflow-hidden aspect-[16/10] backdrop-blur-xl group">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={gIndex}
                        src={script.images[gIndex]}
                        alt={`Imagem ${gIndex + 1}`}
                        loading="lazy"
                        initial={{ opacity: 0, scale: 1.01 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="absolute inset-0 w-full h-full object-contain cursor-zoom-in"
                        onClick={() => setZoom(script.images[gIndex])}
                      />
                    </AnimatePresence>
                    <button
                      onClick={() => setZoom(script.images[gIndex])}
                      className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/60 border border-white/10 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                      aria-label="Ampliar"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    {script.images.length > 1 && (
                      <>
                        <button
                          onClick={() => setGIndex((i) => (i - 1 + script.images.length) % script.images.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-white/10 text-white/80 hover:text-white hover:bg-black/80 transition-all flex items-center justify-center backdrop-blur-xl"
                          aria-label="Anterior"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setGIndex((i) => (i + 1) % script.images.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-white/10 text-white/80 hover:text-white hover:bg-black/80 transition-all flex items-center justify-center backdrop-blur-xl"
                          aria-label="Próxima"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                  {script.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {script.images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setGIndex(i)}
                          className={`relative shrink-0 rounded-xl overflow-hidden border transition-all ${i === gIndex ? "border-white" : "border-white/10 hover:border-white/30"}`}
                          aria-label={`Imagem ${i + 1}`}
                        >
                          <img src={img} alt="" loading="lazy" className="w-20 h-14 object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Long description */}
              {(script.longDescription || script.description) && (
                <section className="space-y-3">
                  <h3 className="text-xs uppercase tracking-widest font-mono text-zinc-500">Sobre esta plataforma</h3>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-xl">
                    <MarkdownView source={script.longDescription || script.description} />
                  </div>
                </section>
              )}

              {/* Tutorial */}
              {script.tutorial && (
                <section className="space-y-3">
                  <h3 className="text-xs uppercase tracking-widest font-mono text-zinc-500">Tutorial de utilização</h3>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-xl">
                    <MarkdownView source={script.tutorial} />
                  </div>
                </section>
              )}

              {/* Extras */}
              {script.extras && Object.values(script.extras).some(Boolean) && (
                <section className="space-y-3">
                  <h3 className="text-xs uppercase tracking-widest font-mono text-zinc-500">Informações</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {([
                      ["Compatibilidade", script.extras.compatibility, Monitor],
                      ["Navegadores", script.extras.browsers, Monitor],
                      ["Versão", script.extras.version, Tag],
                      ["Última atualização", script.extras.lastUpdate, Calendar],
                      ["Tempo estimado", script.extras.estimatedTime, Clock],
                      ["Observações", script.extras.notes, Info],
                    ] as const).filter(([,v]) => v).map(([label, value, I]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-xl">
                        <p className="text-[10px] uppercase tracking-widest font-mono text-zinc-500 flex items-center gap-1.5 mb-1.5">
                          <I className="w-3 h-3" /> {label}
                        </p>
                        <p className="text-sm text-zinc-200 leading-snug">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sticky copy bar */}
            <div className="fixed bottom-0 inset-x-0 z-10 backdrop-blur-2xl bg-black/70 border-t border-white/5">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500 flex-1 min-w-0">
                  <FileCode className="w-4 h-4 shrink-0" />
                  <span className="truncate">O código permanece protegido — copiado direto para a área de transferência.</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCopy}
                  disabled={copying}
                  className={`relative px-6 sm:px-8 py-3.5 rounded-2xl font-semibold text-sm flex items-center gap-2.5 transition-all shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] ${
                    copied ? "bg-emerald-400 text-black" : "bg-white text-black hover:bg-zinc-100"
                  } ${copying ? "opacity-60 cursor-wait" : ""}`}
                >
                  {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copying ? "Copiando..." : copied ? "Copiado!" : "Copiar Script"}</span>
                </motion.button>
              </div>
            </div>

            {/* Zoom overlay */}
            <AnimatePresence>
              {zoom && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-6 cursor-zoom-out"
                  onClick={() => setZoom(null)}
                >
                  <motion.img
                    initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.98 }}
                    src={zoom} alt="" className="max-w-full max-h-full object-contain rounded-2xl"
                  />
                  <button
                    onClick={() => setZoom(null)}
                    className="absolute top-5 right-5 p-2.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
