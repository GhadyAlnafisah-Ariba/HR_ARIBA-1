// ariba-notify-email — نسخة ملف واحد للنشر من لوحة Supabase (Edge Functions › Deploy a new function › Via Editor)
// اسم الدالة لازم يكون بالظبط: ariba-notify-email — وبعد النشر: Settings › اقفل "Enforce JWT verification"
// أدوات الإرسال المشتركة: يرسل من حساب البريد المحفوظ في الإعدادات (ariba_mail_accounts) عبر SMTP،
// ولو المنفذ محجوب في Supabase (25 / 587 — ومنها Microsoft 365) أو الإرسال فشل، يستخدم Resend لو مضبوط.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.16";

export const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notify-key", "Access-Control-Allow-Methods": "POST, OPTIONS" };
// ملاحظة: الأخطاء المتوقعة ترجع 200 مع ok:false عشان المتصفح يقرا الرسالة ويقرر (مثلاً يفتح Outlook بدل الإرسال التلقائي)
export const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
export const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export const isEmail = (x: unknown) => /^\S+@\S+\.\S+$/.test(String(x ?? "").trim());
export const admin = (): SupabaseClient => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

export const STAFF_ROLES = new Set(["admin", "chairman", "hr", "ceo", "admin_manager", "finance", "accountant"]);
/** المستخدم الحالي من الـJWT */
export async function caller(sb: SupabaseClient, req: Request) {
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data: u } = await sb.auth.getUser(jwt);
  if (!u?.user) return null;
  const { data: acc } = await sb.from("ariba_auth_accounts").select("role,employee_id,active").eq("auth_user_id", u.user.id).maybeSingle();
  return acc?.active ? acc as { role: string; employee_id: string } : null;
}

export type Account = { owner: string; host: string; port: number; secure: boolean; username: string; password: string; from_name: string | null; from_email: string };
/** حساب الإرسال: بريد المسؤول نفسه، ولو مش موجود بريد الشركة */
export async function pickAccount(sb: SupabaseClient, ownerId: string | null): Promise<Account | null> {
  const owners = [ownerId, "company"].filter(Boolean) as string[];
  const { data } = await sb.from("ariba_mail_accounts").select("*").in("owner", owners);
  const rows = (data ?? []) as Account[];
  return rows.find((r) => r.owner === ownerId) ?? rows.find((r) => r.owner === "company") ?? null;
}

const BLOCKED = new Set([25, 587]); // Supabase/Deno Deploy يمنع الاتصال الخارجي على المنفذين دول

export type Mail = { to: string[]; subject: string; html: string; attachments?: { filename: string; content: string; contentType?: string }[] };
export type SendResult = { ok: true; via: string; from: string } | { ok: false; error: string; message: string };

/** تصحيح أخطاء الكتابة الشائعة + المنفذ: Gmail لازم 465 لأن Supabase يمنع 587 */
export function fixAccount(acc: Account): Account {
  let host = String(acc.host || "").trim().toLowerCase(), port = Number(acc.port) || 465;
  if (/^smtp\.(gmil|gmial|gmai|gamil|gmal)\.com$/.test(host) || host === "gmail.com" || host === "smtp.gmail") host = "smtp.gmail.com";
  if (BLOCKED.has(port) && !/office365|outlook/i.test(host)) port = 465; // Microsoft 365 يستخدم Graph بدل SMTP فلا نغيّر منفذه
  return { ...acc, host, port, secure: port === 465 ? true : !!acc.secure };
}

