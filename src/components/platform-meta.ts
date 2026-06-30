import {
  Terminal, BookOpen, GraduationCap, FileText, Globe2, Languages,
  Brain, Calculator, FlaskConical, Sparkles, Code2, Zap,
  Layers, Rocket, type LucideIcon,
} from "lucide-react";
import type { ScriptStatus } from "@/lib/scriptando-db";

/** Curated allow-list of lucide icons usable by the admin. */
export const PLATFORM_ICONS: Record<string, LucideIcon> = {
  Terminal, BookOpen, GraduationCap, FileText, Globe2, Languages,
  Brain, Calculator, FlaskConical, Sparkles, Code2, Zap,
  Layers, Rocket,
};

export const PLATFORM_ICON_LIST = Object.keys(PLATFORM_ICONS);

export const STATUS_META: Record<ScriptStatus, { label: string; cls: string; dot: string }> = {
  online:      { label: "Online",       cls: "border-emerald-400/30 text-emerald-300 bg-emerald-400/[0.05]", dot: "bg-emerald-400 shadow-[0_0_10px_#34d399]" },
  updated:     { label: "Atualizado",   cls: "border-sky-400/30 text-sky-300 bg-sky-400/[0.05]",             dot: "bg-sky-400 shadow-[0_0_10px_#38bdf8]" },
  maintenance: { label: "Em manutenção",cls: "border-amber-400/30 text-amber-300 bg-amber-400/[0.05]",       dot: "bg-amber-400 shadow-[0_0_10px_#fbbf24]" },
  offline:     { label: "Offline",      cls: "border-zinc-500/40 text-zinc-400 bg-white/[0.02]",             dot: "bg-zinc-500" },
};
