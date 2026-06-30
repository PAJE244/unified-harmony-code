// Server function — todas as operações do SCRIPTANDO contra o banco real.
import { createServerFn } from "@tanstack/react-start";

const SALT = "paje_01_salt_premium";

function hashPassword(pw: string): string {
  let h = 0;
  const s = pw + SALT;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return "h_" + (h >>> 0).toString(16) + "_" + s.length.toString(16);
}

function uuid() {
  return crypto.randomUUID();
}

interface ApiInput {
  url: string;
  method?: string;
  body?: any;
  token?: string | null;
}

interface ApiResult {
  status: number;
  body: any;
  events?: any[];
}

// Map DB row -> sanitized public platform (no content)
function toPublicScript(s: any) {
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? "",
    icon: s.icon ?? "Terminal",
    status: s.status ?? "online",
    accentColor: s.accent_color ?? null,
    shortDescription: s.short_description ?? "",
    longDescription: s.long_description ?? "",
    tutorial: s.tutorial ?? "",
    images: s.images ?? [],
    notices: s.notices ?? [],
    extras: s.extras ?? {},
    sortOrder: s.sort_order ?? 0,
    active: s.active !== false,
    createdAt: s.created_at,
    updatedAt: s.updated_at ?? s.created_at,
  };
}

// Admin includes content
function toAdminScript(s: any) {
  return { ...toPublicScript(s), content: s.content ?? "" };
}

