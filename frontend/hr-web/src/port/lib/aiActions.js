// أوامر الإدارة في مساعد اريبا (محلياً، بتأكيد قبل التنفيذ): تعديل راتب/بدلات/خصومات/تأمينات/بيانات موظف، تعديل رصيد إجازة، إعلان وتهنئة.
// كل التنفيذ بيعدّي على نفس دوال البرنامج (buildEmployee + syncEmployee / sendAnn) فبتتطبق نفس قواعد الحساب والتحقق والتدقيق.
import { N, parseDates } from './aiParse.js';
import { formFromEmployee, buildEmployee, syncEmployee } from './employees.js';
import { sendAnn, occ } from './occasions.js';
import { clearLeaveCache } from '../engines/runtime.js';
import * as L from '../engines/leave.js';

const SET = /(غير|عدل|حدث|ضبط|ظبط|خلي|اجعل|حط|بدل)/, ADD = /(زود|زيد|ضيف|اضف|ارفع|رفع|علاو[هة])/, SUB = /(انقص|نقص|خفض|قلل|اخصم)/;
const FIELDS = [
  [/نظام (ال)?تامينات|تامينات اجتماعيه نظام/, 'insSystem', 'ins', 'نظام التأمينات'],
  [/(انتهاء|ينتهي|تنتهي).*تامين (ال)?(طبي|صحي)|تامين (ال)?(طبي|صحي).*(انتهاء|ينتهي)/, 'ie', 'date', 'انتهاء التأمين الطبي'],
  [/(شرك[هة]|جه[هة]) (ال)?تامين/, 'ic', 'text', 'شركة التأمين الطبي'],
  [/(فئ[هة]|درج[هة]|class) .*تامين|تامين (ال)?(طبي|صحي)? ?(فئ[هة]|درج[هة])/, 'icl', 'text', 'فئة التأمين الطبي'],
  [/(رقم|كرت|بطاق[هة]) .*تامين|بطاق[هة] (ال)?تامين/, 'icard', 'text', 'رقم بطاقة التأمين'],
  [/(انتهاء|تنتهي|ينتهي) (ال)?(اقام|هوي)|(اقام[هة]|هوي[هة]) (انتهاء|تنتهي)/, 'iqe', 'date', 'انتهاء الإقامة'],
  [/رقم (ال)?(اقام[هة]|هوي[هة])/, 'iq', 'text', 'رقم الإقامة/الهوية'],
  [/(انتهاء|تنتهي|ينتهي) (ال)?جواز/, 'ppe', 'date', 'انتهاء الجواز'],
  [/رقم (ال)?جواز|(ال)?جواز/, 'pn', 'text', 'رقم الجواز'],
  [/ايبان|iban/, 'ib', 'text', 'الآيبان'], [/(ال)?بنك/, 'bk', 'text', 'البنك'],
  [/جوال|موبايل|تلفون|هاتف/, 'mb', 'text', 'الجوال'], [/ايميل|بريد/, 'ml', 'text', 'الإيميل'],
  [/مسمي|وظيف[هة]|منصب/, 'jt', 'text', 'المسمى الوظيفي'], [/(ال)?قسم/, 'dep', 'text', 'القسم'], [/كفيل/, 'sp', 'text', 'الكفيل'],
  [/اجمالي/, 'total', 'num', 'إجمالي الراتب'], [/سكن/, 'hou', 'num', 'بدل السكن'], [/مواصلات|نقل|انتقال/, 'tra', 'num', 'بدل المواصلات'],
  [/مشروع/, 'prj', 'num', 'بدل المشروع'], [/بدل (اضافي|اضافه)/, 'extra', 'num', 'البدل الإضافي'], [/بدل (اخر|اخري|تاني|ثاني)|بدلات (اخري)/, 'oth', 'num', 'بدلات أخرى'],
  [/استقطاع|خصومات/, 'ded', 'num', 'الاستقطاعات'], [/(ال)?اساسي|راتب|مرتب/, 'sal', 'num', 'الراتب الأساسي'],
];
const OCC = [[/عيد (ال)?ميلاد/, 'birthday'], [/تخرج/, 'graduation'], [/زواج|زفاف|خطوب/, 'wedding'], [/مولود|مواليد|ولاد[هة]/, 'newborn'], [/ترقي/, 'promotion'], [/انجاز|تميز/, 'achievement'], [/شفاء|سلامه|سلامت/, 'recovery'], [/عزاء|تعزي|وفا[هة]/, 'condolence'], [/عيد (ال)?فطر|الفطر/, 'eid_fitr'], [/اضحي/, 'eid_adha'], [/رمضان/, 'ramadan'], [/يوم (ال)?وطني|وطني/, 'national_day'], [/شكر|تقدير/, 'appreciation']];
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const money = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const stripDates = (s) => s.replace(/\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g, ' ').replace(/(emp|رقم|الرقم الوظيفي)\s*0*\d+/gi, ' ');
const num = (t) => { const m = stripDates(N(t)).match(/(\d+(?:[.]\d+)?)\s*(%|بالمي[هة]|في المي[هة]|بالمايه|بالمائه)?/); return m ? { v: parseFloat(m[1]), pct: !!m[2] } : null; };