export async function sendMail(acc0: Account | null, m: Mail): Promise<SendResult> {
  const errs: string[] = [];
  const isO365 = !!acc0 && /office365|outlook\.com|live\.com|hotmail|smtp\.office365\.com/i.test(acc0.host);
  const acc = acc0 ? fixAccount(acc0) : null;
  const resendKey = Deno.env.get("RESEND_API_KEY"), resendFrom = Deno.env.get("EMAIL_FROM");
  // ── Microsoft 365 / Outlook: عبر Microsoft Graph (HTTPS 443) لأن Supabase يمنع SMTP على 587 ──
  if (acc && isO365) {
    const tenant = Deno.env.get("M365_TENANT_ID"), clientId = Deno.env.get("M365_CLIENT_ID"), clientSecret = Deno.env.get("M365_CLIENT_SECRET");
    const from = String(acc.from_email || acc.username || "").trim();
    if (!tenant || !clientId || !clientSecret) {
      if (!(resendKey && resendFrom)) return { ok: false, error: "M365_GRAPH_NOT_CONFIGURED", message: "Microsoft 365 يحتاج أسرار Supabase: M365_TENANT_ID وM365_CLIENT_ID وM365_CLIENT_SECRET، وصلاحية Microsoft Graph Mail.Send (Application) مع موافقة المسؤول. (الخطوات في docs/M365_GRAPH_SETUP.md)" };
      errs.push("M365: الأسرار غير مضبوطة");
    } else if ((m.attachments || []).some((a) => a.content.length > 4_000_000)) {
      return { ok: false, error: "M365_ATTACHMENT_TOO_LARGE", message: "ملف PDF أكبر من 3 MB؛ قلّل حجمه ثم أعد الإرسال." };
    } else {
      try {
        const tr = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }) });
        const tj = await tr.json().catch(() => ({}));
        if (!tr.ok || !tj.access_token) {
          const why = String(tj.error_description || tj.error || tr.status).replace(/\s+/g, " ").slice(0, 200);
          if (!(resendKey && resendFrom)) return { ok: false, error: "M365_TOKEN_FAILED", message: "فشل تسجيل تطبيق Microsoft 365 (" + why + "). راجع Tenant ID وClient ID وClient Secret (انتبه: القيمة Value وليست Secret ID) وأنها لم تنتهِ." };
          errs.push("M365 token: " + why);
        } else {
          const message = { subject: m.subject, body: { contentType: "HTML", content: m.html }, toRecipients: m.to.map((address) => ({ emailAddress: { address } })), attachments: (m.attachments || []).map((a) => ({ "@odata.type": "#microsoft.graph.fileAttachment", name: a.filename, contentType: a.contentType || "application/pdf", contentBytes: a.content })) };
          const sent = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, { method: "POST", headers: { Authorization: `Bearer ${tj.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ message, saveToSentItems: true }) });
          if (sent.ok) return { ok: true, via: "microsoft_graph", from };
          const body = (await sent.text()).replace(/\s+/g, " ");
          const hint = sent.status === 403 || /Access|Authorization|denied/i.test(body) ? " ← غالبًا صلاحية Mail.Send (Application) ناقصة أو لم تُعطَ Admin consent، أو سياسة ApplicationAccessPolicy تمنع هذا الصندوق."
            : sent.status === 404 || /MailboxNotEnabled|ResourceNotFound|NotFound/i.test(body) ? " ← الصندوق " + from + " غير موجود أو بلا ترخيص Exchange Online (تأكد أن عنوان المرسل هو الصندوق الحقيقي)."
            : sent.status === 401 ? " ← الرمز مرفوض؛ راجع بيانات التطبيق." : "";
          if (!(resendKey && resendFrom)) return { ok: false, error: "M365_SEND_FAILED", message: `Microsoft 365 رفض الإرسال (${sent.status})${hint} ` + body.slice(0, 220) };
          errs.push(`M365 ${sent.status}${hint}`);
        }
      } catch (e) {
        if (!(resendKey && resendFrom)) return { ok: false, error: "M365_SEND_FAILED", message: "تعذر الاتصال بـ Microsoft Graph: " + String((e as Error)?.message ?? e).slice(0, 180) };
        errs.push("M365: " + String((e as Error)?.message ?? e).slice(0, 120));
      }
    }
  } else if (acc && !BLOCKED.has(Number(acc0!.port))) {
    try {
      const t = nodemailer.createTransport({ host: acc.host, port: Number(acc.port), secure: !!acc.secure || Number(acc.port) === 465, auth: { user: acc.username, pass: acc.password }, connectionTimeout: 15000 });
      await t.sendMail({
        from: acc.from_name ? `"${acc.from_name.replace(/"/g, "")}" <${acc.from_email}>` : acc.from_email, to: m.to, subject: m.subject, html: m.html,
        attachments: (m.attachments ?? []).map((a) => ({ filename: a.filename, content: a.content, encoding: "base64", contentType: a.contentType })),
      });
      return { ok: true, via: "smtp", from: acc.from_email };
    } catch (e) { errs.push("SMTP: " + String((e as Error)?.message ?? e).slice(0, 200)); }
  } else if (acc0) errs.push(`SMTP_PORT_BLOCKED (${acc0.host}:${acc0.port})`);

  if (resendKey && resendFrom) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: resendFrom, to: m.to, subject: m.subject, html: m.html, reply_to: acc?.from_email || undefined, attachments: (m.attachments ?? []).map((a) => ({ filename: a.filename, content: a.content })) }),
    });
    if (r.ok) return { ok: true, via: "resend", from: resendFrom };
    errs.push("Resend: " + (await r.text()).slice(0, 200));
  }
  if (!acc && !(resendKey && resendFrom)) return { ok: false, error: "EMAIL_NOT_CONFIGURED", message: "مفيش بريد إرسال مضبوط (الإعدادات ← أخرى ← إرسال المستندات والإشعارات بالإيميل)" };
  const blocked = errs.length === 1 && errs[0].startsWith("SMTP_PORT_BLOCKED");
  return blocked
    ? { ok: false, error: "SMTP_PORT_BLOCKED", message: "منفذ " + acc0!.port + " (" + acc0!.host + ") ممنوع من سيرفر Supabase. استخدم Gmail (منفذ 465 + App Password) أو Resend، أو Microsoft 365 عبر Graph." }
    : { ok: false, error: "SEND_FAILED", message: errs.join(" | ") };
}

