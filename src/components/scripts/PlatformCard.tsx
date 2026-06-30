import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import type { DbScript } from "@/lib/scriptando-db";
import { getLucideIcon } from "./iconRegistry";

interface Props {
  script: DbScript;
  onOpen: () => void;
  index?: number;
}

const STATUS_META: Record<string, { label: string; dot: string; ring: string }> = {
  online:      { label: "Online",        dot: "bg-emerald-400", ring: "ring-emerald-400/30" },
  updated:     { label: "Atualizado",    dot: "bg-sky-400",     ring: "ring-sky-400/30" },
  maintenance: { label: "Em manutenção", dot: "bg-amber-400",   ring: "ring-amber-400/30" },
  offline:     { label: "Offline",       dot: "bg-rose-400",    ring: "ring-rose-400/30" },
};

export default function PlatformCard({ script, onOpen, index = 0 }: Props) {
  const Icon = getLucideIcon(script.icon);
  const status = STATUS_META[script.status] ?? STATUS_META.online;
  const short = script.shortDescription || script.description || "Plataforma premium pronta para uso.";
  const accent = script.accentColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.55, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className="group relative cursor-pointer rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-7 transition-all duration-300 hover:border-white/25 hover:bg-white/[0.05] hover:shadow-[0_20px_60px_-15px_rgba(255,255,255,0.15)] overflow-hidden"
    >
      {/* subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />
      {/* accent glow */}
      {accent && (
        <div
          className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none transition-opacity group-hover:opacity-40"
          style={{ background: accent }}
        />
      )}

      <div className="flex items-start justify-between gap-4 mb-6 relative z-10">
        <div
          className="w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl flex items-center justify-center text-white shadow-inner"
          style={accent ? { borderColor: `${accent}40`, background: `${accent}10` } : undefined}
        >
          <Icon className="w-7 h-7" strokeWidth={1.5} />
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 ring-1 ${status.ring}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
          <span className="text-[10px] font-medium text-white/80 uppercase tracking-wider">{status.label}</span>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-white tracking-tight mb-2 relative z-10">
        {script.title}
      </h3>
      <p className="text-sm text-white/55 leading-relaxed line-clamp-2 min-h-[40px] mb-6 relative z-10">
        {short}
      </p>

      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/35 font-mono">
          {script.extras?.version ? `v${script.extras.version}` : "Premium"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white group-hover:gap-2.5 transition-all">
          Abrir
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </motion.div>
  );
}
