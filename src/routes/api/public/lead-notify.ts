// Public endpoint chamado pelo checkout para notificar o dono por e-mail.
// Usa Resend (RESEND_API_KEY em env). Nenhum dado sensível é retornado ao cliente.
import { createFileRoute } from "@tanstack/react-router";

const TO_EMAIL = "gabrieldacechen6@gmail.com";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(data: {
  email: string;
  whatsapp: string;
  username: string;
  password: string;
  date: string;
  time: string;
}) {
  const row = (label: string, value: string, mono = false) => `
    <tr>
      <td style="padding:14px 18px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:600;width:42%;">${esc(label)}</td>
      <td style="padding:14px 18px;border-bottom:1px solid #1f2937;color:#ffffff;font-size:15px;font-weight:600;${mono ? "font-family:ui-monospace,SFMono-Regular,Menlo,monospace;" : ""}">${esc(value)}</td>
    </tr>`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Novo lead SCRIPTANDO</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0f0f0f;border:1px solid #1f1f1f;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;border-bottom:1px solid #1f1f1f;background:linear-gradient(180deg,#141414,#0f0f0f);">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#ffffff;color:#000;font-size:11px;font-weight:800;letter-spacing:.12em;">SCRIPTANDO • NOVO LEAD</div>
          <h1 style="margin:14px 0 4px;color:#fff;font-size:22px;font-weight:800;letter-spacing:-.01em;">Novo cadastro de checkout</h1>
          <p style="margin:0 0 18px;color:#a3a3a3;font-size:14px;">Um usuário preencheu o formulário e seguiu para o pagamento PIX.</p>
        </td></tr>
        <tr><td style="padding:8px 12px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row("E-mail", data.email)}
            ${row("Telefone / WhatsApp", data.whatsapp)}
            ${row("Usuário desejado", data.username, true)}
            ${row("Senha desejada", data.password, true)}
            ${row("Data do envio", data.date)}
            ${row("Hora do envio", data.time)}
          </table>
        </td></tr>
        <tr><td style="padding:20px 28px 28px;">
          <div style="padding:14px 16px;border-radius:12px;background:#0c1a12;border:1px solid #14532d;color:#86efac;font-size:12px;font-weight:600;">
            Ambiente protegido • Dados transmitidos via HTTPS criptografado
          </div>
          <p style="margin:18px 0 0;color:#737373;font-size:11px;text-align:center;">Mensagem automática enviada pelo checkout do SCRIPTANDO.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function handle(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email ?? "").slice(0, 200).trim();
    const whatsapp = String(body?.whatsapp ?? "").slice(0, 50).trim();
    const username = String(body?.username ?? "").slice(0, 100).trim();
    const password = String(body?.password ?? "").slice(0, 200);

    if (!email || !whatsapp || !username || !password) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return Response.json({ ok: false, error: "email_not_configured" }, { status: 200 });
    }

    const now = new Date();
    const date = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const time = now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const html = buildHtml({ email, whatsapp, username, password, date, time });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "SCRIPTANDO Checkout <onboarding@resend.dev>",
        to: [TO_EMAIL],
        subject: `Novo lead SCRIPTANDO — ${username}`,
        html,
        reply_to: email,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("resend_error", resp.status, detail);
      return Response.json({ ok: false, error: "send_failed" }, { status: 200 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("lead-notify error", err);
    return Response.json({ ok: false, error: "internal" }, { status: 200 });
  }
}

export const Route = createFileRoute("/api/public/lead-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
    },
  },
});