/** الجزء الأول من الجملة (قبل النص المراد إرساله) عشان اسم الموظف ما يتلخبطش مع نص الإعلان */
export const headOf = (text) => String(text).split(/[:：]/)[0];

/** يرجّع {type, ...} أو null لو الجملة مش من أوامر الإدارة دي */
export function parseAdmin(text) {
  const t = N(text), head = N(headOf(text));
  const send = /(ابعت|ارسل|انشر|وجه|اعمل|اطلق|عايز|عاوز|اريد|ابلغ)/.test(t);
  // إعلان
  if (/(اعلان|تعميم)/.test(t) && send) {
    const m = String(text).match(/[:：]\s*([\s\S]+)$/); return { type: 'ann', body: m ? m[1].trim() : '', all: /(الكل|الجميع|كل (ال)?(موظف|موظفين|زملاء)|جميع)/.test(head) };
  }
  // تهنئة
  if (/(هنئ|هني|تهنئ|تهاني|مبروك|كل عام)/.test(t) && (send || /^(هنئ|هني)/.test(t.trim()) || /تهنئ/.test(t))) {
    let k = 'other'; OCC.forEach((o) => { if (o[0].test(t) && k === 'other') k = o[1]; });
    const m = String(text).match(/[:：]\s*([\s\S]+)$/); return { type: 'greet', occasion: k, body: m ? m[1].trim() : '', all: /(الكل|الجميع|كل (ال)?(موظف|موظفين|زملاء)|جميع)/.test(head) };
  }
  // رصيد إجازة
  if (/رصيد/.test(t) && (SET.test(t) || ADD.test(t) || SUB.test(t))) {
    const n = num(text); if (!n) return null;
    return { type: 'bal', op: ADD.test(t) ? 'add' : SUB.test(t) ? 'sub' : 'set', value: n.v };
  }
  // حقول الموظف / الرواتب / التأمينات
  const op = ADD.test(t) ? 'add' : SUB.test(t) ? 'sub' : SET.test(t) ? 'set' : '';
  if (!op) return null;
  const hit = FIELDS.find((f) => f[0].test(t)); if (!hit) return null;
  const [, key, kind, label] = hit;
  if (kind === 'num') { const n = num(text); if (!n) return null; return { type: 'field', key, kind, label, op, value: n.v, pct: n.pct }; }
  if (op !== 'set') return null;
  if (kind === 'date') { const d = parseDates(text, false)[0]; if (!d) return null; return { type: 'field', key, kind, label, op, value: d }; }
  if (kind === 'ins') { const v = /(غير سعودي|وافد|مقيم|expat)/.test(t) ? 'expat' : /(لا يطابق|قديم)/.test(t) ? 'old' : /(يطابق|جديد)/.test(t) ? 'new' : ''; if (!v) return null; return { type: 'field', key, kind, label, op, value: v }; }
  const m = String(text).match(/[:：]\s*(.+)$/) || String(text).match(/(?:الى|إلى|الي|ليكون|يكون|بقى|بقي)\s+(.+)$/);
  const val = m ? m[1].trim() : ''; if (!val) return null;
  return { type: 'field', key, kind, label, op, value: val };
}

