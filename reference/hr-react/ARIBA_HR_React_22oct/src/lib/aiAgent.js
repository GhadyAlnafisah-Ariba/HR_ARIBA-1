// وضع «الأسئلة الحرة» لمساعد اريبا AI: أي سؤال عام/خارجي أو بحث ويب عبر دالة ariba-ai على Supabase (نموذج Claude).
// بقرار المستخدم: لا تُرسل أي بيانات موظفين للخدمة الخارجية — الأدوات هنا لفتح الصفحات فقط؛
// بيانات البرنامج وإجراءاته بتفضل بالأوامر المباشرة داخل المساعد (محلياً بدون إرسال).
import { functionCall } from './api.js';
import { PAGE_WORDS } from './aiParse.js';

export const TOOLS = [{
  name: 'open_page', description: 'فتح صفحة في البرنامج بطلب المستخدم.',
  input_schema: { type: 'object', properties: { page: { type: 'string', enum: PAGE_WORDS.map((x) => x[1]), description: 'dash لوحة التحكم، pay المسير، slip كشف راتب، emps الموظفون، cand المرشحون، goals الأهداف، eval التقييم، att الحضور، loc المواقع، lv الإجازات، team الفريق، insc التأمينات، salcalc حاسبة الراتب، taxcalc الضريبة، wps تحويل الرواتب، prov المخصصات، assets الأصول، eos نهاية الخدمة، eoscalc المخالصة، docs الوثائق، rpt التقارير، set الإعدادات، audit السجل، forms النماذج' } }, required: ['page'] },
}];

const WHY = { UNAUTHENTICATED: 'انتهت الجلسة — سجّل الدخول من جديد', NOT_AUTHORIZED: 'المساعد الذكي لفريق الإدارة فقط', AI_NOT_CONFIGURED: 'لسه ما اتفعّلش: لازم يتضاف مفتاح ANTHROPIC_API_KEY في أسرار Supabase (راجع الدليل في الباتش)' };

/** history: رسائل سابقة (نصوص فقط). بيرجّع {text, history} أو يرمي Error برسالة واضحة. h.nav لفتح صفحة */
export async function askAgent(userText, history, h) {
  const msgs = [...history, { role: 'user', content: userText }];
  for (let step = 0; step < 4; step++) {
    const r = await functionCall('ariba-ai', { messages: msgs, tools: TOOLS });
    const j = (r && r.data) || {};
    if (!j.ok) { if (r && r.status === 404) throw new Error('دالة ariba-ai غير منشورة على Supabase لسه — راجع الدليل'); throw new Error(WHY[j.error] || j.message || ('HTTP ' + (r && r.status))); }
    (j.extra || []).forEach((m) => msgs.push(m));
    msgs.push({ role: 'assistant', content: j.content });
    const uses = (j.content || []).filter((b) => b.type === 'tool_use');
    if (!uses.length || j.stop_reason !== 'tool_use') {
      const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      // نحتفظ بالنصوص فقط في الذاكرة (بدون نتائج بحث ضخمة)
      const keep = msgs.filter((m) => typeof m.content === 'string' || (m.role === 'assistant' && Array.isArray(m.content) && m.content.every((b) => b.type === 'text')));
      return { text: text || '…', history: keep.slice(-12) };
    }
    const results = uses.map((u) => {
      const ok = u.name === 'open_page' && PAGE_WORDS.some((x) => x[1] === (u.input || {}).page);
      if (ok) h.nav(u.input.page);
      return { type: 'tool_result', tool_use_id: u.id, content: ok ? 'تم فتح الصفحة' : 'أداة غير مسموحة', is_error: !ok };
    });
    msgs.push({ role: 'user', content: results });
  }
  throw new Error('الطلب محتاج خطوات كتير — جرّب تبسّطه');
}