export const wrap = (title: string, inner: string) => `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
  <div style="background:#014D3D;color:#fff;padding:14px 18px;font-weight:700">${esc(title)}</div>
  <div style="padding:18px;line-height:1.9;color:#111">${inner}</div>
  <div style="padding:10px 18px;background:#f8fafc;color:#64748b;font-size:12px">الموارد البشرية — أريبا</div></div>`;

export const b64utf8 = (s: string) => { const b = new TextEncoder().encode(s); let out = ""; for (let i = 0; i < b.length; i += 0x8000) out += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(out); };

// ariba-notify-email — تستدعيها قاعدة البيانات (trigger ariba_notif_email في sql/15) مع كل إشعار جديد،
// وترسل إيميل لصاحب الإشعار من "بريد الشركة" المحفوظ في الإعدادات. انشرها مع verify_jwt=false.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const sb = admin();
    const { data: k } = await sb.from("ariba_private_kv").select("value").eq("key", "notify_key").maybeSingle();
    if (!k?.value || req.headers.get("x-notify-key") !== k.value) return json({ ok: false, error: "FORBIDDEN" }, 403);
    const b = await req.json().catch(() => ({}));
    const id = String(b.recipient_employee_id || "");
    if (!id) return json({ ok: false, error: "NO_RECIPIENT" });
    const { data: emp } = await sb.from("employee_directory").select("name_ar,data").eq("employee_id", id).maybeSingle();
    const d = (emp?.data ?? {}) as Record<string, unknown>;
    const to = [d.email, d.workEmail, d.mail].map((x) => String(x ?? "").trim()).find(isEmail);
    if (!to) return json({ ok: false, error: "NO_EMAIL" });
    const title = String(b.title || "إشعار من الموارد البشرية").slice(0, 200);
    const r = await sendMail(await pickAccount(sb, null), { to: [to], subject: title, html: wrap(title, `مرحباً ${esc(String(emp?.name_ar ?? ""))}،<br>${esc(String(b.body || ""))}`) });
    return json(r);
  } catch (e) {
    return json({ ok: false, error: "SERVER_ERROR", message: String((e as Error)?.message ?? e).slice(0, 300) });
  }
});