const FORM_KEYS = { sal: 'sal', hou: 'hou', tra: 'tra', prj: 'prj', oth: 'oth', extra: 'extra', ded: 'ded' };
/** يحسب الحقول الجديدة: يرجّع { err } أو { before, after, emp, f, net0, net1, gross0, gross1 } */
export function planField(e, a, all) {
  const f0 = formFromEmployee(e), f = { ...f0 };
  const g = (k) => parseFloat(f0[k]) || 0;
  let before = '', after = '';
  if (a.kind === 'num') {
    if (a.key === 'total') {
      const others = g('hou') + g('tra') + g('prj') + g('oth') + g('extra'), cur = others + g('sal');
      let target = a.op === 'set' ? a.value : a.op === 'add' ? (a.pct ? cur * (1 + a.value / 100) : cur + a.value) : (a.pct ? cur * (1 - a.value / 100) : cur - a.value);
      if (target < others) return { err: 'الإجمالي المطلوب أقل من مجموع البدلات (' + money(others) + ') — الأساسي مش هيبقى سالب' };
      f.sal = r2(target - others); before = money(cur); after = money(target);
    } else {
      const k = FORM_KEYS[a.key], cur = g(k);
      const nv = a.op === 'set' ? a.value : a.op === 'add' ? (a.pct ? cur * (1 + a.value / 100) : cur + a.value) : (a.pct ? cur * (1 - a.value / 100) : cur - a.value);
      if (nv < 0) return { err: 'القيمة الناتجة سالبة' };
      f[k] = r2(nv); before = money(cur); after = money(nv);
    }
  } else {
    const k = a.key === 'insSystem' ? 'insSystem' : a.key; before = String(f0[k] === undefined || f0[k] === '' ? '—' : f0[k]); f[k] = a.value; after = String(a.value);
  }
  const r0 = buildEmployee(f0, e, all), r = buildEmployee(f, e, all);
  if (r.error) return { err: r.error };
  return { before, after, emp: r.emp, gross0: r0.emp ? r0.emp.salaryTotal : e.salaryTotal, gross1: r.emp.salaryTotal, net0: r0.emp ? r0.emp.netSalary : e.netSalary, net1: r.emp.netSalary, salaryRelated: a.kind === 'num' || a.key === 'insSystem' };
}
export async function applyField(plan) { await syncEmployee(plan.emp); }

/** رصيد الإجازة الحالي → قيمة جديدة (بنفس آلية "تعديل الأرصدة": تجاوز رصيد السنة الحالية + سجل للتراجع) */
export function planBalance(e, a) {
  if (L.leaveExempt(e)) return { err: 'الموظف ده (تمهير/تدريب/استشاري) لا يستحق رصيد إجازة' };
  const cur = r2(L.leaveCurrentBalance(e)), nv = r2(a.op === 'set' ? a.value : a.op === 'add' ? cur + a.value : cur - a.value);
  if (nv < 0) return { err: 'الرصيد الناتج سالب' };
  return { cur, nv };
}
export async function applyBalance(e, nv, note) {
  const yNow = String(new Date().getFullYear()), prevAll = e.leaveYearOverrides || {}, hist = Array.isArray(e.leaveBalanceHistory) ? e.leaveBalanceHistory : [];
  const overrides = { ...prevAll, [yNow]: { ...(prevAll[yNow] && typeof prevAll[yNow] === 'object' ? prevAll[yNow] : {}), current: nv, currentAsOf: new Date().toISOString(), note: note || 'تعديل عن طريق مساعد اريبا', updatedAt: new Date().toISOString() } };
  const n = { ...e, leaveYearOverrides: overrides, leaveBalanceHistory: [...hist.slice(-9), { at: new Date().toISOString(), overrides: prevAll, leaveBalance: e.leaveBalance }], leaveBalance: nv, leaveBalanceUpdatedAt: new Date().toISOString(), leaveBalanceUpdatedBy: 'HR' };
  clearLeaveCache(); await syncEmployee(n); clearLeaveCache();
}

/** إعلان/تهنئة. recipients: {audience:'all'|'employees', ids} */
export async function sendAnnouncement(a, rec, employees) {
  const isAnn = a.type === 'ann', o = occ(isAnn ? 'announcement' : a.occasion);
  const title = isAnn ? '📢 إعلان' : o.t, body = isAnn ? a.body : (a.body || o.b);
  const res = await sendAnn({ kind: isAnn ? 'announcement' : 'greeting', occasion: isAnn ? null : a.occasion, title, body, audience: rec.audience, employer: '', ids: rec.ids || [], pinned: false, expires: '', employees });
  return res;
}
export const occLabel = (k) => { const o = occ(k); return (o.ic || '') + ' ' + o.ar; };
