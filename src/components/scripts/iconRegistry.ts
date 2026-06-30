import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function getLucideIcon(name?: string | null): LucideIcon {
  if (!name) return Icons.Terminal;
  const key = name.trim();
  // direct hit
  const lib = Icons as unknown as Record<string, unknown>;
  const direct = lib[key];
  if (typeof direct === "function" || typeof direct === "object") return direct as LucideIcon;
  // pascal-case attempt
  const pascal = key.replace(/(^|[-_\s])(\w)/g, (_m, _s, c: string) => c.toUpperCase());
  const found = lib[pascal];
  if (typeof found === "function" || typeof found === "object") return found as LucideIcon;
  return Icons.Terminal;
}

export const COMMON_ICON_NAMES = [
  "Terminal", "Code", "Code2", "FileCode", "Brain", "Sparkles", "Zap",
  "GraduationCap", "BookOpen", "Book", "BookMarked", "Library", "School",
  "Globe", "Languages", "PenLine", "PenTool", "ScrollText", "FileText",
  "Calculator", "Atom", "FlaskConical", "Beaker", "Microscope",
  "Trophy", "Target", "Crosshair", "Flame", "Rocket", "Star",
  "Smartphone", "Laptop", "Monitor", "MousePointer", "Keyboard",
  "Lock", "Shield", "ShieldCheck", "Key", "Bot", "Cpu",
];