export const apiCall = createServerFn({ method: "POST" })
  .inputValidator((d: ApiInput) => d)
  .handler(async ({ data }): Promise<ApiResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const url = data.url;
    const method = (data.method || "GET").toUpperCase();
    const body = data.body || {};
    const token = data.token || null;
    const events: any[] = [];

    const res = (status: number, b: any): ApiResult => ({ status, body: b, events });

    const toPublic = (u: any) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      status: u.status,
      createdAt: u.created_at,
    });

    const addLog = async (username: string, action: string) => {
      const { data: logRow } = await db
        .from("app_logs")
        .insert({ username, action })
        .select()
        .single();
      const { data: logs } = await db
        .from("app_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(200);
      const mapped = (logs || []).map((l: any) => ({
        id: l.id,
        username: l.username,
        action: l.action,
        timestamp: l.timestamp,
      }));
      events.push({ type: "logs_updated", data: mapped });
      return logRow;
    };

    const broadcastStats = async () => {
      const { count: totalCount } = await db
        .from("app_users")
        .select("*", { count: "exact", head: true });
      const cutoff = new Date(Date.now() - 60_000).toISOString();
      const { count: onlineCount } = await db
        .from("app_sessions")
        .select("*", { count: "exact", head: true })
        .gte("last_seen", cutoff);
      events.push({
        type: "stats_updated",
        data: { totalCount: totalCount || 0, onlineCount: Math.max(onlineCount || 0, 1) },
      });
    };

    const broadcastUsers = async () => {
      const { data: users } = await db
        .from("app_users")
        .select("*")
        .order("created_at", { ascending: true });
      events.push({ type: "users_list_updated", data: (users || []).map(toPublic) });
    };

    // Public broadcast — never includes script content
    const broadcastScripts = async () => {
      const { data: scripts } = await db
        .from("app_scripts")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      events.push({
        type: "scripts_updated",
        data: (scripts || []).filter((s: any) => s.active !== false).map(toPublicScript),
      });
    };

    const sessionUser = async (tok: string | null) => {
      if (!tok) return null;
      const { data: sess } = await db
        .from("app_sessions")
        .select("*")
        .eq("token", tok)
        .maybeSingle();
      if (!sess) return null;
      const { data: user } = await db
        .from("app_users")
        .select("*")
        .eq("id", sess.user_id)
        .maybeSingle();
      if (!user || user.status === "banned") {
        await db.from("app_sessions").delete().eq("token", tok);
        return null;
      }
      await db
        .from("app_sessions")
        .update({ last_seen: new Date().toISOString() })
        .eq("token", tok);
      return user;
    };

    // ===== Public endpoints =====
    if (url === "/api/login" && method === "POST") {
      const { username, password } = body;
      if (!username || !password) return res(400, { error: "Usuário e senha são obrigatórios" });
      const { data: user } = await db
        .from("app_users")
        .select("*")
        .ilike("username", String(username))
        .maybeSingle();
      if (!user) return res(401, { error: "Credenciais incorretas" });
      if (user.status === "banned") return res(403, { error: "Sua conta foi banida pelo administrador." });
      if (user.password_hash !== hashPassword(password))
        return res(401, { error: "Credenciais incorretas" });
      const newToken = uuid().replace(/-/g, "") + uuid().replace(/-/g, "");
      await db.from("app_sessions").insert({ token: newToken, user_id: user.id });
      await addLog(user.username, "Iniciou sessão com sucesso.");
      await broadcastStats();
      return res(200, { token: newToken, user: toPublic(user) });
    }

    if (url === "/api/public/register" && method === "POST") {
      const { username, password } = body;
      if (!username || !password) return res(400, { error: "Usuário e senha obrigatórios." });
      const uname = String(username).trim();
      const { data: exists } = await db
        .from("app_users")
        .select("id")
        .ilike("username", uname)
        .maybeSingle();
      if (exists) return res(400, { error: "Este nome de usuário já está em uso." });
      const { data: created } = await db
        .from("app_users")
        .insert({
          username: uname,
          password_hash: hashPassword(password),
          role: "user",
          status: "active",
        })
        .select()
        .single();
      await addLog("Checkout", `Novo cadastro VIP: "${uname}".`);
      await broadcastStats();
      await broadcastUsers();
      return res(201, toPublic(created));
    }

    if (url === "/api/public/settings" && method === "GET") {
      const { data: s } = await db.from("app_settings").select("data").eq("id", 1).maybeSingle();
      return res(200, s?.data || {});
    }

    // ===== Authenticated =====
    const me = await sessionUser(token);
    if (!me) return res(403, { error: "Sessão inválida ou expirada" });

    if (url === "/api/logout" && method === "POST") {
      await db.from("app_sessions").delete().eq("token", token!);
      await addLog(me.username, "Encerrou sessão.");
      await broadcastStats();
      return res(200, { success: true });
    }

    if (url === "/api/me" && method === "GET") return res(200, { user: toPublic(me) });

    // Public list — NO content, only active
    if (url === "/api/scripts" && method === "GET") {
      const { data: scripts } = await db
        .from("app_scripts")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return res(200, (scripts || []).filter((s: any) => s.active !== false).map(toPublicScript));
    }

    // Secure copy endpoint — single path that returns content for end users
    const copyMatch = url.match(/^\/api\/scripts\/([^/]+)\/copy$/);
    if (copyMatch && method === "POST") {
      const id = copyMatch[1];
      const { data: s } = await db.from("app_scripts").select("*").eq("id", id).maybeSingle();
      if (!s) return res(404, { error: "Script não encontrado" });
      if (s.active === false && me.role !== "admin") return res(403, { error: "Script indisponível." });
      await addLog(me.username, `Copiou o script "${s.title}".`);
      return res(200, { content: s.content || "" });
    }

    if (url === "/api/stats" && method === "GET") {
      const { count: totalCount } = await db
        .from("app_users").select("*", { count: "exact", head: true });
      const cutoff = new Date(Date.now() - 60_000).toISOString();
      const { count: onlineCount } = await db
        .from("app_sessions").select("*", { count: "exact", head: true }).gte("last_seen", cutoff);
      return res(200, { totalCount: totalCount || 0, onlineCount: Math.max(onlineCount || 0, 1) });
    }

    // Admin gate
    if (url.startsWith("/api/admin/") && me.role !== "admin")
      return res(403, { error: "Acesso restrito ao administrador" });

    if (url === "/api/admin/users" && method === "GET") {
      const { data: users } = await db
        .from("app_users").select("*").order("created_at", { ascending: true });
      return res(200, (users || []).map(toPublic));
    }

    if (url === "/api/admin/users" && method === "POST") {
      const { username, password } = body;
      if (!username || !password) return res(400, { error: "Usuário e senha são obrigatórios" });
      const uname = String(username).trim();
      const { data: exists } = await db
        .from("app_users").select("id").ilike("username", uname).maybeSingle();
      if (exists) return res(400, { error: "Este nome de usuário já está em uso" });
      const { data: created } = await db
        .from("app_users")
        .insert({ username: uname, password_hash: hashPassword(password), role: "user", status: "active" })
        .select().single();
      await addLog(me.username, `Criou o usuário "${uname}".`);
      await broadcastStats();
      await broadcastUsers();
      return res(201, toPublic(created));
    }

    const userIdMatch = url.match(/^\/api\/admin\/users\/([^/]+)(\/(ban|unban))?$/);
    if (userIdMatch) {
      const id = userIdMatch[1];
      const sub = userIdMatch[3];
      const { data: user } = await db.from("app_users").select("*").eq("id", id).maybeSingle();
      if (!user) return res(404, { error: "Usuário não encontrado" });

      if (method === "DELETE") {
        if (user.role === "admin") return res(400, { error: "Não é possível excluir o administrador" });
        await db.from("app_users").delete().eq("id", id);
        await addLog(me.username, `Excluiu o usuário "${user.username}".`);
        events.push({ type: "account_deleted", message: "Sua conta foi excluída pelo administrador.", targetUserId: id });
        await broadcastStats();
        await broadcastUsers();
        return res(200, { success: true });
      }
      if (sub === "ban" && method === "POST") {
        if (user.role === "admin") return res(400, { error: "Não é possível banir um administrador" });
        await db.from("app_users").update({ status: "banned" }).eq("id", id);
        await addLog(me.username, `Baniu o usuário "${user.username}".`);
        events.push({ type: "account_banned", message: "Sua conta foi banida pelo administrador.", targetUserId: id });
        await broadcastUsers();
        return res(200, { success: true });
      }
      if (sub === "unban" && method === "POST") {
        await db.from("app_users").update({ status: "active" }).eq("id", id);
        await addLog(me.username, `Reativou o usuário "${user.username}".`);
        await broadcastUsers();
        return res(200, { success: true });
      }
      if (method === "PUT") {
        if (user.role === "admin" && user.id !== me.id)
          return res(403, { error: "Você não pode editar outros administradores" });
        const oldUsername = user.username;
        let passwordChanged = false;
        const patch: any = {};
        if (body.username && String(body.username).trim().toLowerCase() !== user.username.toLowerCase()) {
          const uname = String(body.username).trim();
          const { data: clash } = await db
            .from("app_users").select("id").ilike("username", uname).neq("id", id).maybeSingle();
          if (clash) return res(400, { error: "Este nome de usuário já está em uso" });
          patch.username = uname;
        }
        if (body.password && String(body.password).trim() !== "") {
          patch.password_hash = hashPassword(body.password);
          passwordChanged = true;
        }
        if (body.status && body.status !== user.status) {
          if (user.role === "admin") return res(400, { error: "Administradores não podem ser banidos" });
          patch.status = body.status;
        }
        const { data: updated } = await db
          .from("app_users").update(patch).eq("id", id).select().single();
        await addLog(me.username, `Editou o usuário "${oldUsername}"${passwordChanged ? " (senha alterada)" : ""}.`);
        events.push({
          type: "account_modified", targetUserId: id,
          data: {
            passwordChanged,
            usernameChanged: oldUsername !== updated.username,
            user: toPublic(updated),
          },
        });
        if (updated.status === "banned")
          events.push({ type: "account_banned", message: "Sua conta foi banida pelo administrador.", targetUserId: id });
        await broadcastStats();
        await broadcastUsers();
        return res(200, toPublic(updated));
      }
    }

    if (url === "/api/admin/me" && method === "PUT") {
      const oldUsername = me.username;
      const patch: any = {};
      if (body.username && String(body.username).trim() !== me.username) {
        const uname = String(body.username).trim();
        const { data: clash } = await db
          .from("app_users").select("id").ilike("username", uname).neq("id", me.id).maybeSingle();
        if (clash) return res(400, { error: "Este nome de usuário já está em uso" });
        patch.username = uname;
      }
      if (body.password && String(body.password).trim() !== "")
        patch.password_hash = hashPassword(body.password);
      const { data: updated } = await db
        .from("app_users").update(patch).eq("id", me.id).select().single();
      await addLog(updated.username, `Atualizou as próprias credenciais (antes: "${oldUsername}").`);
      await broadcastUsers();
      return res(200, { username: updated.username });
    }

    if (url === "/api/admin/logs" && method === "GET") {
      const { data: logs } = await db
        .from("app_logs").select("*").order("timestamp", { ascending: false }).limit(200);
      return res(200, (logs || []).map((l: any) => ({
        id: l.id, username: l.username, action: l.action, timestamp: l.timestamp,
      })));
    }

    // ====== Admin scripts (with content) ======
    if (url === "/api/admin/scripts" && method === "GET") {
      const { data: scripts } = await db
        .from("app_scripts")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return res(200, (scripts || []).map(toAdminScript));
    }

    function buildScriptPatch(b: any) {
      const patch: any = {};
      if (b.title !== undefined) patch.title = String(b.title).trim();
      if (b.content !== undefined) patch.content = b.content;
      if (b.description !== undefined) patch.description = String(b.description).trim();
      if (b.icon !== undefined) patch.icon = String(b.icon).trim() || "Terminal";
      if (b.status !== undefined) patch.status = String(b.status);
      if (b.accentColor !== undefined) patch.accent_color = b.accentColor || null;
      if (b.shortDescription !== undefined) patch.short_description = String(b.shortDescription);
      if (b.longDescription !== undefined) patch.long_description = String(b.longDescription);
      if (b.tutorial !== undefined) patch.tutorial = String(b.tutorial);
      if (b.images !== undefined) patch.images = Array.isArray(b.images) ? b.images : [];
      if (b.notices !== undefined) patch.notices = Array.isArray(b.notices) ? b.notices : [];
      if (b.extras !== undefined) patch.extras = b.extras && typeof b.extras === "object" ? b.extras : {};
      if (b.sortOrder !== undefined) patch.sort_order = Number(b.sortOrder) || 0;
      if (b.active !== undefined) patch.active = !!b.active;
      return patch;
    }

    if (url === "/api/admin/scripts" && method === "POST") {
      const patch = buildScriptPatch(body);
      if (!patch.title) return res(400, { error: "Título é obrigatório" });
      if (patch.content === undefined) patch.content = "";
      // assign sort_order at the end
      if (patch.sort_order === undefined) {
        const { data: maxRow } = await db
          .from("app_scripts").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
        patch.sort_order = (maxRow?.sort_order ?? 0) + 1;
      }
      const { data: created } = await db
        .from("app_scripts")
        .insert(patch)
        .select().single();
      await addLog(me.username, `Adicionou a plataforma "${created.title}".`);
      await broadcastScripts();
      return res(201, toAdminScript(created));
    }

    const scriptDuplicateMatch = url.match(/^\/api\/admin\/scripts\/([^/]+)\/duplicate$/);
    if (scriptDuplicateMatch && method === "POST") {
      const id = scriptDuplicateMatch[1];
      const { data: s } = await db.from("app_scripts").select("*").eq("id", id).maybeSingle();
      if (!s) return res(404, { error: "Script não encontrado" });
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = s;
      rest.title = `${s.title} (cópia)`;
      const { data: maxRow } = await db
        .from("app_scripts").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      rest.sort_order = (maxRow?.sort_order ?? 0) + 1;
      const { data: created } = await db.from("app_scripts").insert(rest).select().single();
      await addLog(me.username, `Duplicou a plataforma "${s.title}".`);
      await broadcastScripts();
      return res(201, toAdminScript(created));
    }

    if (url === "/api/admin/scripts/reorder" && method === "PUT") {
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      for (let i = 0; i < ids.length; i++) {
        await db.from("app_scripts").update({ sort_order: i + 1 }).eq("id", ids[i]);
      }
      await addLog(me.username, "Reordenou as plataformas.");
      await broadcastScripts();
      return res(200, { success: true });
    }

    const scriptMatch = url.match(/^\/api\/admin\/scripts\/([^/]+)$/);
    if (scriptMatch) {
      const id = scriptMatch[1];
      const { data: s } = await db.from("app_scripts").select("*").eq("id", id).maybeSingle();
      if (!s) return res(404, { error: "Script não encontrado" });
      if (method === "DELETE") {
        await db.from("app_scripts").delete().eq("id", id);
        await addLog(me.username, `Excluiu a plataforma "${s.title}".`);
        await broadcastScripts();
        return res(200, { success: true });
      }
      if (method === "PUT") {
        const patch = buildScriptPatch(body);
        const { data: updated } = await db
          .from("app_scripts").update(patch).eq("id", id).select().single();
        await addLog(me.username, `Editou a plataforma "${updated.title}".`);
        await broadcastScripts();
        return res(200, toAdminScript(updated));
      }
    }

    if (url === "/api/admin/settings" && method === "PUT") {
      const { data: cur } = await db.from("app_settings").select("data").eq("id", 1).maybeSingle();
      const merged = { ...((cur?.data as any) || {}), ...(body || {}) };
      await db.from("app_settings").upsert({ id: 1, data: merged });
      await addLog(me.username, "Atualizou as configurações do site.");
      events.push({ type: "settings_updated", data: merged });
      return res(200, merged);
    }

    // Heartbeat
    if (url === "/api/heartbeat" && method === "POST") {
      return res(200, { ok: true });
    }

    return res(404, { error: "Rota não encontrada" });
  });
