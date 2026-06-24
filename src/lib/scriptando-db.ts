// Client-side persistent backend for SCRIPTANDO platform.
// Replaces the original Express + WebSocket server with localStorage +
// BroadcastChannel for cross-tab realtime. The public surface is a fetch-like
// function so the original platform UI code keeps working with minimal changes.

export type Role = "admin" | "user";
export type Status = "active" | "banned";

export interface DbUser {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  status: Status;
  createdAt: string;
}

export interface DbScript {
  id: string;
  title: string;
  content: string;
  description: string;
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

interface DbSchema {
  users: DbUser[];
  scripts: DbScript[];
  logs: DbLog[];
  sessions: Record<string, { userId: string; lastSeen: number }>;
  settings?: SiteSettings;
}

const STORAGE_KEY = "scriptando_db_v1";
const SALT = "paje_01_salt_premium";

export const DEFAULT_SETTINGS: SiteSettings = {
  pixKey: "gabrieldacechen6@gmail.com",
  pixAmount: "9.90",
  pixName: "SCRIPTANDO PAJE",
  pixCity: "CURITIBA",
  whatsappNumber: "5541999999999",
  supportEmail: "gabrieldacechen6@gmail.com",
  heroTitle: "CANSADO DE PERDER TEMPO COM ATIVIDADES ESCOLARES?",
  heroSubtitle: "Automatize Khan Academy, Quizizz, Redação PR, Inglês PR e Leia PR em segundos.",
  loteText: "Últimos 37 acessos liberados por R$9,90. O valor sobe amanhã.",
  priceLabel: "R$9,90",
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Simple non-cryptographic hash; fine for a local demo.
function hashPassword(pw: string): string {
  let h = 0;
  const s = pw + SALT;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return "h_" + (h >>> 0).toString(16) + "_" + s.length.toString(16);
}

function defaultDb(): DbSchema {
  const now = new Date().toISOString();
  return {
    users: [
      {
        id: "admin-1",
        username: "gabriel",
        passwordHash: hashPassword("6767"),
        role: "admin",
        status: "active",
        createdAt: now,
      },
    ],
    scripts: [
      { id: "script-1", title: "Khan Academy", content: "// Script Khan Academy - automatiza exercícios e desafios.\n(function(){ console.log('Khan Academy Bot ativo'); })();", description: "Script automatizado para a plataforma Khan Academy.", createdAt: now },
      { id: "script-2", title: "Leia Paraná", content: "// Script Leia Paraná - acelera leituras e atividades.\n(function(){ console.log('Leia PR Bot ativo'); })();", description: "Acelere suas leituras e atividades no Leia Paraná.", createdAt: now },
      { id: "script-3", title: "Redação Paraná", content: "// Script Redação Paraná - otimiza redações.\n(function(){ console.log('Redação PR Bot ativo'); })();", description: "Otimize suas redações e feedback no Redação Paraná.", createdAt: now },
      { id: "script-4", title: "Inglês Paraná", content: "// Script Inglês Paraná - pratique de forma inteligente.\n(function(){ console.log('Inglês PR Bot ativo'); })();", description: "Pratique de forma inteligente no Inglês Paraná.", createdAt: now },
      { id: "script-5", title: "Quizizz", content: "// Script Quizizz - auxiliar de respostas.\n(function(){ console.log('Quizizz Bot ativo'); })();", description: "Auxiliar de respostas e estudos para o Quizizz.", createdAt: now },
    ],
    logs: [
      { id: "log-1", username: "Sistema", action: "Plataforma inicializada por Pajé 01.", timestamp: now },
    ],
    sessions: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

function load(): DbSchema {
  if (!isBrowser()) return defaultDb();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = defaultDb();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as DbSchema;
    if (!parsed.users || !parsed.scripts || !parsed.logs) throw new Error("bad");
    if (!parsed.sessions) parsed.sessions = {};
    if (!parsed.settings) parsed.settings = { ...DEFAULT_SETTINGS };
    else parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
    return parsed;
  } catch {
    const fresh = defaultDb();
    if (isBrowser()) localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

let db: DbSchema = load();
function save() {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// Realtime bus (cross-tab)
type RealtimeMsg =
  | { type: "stats_updated"; data: { totalCount: number; onlineCount: number } }
  | { type: "users_list_updated"; data: PublicUser[] }
  | { type: "logs_updated"; data: DbLog[] }
  | { type: "scripts_updated"; data: DbScript[] }
  | { type: "account_modified"; data: { passwordChanged: boolean; usernameChanged: boolean; user: PublicUser }; targetUserId: string }
  | { type: "account_deleted"; message: string; targetUserId: string }
  | { type: "account_banned"; message: string; targetUserId: string }
  | { type: "settings_updated"; data: SiteSettings };

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("scriptando-bus") : null;

const listeners = new Set<(msg: RealtimeMsg) => void>();

channel?.addEventListener("message", (e) => {
  // Reload db from storage in case another tab mutated it
  db = load();
  listeners.forEach((cb) => cb(e.data));
});

if (isBrowser()) {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) db = load();
  });
}

function emit(msg: RealtimeMsg) {
  listeners.forEach((cb) => cb(msg));
  channel?.postMessage(msg);
}

export function subscribeRealtime(cb: (msg: RealtimeMsg) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  status: Status;
  createdAt: string;
}

function toPublic(u: DbUser): PublicUser {
  return { id: u.id, username: u.username, role: u.role, status: u.status, createdAt: u.createdAt };
}

function addLog(username: string, action: string) {
  const log: DbLog = { id: uuid(), username, action, timestamp: new Date().toISOString() };
  db.logs.unshift(log);
  if (db.logs.length > 200) db.logs = db.logs.slice(0, 200);
  save();
  emit({ type: "logs_updated", data: db.logs });
}

function getOnlineCount() {
  const cutoff = Date.now() - 60_000;
  return Object.values(db.sessions).filter((s) => s.lastSeen >= cutoff).length || 1;
}

function broadcastStats() {
  emit({ type: "stats_updated", data: { totalCount: db.users.length, onlineCount: getOnlineCount() } });
}

function broadcastUsers() {
  emit({ type: "users_list_updated", data: db.users.map(toPublic) });
}

function broadcastScripts() {
  emit({ type: "scripts_updated", data: db.scripts });
}

function touchSession(token: string) {
  if (db.sessions[token]) {
    db.sessions[token].lastSeen = Date.now();
    save();
  }
}

function sessionUser(token: string | undefined | null): DbUser | null {
  if (!token) return null;
  const s = db.sessions[token];
  if (!s) return null;
  const u = db.users.find((u) => u.id === s.userId);
  if (!u || u.status === "banned") {
    delete db.sessions[token];
    save();
    return null;
  }
  return u;
}

// Fetch-like API. Returns { ok, status, json } so the existing UI works unmodified.
export interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
}

function res(status: number, body: any): MockResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function getToken(init?: RequestInit): string | null {
  const h = init?.headers as Record<string, string> | undefined;
  if (!h) return null;
  const auth = h["Authorization"] || h["authorization"];
  if (!auth) return null;
  return auth.replace(/^Bearer\s+/i, "");
}

export async function apiFetch(url: string, init?: RequestInit): Promise<MockResponse> {
  db = load();
  const method = (init?.method || "GET").toUpperCase();
  const body = init?.body ? JSON.parse(init.body as string) : {};
  const token = getToken(init);

  // Public endpoints
  if (url === "/api/login" && method === "POST") {
    const { username, password } = body;
    if (!username || !password) return res(400, { error: "Usuário e senha são obrigatórios" });
    const user = db.users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
    if (!user) return res(401, { error: "Credenciais incorretas" });
    if (user.status === "banned") return res(403, { error: "Sua conta foi banida pelo administrador." });
    if (user.passwordHash !== hashPassword(password)) return res(401, { error: "Credenciais incorretas" });
    const newToken = uuid().replace(/-/g, "") + uuid().replace(/-/g, "");
    db.sessions[newToken] = { userId: user.id, lastSeen: Date.now() };
    save();
    addLog(user.username, "Iniciou sessão com sucesso.");
    broadcastStats();
    return res(200, { token: newToken, user: toPublic(user) });
  }

  // Authenticated endpoints
  const me = sessionUser(token);
  if (!me) return res(403, { error: "Sessão inválida ou expirada" });
  touchSession(token!);

  if (url === "/api/logout" && method === "POST") {
    delete db.sessions[token!];
    save();
    addLog(me.username, "Encerrou sessão.");
    broadcastStats();
    return res(200, { success: true });
  }
  if (url === "/api/me" && method === "GET") return res(200, { user: toPublic(me) });
  if (url === "/api/scripts" && method === "GET") return res(200, db.scripts);
  if (url === "/api/stats" && method === "GET")
    return res(200, { totalCount: db.users.length, onlineCount: getOnlineCount() });

  // Admin
  const requireAdmin = () => me.role === "admin";
  if (url.startsWith("/api/admin/") && !requireAdmin()) return res(403, { error: "Acesso restrito ao administrador" });

  if (url === "/api/admin/users" && method === "GET") return res(200, db.users.map(toPublic));
  if (url === "/api/admin/users" && method === "POST") {
    const { username, password } = body;
    if (!username || !password) return res(400, { error: "Usuário e senha são obrigatórios" });
    const uname = String(username).trim();
    if (db.users.some((u) => u.username.toLowerCase() === uname.toLowerCase()))
      return res(400, { error: "Este nome de usuário já está em uso" });
    const newUser: DbUser = {
      id: uuid(), username: uname, passwordHash: hashPassword(password),
      role: "user", status: "active", createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    save();
    addLog(me.username, `Criou o usuário "${uname}".`);
    broadcastStats(); broadcastUsers();
    return res(201, toPublic(newUser));
  }
  const userIdMatch = url.match(/^\/api\/admin\/users\/([^/]+)(\/(ban|unban))?$/);
  if (userIdMatch) {
    const id = userIdMatch[1]; const sub = userIdMatch[3];
    const user = db.users.find((u) => u.id === id);
    if (!user) return res(404, { error: "Usuário não encontrado" });
    if (method === "DELETE") {
      if (user.role === "admin") return res(400, { error: "Não é possível excluir o administrador" });
      db.users = db.users.filter((u) => u.id !== id);
      save();
      addLog(me.username, `Excluiu o usuário "${user.username}".`);
      emit({ type: "account_deleted", message: "Sua conta foi excluída pelo administrador.", targetUserId: id });
      broadcastStats(); broadcastUsers();
      return res(200, { success: true });
    }
    if (sub === "ban" && method === "POST") {
      if (user.role === "admin") return res(400, { error: "Não é possível banir um administrador" });
      user.status = "banned"; save();
      addLog(me.username, `Baniu o usuário "${user.username}".`);
      emit({ type: "account_banned", message: "Sua conta foi banida pelo administrador.", targetUserId: id });
      broadcastUsers();
      return res(200, { success: true });
    }
    if (sub === "unban" && method === "POST") {
      user.status = "active"; save();
      addLog(me.username, `Reativou o usuário "${user.username}".`);
      broadcastUsers();
      return res(200, { success: true });
    }
    if (method === "PUT") {
      if (user.role === "admin" && user.id !== me.id)
        return res(403, { error: "Você não pode editar outros administradores" });
      const oldUsername = user.username;
      let passwordChanged = false;
      if (body.username && body.username.trim().toLowerCase() !== user.username.toLowerCase()) {
        const uname = String(body.username).trim();
        if (db.users.some((u) => u.id !== id && u.username.toLowerCase() === uname.toLowerCase()))
          return res(400, { error: "Este nome de usuário já está em uso" });
        user.username = uname;
      }
      if (body.password && String(body.password).trim() !== "") {
        user.passwordHash = hashPassword(body.password); passwordChanged = true;
      }
      if (body.status && body.status !== user.status) {
        if (user.role === "admin") return res(400, { error: "Administradores não podem ser banidos" });
        user.status = body.status;
      }
      save();
      addLog(me.username, `Editou o usuário "${oldUsername}"${passwordChanged ? " (senha alterada)" : ""}.`);
      emit({
        type: "account_modified", targetUserId: id,
        data: {
          passwordChanged, usernameChanged: oldUsername !== user.username, user: toPublic(user),
        },
      });
      if (user.status === "banned")
        emit({ type: "account_banned", message: "Sua conta foi banida pelo administrador.", targetUserId: id });
      broadcastStats(); broadcastUsers();
      return res(200, toPublic(user));
    }
  }

  if (url === "/api/admin/me" && method === "PUT") {
    const oldUsername = me.username;
    if (body.username && body.username.trim() !== me.username) {
      const uname = String(body.username).trim();
      if (db.users.some((u) => u.id !== me.id && u.username.toLowerCase() === uname.toLowerCase()))
        return res(400, { error: "Este nome de usuário já está em uso" });
      me.username = uname;
    }
    if (body.password && String(body.password).trim() !== "")
      me.passwordHash = hashPassword(body.password);
    save();
    addLog(me.username, `Atualizou as próprias credenciais (antes: "${oldUsername}").`);
    broadcastUsers();
    return res(200, { username: me.username });
  }

  if (url === "/api/admin/logs" && method === "GET") return res(200, db.logs);

  if (url === "/api/admin/scripts" && method === "POST") {
    const { title, content, description } = body;
    if (!title || !content) return res(400, { error: "Título e conteúdo são obrigatórios" });
    const s: DbScript = {
      id: uuid(), title: String(title).trim(), content, description: String(description || "").trim(),
      createdAt: new Date().toISOString(),
    };
    db.scripts.push(s); save();
    addLog(me.username, `Adicionou o script "${s.title}".`);
    broadcastScripts();
    return res(201, s);
  }
  const scriptMatch = url.match(/^\/api\/admin\/scripts\/([^/]+)$/);
  if (scriptMatch) {
    const id = scriptMatch[1];
    const s = db.scripts.find((x) => x.id === id);
    if (!s) return res(404, { error: "Script não encontrado" });
    if (method === "DELETE") {
      db.scripts = db.scripts.filter((x) => x.id !== id); save();
      addLog(me.username, `Excluiu o script "${s.title}".`);
      broadcastScripts();
      return res(200, { success: true });
    }
    if (method === "PUT") {
      if (body.title) s.title = String(body.title).trim();
      if (body.content !== undefined) s.content = body.content;
      if (body.description !== undefined) s.description = String(body.description).trim();
      save();
      addLog(me.username, `Editou o script "${s.title}".`);
      broadcastScripts();
      return res(200, s);
    }
  }

  return res(404, { error: "Rota não encontrada" });
}

// Public registration used by the landing-page checkout
export function registerPublicUser(username: string, password: string): { ok: boolean; error?: string } {
  db = load();
  if (!username || !password) return { ok: false, error: "Usuário e senha obrigatórios." };
  const uname = username.trim();
  if (db.users.some((u) => u.username.toLowerCase() === uname.toLowerCase()))
    return { ok: false, error: "Este nome de usuário já está em uso." };
  const u: DbUser = {
    id: uuid(), username: uname, passwordHash: hashPassword(password),
    role: "user", status: "active", createdAt: new Date().toISOString(),
  };
  db.users.push(u); save();
  addLog("Checkout", `Novo cadastro VIP: "${uname}".`);
  broadcastStats(); broadcastUsers();
  return { ok: true };
}

// Heartbeat to keep online count fresh
if (isBrowser()) {
  setInterval(() => {
    const token = localStorage.getItem("scriptando_token");
    if (token && db.sessions[token]) {
      touchSession(token);
      broadcastStats();
    }
  }, 20_000);
}
