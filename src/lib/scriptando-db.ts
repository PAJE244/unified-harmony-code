// Client-side wrapper that talks to the Lovable Cloud-backed server function
// and uses Supabase Realtime broadcast for cross-device sync.
import { supabase } from "@/integrations/supabase/client";
import { apiCall } from "./scriptando-api.functions";

export type Role = "admin" | "user";
export type Status = "active" | "banned";

export interface DbUser {
  id: string;
  username: string;
  role: Role;
  status: Status;
  createdAt: string;
}
export interface PublicUser extends DbUser {}

export type ScriptStatus = "online" | "updated" | "maintenance" | "offline";

export interface ScriptNotice {
  id: string;
  type: "info" | "warning" | "success" | "critical";
  title: string;
  body: string;
}

export interface ScriptExtras {
  compatibility?: string;
  browsers?: string;
  version?: string;
  lastUpdate?: string;
  estimatedTime?: string;
  notes?: string;
}

export interface DbScript {
  id: string;
  title: string;
  /** Body is NEVER sent in list views — only via dedicated copy endpoint. */
  content?: string;
  description: string;
  shortDescription: string;
  longDescription: string;
  tutorial: string;
  icon: string;
  status: ScriptStatus;
  accentColor: string | null;
  images: string[];
  notices: ScriptNotice[];
  extras: ScriptExtras;
  sortOrder: number;
  active: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface DbLog {
  id: string;
  username: string;
  action: string;
  timestamp: string;
}

export interface SiteSettings {
  pixKey: string;
  pixAmount: string;
  pixName: string;
  pixCity: string;
  whatsappNumber: string;
  supportEmail: string;
  heroTitle: string;
  heroSubtitle: string;
  loteText: string;
  priceLabel: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  pixKey: "gabrieldacechen6@gmail.com",
  pixAmount: "9.90",
  pixName: "SCRIPTANDO PAJE",
  pixCity: "CURITIBA",
  whatsappNumber: "5547991295765",
  supportEmail: "gabrieldacechen6@gmail.com",
  heroTitle: "CANSADO DE PERDER TEMPO COM ATIVIDADES ESCOLARES?",
  heroSubtitle: "Automatize Khan Academy, Quizizz, Redação PR, Inglês PR e Leia PR em segundos.",
  loteText: "Últimos 37 acessos liberados por R$9,90. O valor sobe amanhã.",
  priceLabel: "R$9,90",
};

const isBrowser = () => typeof window !== "undefined";

// ============ Realtime bus ============
type RealtimeMsg =
  | { type: "stats_updated"; data: { totalCount: number; onlineCount: number } }
  | { type: "users_list_updated"; data: PublicUser[] }
  | { type: "logs_updated"; data: DbLog[] }
  | { type: "scripts_updated"; data: DbScript[] }
  | { type: "account_modified"; data: { passwordChanged: boolean; usernameChanged: boolean; user: PublicUser }; targetUserId: string }
  | { type: "account_deleted"; message: string; targetUserId: string }
  | { type: "account_banned"; message: string; targetUserId: string }
  | { type: "settings_updated"; data: SiteSettings };

const listeners = new Set<(msg: RealtimeMsg) => void>();
let channel: ReturnType<typeof supabase.channel> | null = null;

function ensureChannel() {
  if (!isBrowser() || channel) return;
  channel = supabase.channel("scriptando-bus", { config: { broadcast: { self: false } } });
  channel.on("broadcast", { event: "msg" }, (payload: any) => {
    const msg = payload?.payload as RealtimeMsg | undefined;
    if (!msg) return;
    if (msg.type === "settings_updated") _cachedSettings = msg.data;
    listeners.forEach((cb) => cb(msg));
  });
  channel.subscribe();
}

function emitLocalAndBroadcast(events: RealtimeMsg[] | undefined) {
  if (!events || !events.length) return;
  for (const msg of events) {
    if (msg.type === "settings_updated") _cachedSettings = msg.data;
    listeners.forEach((cb) => cb(msg));
    if (channel) {
      channel.send({ type: "broadcast", event: "msg", payload: msg }).catch(() => {});
    }
  }
}

export function subscribeRealtime(cb: (msg: RealtimeMsg) => void): () => void {
  ensureChannel();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ============ Settings cache ============
let _cachedSettings: SiteSettings = { ...DEFAULT_SETTINGS };
let _settingsLoaded = false;

async function loadSettingsAsync() {
  try {
    const r = await apiCall({ data: { url: "/api/public/settings", method: "GET" } });
    if (r.status === 200 && r.body) {
      _cachedSettings = { ...DEFAULT_SETTINGS, ..._cachedSettings, ...r.body };
      _settingsLoaded = true;
      listeners.forEach((cb) => cb({ type: "settings_updated", data: _cachedSettings }));
    }
  } catch {}
}

if (isBrowser()) {
  ensureChannel();
  loadSettingsAsync();
}

export function getSiteSettings(): SiteSettings {
  if (isBrowser() && !_settingsLoaded) loadSettingsAsync();
  return _cachedSettings;
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const token = isBrowser() ? localStorage.getItem("scriptando_token") : null;
  const r = await apiCall({ data: { url: "/api/admin/settings", method: "PUT", body: patch, token } });
  if (r.status === 200) {
    _cachedSettings = { ...DEFAULT_SETTINGS, ...r.body };
    emitLocalAndBroadcast(r.events as RealtimeMsg[]);
  }
  return _cachedSettings;
}

// ============ apiFetch (fetch-compatible) ============
export interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
}

function getToken(init?: RequestInit): string | null {
  const h = init?.headers as Record<string, string> | undefined;
  if (!h) return null;
  const auth = h["Authorization"] || h["authorization"];
  if (!auth) return null;
  return auth.replace(/^Bearer\s+/i, "");
}

export async function apiFetch(url: string, init?: RequestInit): Promise<MockResponse> {
  const method = (init?.method || "GET").toUpperCase();
  const body = init?.body ? JSON.parse(init.body as string) : undefined;
  const token = getToken(init);
  try {
    const r = await apiCall({ data: { url, method, body, token } });
    emitLocalAndBroadcast(r.events as RealtimeMsg[]);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.body,
    };
  } catch (e: any) {
    return {
      ok: false,
      status: 500,
      json: async () => ({ error: e?.message || "Erro de conexão" }),
    };
  }
}

// ============ Public registration ============
export async function registerPublicUser(
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const r = await apiCall({
    data: { url: "/api/public/register", method: "POST", body: { username, password } },
  });
  emitLocalAndBroadcast(r.events as RealtimeMsg[]);
  if (r.status >= 200 && r.status < 300) return { ok: true };
  return { ok: false, error: r.body?.error || "Erro ao registrar." };
}

// ============ Heartbeat ============
if (isBrowser()) {
  setInterval(() => {
    const token = localStorage.getItem("scriptando_token");
    if (!token) return;
    apiCall({ data: { url: "/api/stats", method: "GET", token } })
      .then((r) => {
        if (r.status === 200 && r.body) {
          listeners.forEach((cb) => cb({ type: "stats_updated", data: r.body }));
        }
      })
      .catch(() => {});
  }, 25_000);
}
