// ariba-ai — «عقل» مساعد اريبا AI: يوصّل مساعد البرنامج بنموذج ذكاء اصطناعي (Anthropic Claude) للأسئلة العامة/الخارجية + بحث الويب.
// السر المطلوب: ANTHROPIC_API_KEY  (اختياري: AI_MODEL — الافتراضي claude-sonnet-5-5). verify_jwt=false (التحقق من المستخدم داخل الدالة).
// لا تُرسل لهذه الدالة أي بيانات موظفين (قرار المستخدم): بيانات البرنامج وإجراءاته بتتنفذ محلياً داخل المساعد.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const STAFF = new Set(["admin", "chairman", "hr", "ceo", "admin_manager", "finance", "accountant"]);

const SYSTEM = `أنت «مساعد اريبا AI» داخل نظام الموارد البشرية لشركة حلول أريبا لخدمات الأعمال. تكلّم المستخدم (مسؤول موارد بشرية) بالعربية المبسطة أو بلهجته.
دورك هنا: الإجابة عن أي سؤال عام أو خارجي (أنظمة العمل والتأمينات والضرائب والإقامة، الحسابات والإكسل والبرمجة، ترجمة وصياغة خطابات ورسائل، نصائح إدارة، معلومات عامة) من معرفتك، واستخدم البحث على الويب للمعلومات الحديثة أو المتغيرة (أسعار، قرارات، تواريخ، أخبار) واذكر المصدر باختصار.
حدود مهمة: ما عندك أي وصول لبيانات موظفي الشركة (رواتب/إقامات/إجازات/حضور...) ولا تخمّنها. لو سُئلت عن بيانات داخلية أو طُلب تنفيذ إجراء في البرنامج، قل للمستخدم يكتب الطلب مباشرة بصيغة أمر مثل: «رصيد إجازة أحمد»، «ابعت رسالة لسارة: ...»، «كم عدد الموظفين»، «افتح المسير» — وهتتنفذ من داخل البرنامج.
لو احتاج فتح صفحة في البرنامج استخدم أداة open_page. أسلوبك: مختصر وعملي، وجداول Markdown بسيطة عند المقارنة.`;

async function anthropic(key: string, model: string, messages: unknown[], tools: unknown[]) {
  const body = { model, max_tokens: 4096, system: SYSTEM + `\nالتاريخ اليوم: ${new Date().toISOString().slice(0, 10)}.`, messages, tools: [...tools, { type: "web_search_20250305", name: "web_search", max_uses: 5 }] };
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { /* */ }
  if (!r.ok) throw new Error((j?.error?.message || t).slice(0, 300) + " [" + r.status + "]");
  return j;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = jwt ? await sb.auth.getUser(jwt) : { data: null } as any;
    if (!u?.user) return json({ ok: false, error: "UNAUTHENTICATED", message: "سجّل الدخول من جديد" });
    const { data: acc } = await sb.from("ariba_auth_accounts").select("role,active").eq("auth_user_id", u.user.id).maybeSingle();
    if (!acc?.active || !STAFF.has(acc.role)) return json({ ok: false, error: "NOT_AUTHORIZED", message: "المساعد الذكي لفريق الإدارة فقط" });
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ ok: false, error: "AI_NOT_CONFIGURED", message: "مفتاح الذكاء الاصطناعي (ANTHROPIC_API_KEY) غير مضاف في أسرار Supabase" });
    let b: any; try { b = await req.json(); } catch { return json({ ok: false, error: "BAD_JSON", message: "طلب غير صالح" }); }
    const messages = Array.isArray(b.messages) ? b.messages.slice(-40) : [];
    const tools = (Array.isArray(b.tools) ? b.tools : []).filter((t: any) => t && t.name === "open_page").slice(0, 1);
    if (!messages.length) return json({ ok: false, error: "NO_MESSAGES", message: "لا توجد رسالة" });
    const model = Deno.env.get("AI_MODEL") || "claude-sonnet-5-5";
    let msgs = messages, res: any = null;
    // بحث الويب بيتنفّذ عند Anthropic؛ لو رجع pause_turn نكمّل تلقائياً
    for (let i = 0; i < 4; i++) {
      res = await anthropic(key, model, msgs, tools);
      if (res.stop_reason !== "pause_turn") break;
      msgs = [...msgs, { role: "assistant", content: res.content }];
    }
    const extra = msgs.length > messages.length ? msgs.slice(messages.length) : [];
    return json({ ok: true, content: res.content, stop_reason: res.stop_reason, extra });
  } catch (e) {
    return json({ ok: false, error: "AI_ERROR", message: String((e as Error)?.message ?? e).slice(0, 400) });
  }
});
