// أسئلة المساعد عن أي بيانات موظف (محلياً، بدون أي خدمة خارجية): ملف كامل أو حقول محددة (جوال، بنك، تعيين، جواز…)
import { N, isTerm } from './aiParse.js';
import { leaveCurrentBalance } from '../engines/leave.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const yn = (v) => (v === true || v === 'true' ? 'نعم' : v === false || v === 'false' ? 'لا' : v);
const age = (d) => { const x = new Date(String(d).slice(0, 10) + 'T00:00:00'); if (isNaN(x)) return ''; const n = new Date(); let a = n.getFullYear() - x.getFullYear(); if (n < new Date(n.getFullYear(), x.getMonth(), x.getDate())) a--; return a; };
const money = (v) => (v === undefined || v === null || v === '' ? '' : num(v) + ' ' + 'ريال');
const days = (v) => (v === undefined || v === null || v === '' ? '' : v + ' يوم');
const first = (e, ...ks) => { for (const k of ks) if (e[k] !== undefined && e[k] !== null && e[k] !== '') return e[k]; return ''; };

// [مفتاح، اسم العرض، دالة القيمة]
const F = {
  empNo: ['الرقم الوظيفي', (e) => first(e, 'empNo')],
  nameAr: ['الاسم', (e) => first(e, 'nameAr', 'name_ar')],
  nameEn: ['الاسم بالإنجليزي', (e) => first(e, 'nameEn', 'name_en')],
  nationality: ['الجنسية', (e) => e.nationality],
  gender: ['الجنس', (e) => first(e, 'gender', 'gen')],
  marital: ['الحالة الاجتماعية', (e) => e.maritalStatus],
  religion: ['الديانة', (e) => e.religion],
  dob: ['تاريخ الميلاد', (e) => (e.dob ? String(e.dob).slice(0, 10) + (age(e.dob) !== '' ? ' (العمر ' + age(e.dob) + ' سنة)' : '') : '')],
  education: ['المؤهل', (e) => e.education],
  job: ['المسمى الوظيفي', (e) => first(e, 'jobTitle', 'job_title')],
  dept: ['القسم', (e) => first(e, 'dept', 'department')],
  employer: ['جهة العمل', (e) => e.employer],
  sponsor: ['الكفيل', (e) => e.sponsor],
  empType: ['نوع التوظيف', (e) => first(e, 'empType', 'wpsType')],
  manager: ['المدير المباشر', (e, all) => { const m = first(e, 'managerId', 'manager_id'); const x = m && (all || []).find((y) => String(y.id) === String(m)); return x ? x.nameAr : ''; }],
  join: ['تاريخ المباشرة', (e) => String(first(e, 'contractJoin', 'join_date') || '').slice(0, 10)],
  service: ['مدة الخدمة', (e) => (e.yearsOfService > 0 ? Number(e.yearsOfService).toFixed(2) + ' سنة' : '')],
  probation: ['نهاية فترة التجربة', (e) => String(e.probationEnd || '').slice(0, 10)],
  status: ['الحالة', (e) => (isTerm(e) ? 'منتهي الخدمة' + (e.terminationDate || e.lastDay ? ' — ' + String(e.terminationDate || e.lastDay).slice(0, 10) : '') + (e.terminationReason ? ' (' + e.terminationReason + ')' : '') : 'على رأس العمل' + (e.scheduledToEnd && e.scheduledEndDate ? ' — إنهاء مجدول ' + String(e.scheduledEndDate).slice(0, 10) : ''))],
  cNature: ['نوع العقد', (e) => e.contractNature],
  cDur: ['مدة العقد', (e) => e.contractDuration],
  cEnd: ['نهاية العقد', (e) => (e.contractEnd ? String(e.contractEnd).slice(0, 10) + (e.contractDaysLeft !== undefined && e.contractDaysLeft !== '' ? ' (متبقي ' + e.contractDaysLeft + ' يوم)' : '') : 'غير محدد')],
  basic: ['الراتب الأساسي', (e) => money(e.salary)],
  housing: ['بدل السكن', (e) => money(e.housingAllowance)],
  transport: ['بدل المواصلات', (e) => money(e.transportAllowance)],
  project: ['بدل المشروع', (e) => (Number(e.projectAllowance) ? money(e.projectAllowance) : '')],
  other: ['بدلات أخرى', (e) => (Number(e.otherAllowance) || Number(e.extraAllowance) ? money(Number(e.otherAllowance || 0) + Number(e.extraAllowance || 0)) : '')],
  gross: ['إجمالي الراتب', (e) => money(e.salaryTotal)],
  net: ['صافي الراتب', (e) => money(e.netSalary)],
  tax: ['الضريبة', (e) => (Number(e.taxDeduct) ? money(e.taxDeduct) : '')],
  ded: ['استقطاعات أخرى', (e) => (Number(e.otherDeductions) ? money(e.otherDeductions) : '')],
  currency: ['عملة الراتب', (e) => e.currency],
  payMethod: ['طريقة الدفع', (e) => e.payMethod],
  bank: ['البنك', (e) => e.bank],
  iban: ['الآيبان', (e) => e.iban],
  acct: ['رقم الحساب', (e) => e.bankAccountNo],
  iqamaNo: ['رقم الإقامة/الهوية', (e) => first(e, 'iqamaNo', 'iqama_no')],
  iqamaExp: ['انتهاء الإقامة/الهوية', (e) => (e.iqamaExpiry ? String(e.iqamaExpiry).slice(0, 10) + (e.iqamaDaysLeft !== undefined && e.iqamaDaysLeft !== '' ? ' (متبقي ' + e.iqamaDaysLeft + ' يوم)' : '') : '')],
  profession: ['المهنة في الإقامة', (e) => e.professionIqama],
  passNo: ['رقم الجواز', (e) => e.passportNo],
  passExp: ['انتهاء الجواز', (e) => (e.passportExpiry ? String(e.passportExpiry).slice(0, 10) + (e.passportDaysLeft !== undefined && e.passportDaysLeft !== '' ? ' (متبقي ' + e.passportDaysLeft + ' يوم)' : '') : '')],
  visa: ['فئة التأشيرة', (e) => e.visaCategory],
  gosi: ['رقم التأمينات', (e) => e.gosiNo],
  insSys: ['نظام التأمينات', (e) => e.insSystem],
  insCo: ['شركة التأمين الطبي', (e) => first(e, 'insuranceCo', 'insuranceComp')],
  insCls: ['فئة التأمين الطبي', (e) => e.insuranceClass],
  insCard: ['رقم بطاقة التأمين', (e) => e.insuranceCard],
  insExp: ['انتهاء التأمين الطبي', (e) => (e.insuranceExpiry ? String(e.insuranceExpiry).slice(0, 10) + (e.insuranceDaysLeft !== undefined && e.insuranceDaysLeft !== '' ? ' (متبقي ' + e.insuranceDaysLeft + ' يوم)' : '') : '')],
  mobile: ['الجوال', (e) => e.mobile],
  email: ['الإيميل', (e) => e.email],
  username: ['اسم المستخدم', (e) => e.username],
  leaveBal: ['رصيد الإجازة الحالي', (e) => { let b = null; try { b = leaveCurrentBalance(e); } catch { b = e.leaveBalance; } return b === null || b === undefined || b === '' ? '' : days(Math.round(Number(b) * 100) / 100); }],
  leaveDays: ['أيام الإجازة بالعقد', (e) => days(e.leaveDaysContract)],
};
const GROUPS = [
  ['👤 البيانات الأساسية', ['empNo', 'nameAr', 'nameEn', 'nationality', 'gender', 'marital', 'religion', 'dob', 'education', 'status']],
  ['💼 الوظيفة', ['job', 'dept', 'employer', 'sponsor', 'empType', 'manager', 'join', 'service', 'probation']],
  ['📄 العقد والإجازات', ['cNature', 'cDur', 'cEnd', 'leaveDays', 'leaveBal']],
  ['💰 الراتب', ['basic', 'housing', 'transport', 'project', 'other', 'gross', 'tax', 'ded', 'net', 'currency', 'payMethod']],
  ['🏦 البنك', ['bank', 'iban', 'acct']],
  ['🪪 الهوية والوثائق', ['iqamaNo', 'iqamaExp', 'profession', 'passNo', 'passExp', 'visa', 'gosi']],
  ['🩺 التأمين', ['insSys', 'insCo', 'insCls', 'insCard', 'insExp']],
  ['📞 التواصل', ['mobile', 'email', 'username']],
];
// كلمات السؤال (بعد التطبيع بـ N) → الحقول المطلوبة
const ASK = [
  [/جوال|موبايل|تلفون|هاتف|رقم (ال)?تواصل|اتصال/, ['mobile']], [/ايميل|بريد|mail/, ['email']],
  [/بنك|ايبان|iban|حساب بنك|رقم الحساب/, ['bank', 'iban', 'acct']],
  [/جواز|باسبور/, ['passNo', 'passExp']], [/هويه|اقام|رقم الاقامه/, ['iqamaNo', 'iqamaExp', 'profession']],
  [/تامين طبي|تامين صحي|كرت (ال)?تامين|بطاقه (ال)?تامين|طبي/, ['insCo', 'insCls', 'insCard', 'insExp']], [/تامينات|gosi|جوسي/, ['gosi', 'insSys']],
  [/تعيين|مباشر[هة]|انضم|بدا|بدأ|التحاق|تاريخ (ال)?عمل/, ['join', 'service']], [/مده (ال)?خدم|سنوات (ال)?خدم|خبر[هة] في (ال)?شرك/, ['join', 'service']],
  [/ميلاد|عمر|كم سنه|سنه كام/, ['dob']], [/جنسي/, ['nationality']], [/قسم|ادار[هة]/, ['dept']], [/مسمي|وظيف[هة]|منصب|شغال ايه|بيشتغل ايه/, ['job', 'dept']],
  [/مدير(ه)? (ال)?مباشر|بيتبع|تابع لمين|مين مدير/, ['manager']], [/كفيل|جه[هة] (ال)?عمل|شرك[هة] (ال)?موظف/, ['sponsor', 'employer']],
  [/حال[هة] (ال)?اجتماعي|متزوج|اعزب|زواج/, ['marital']], [/ديان/, ['religion']], [/مؤهل|دراس|شهاد[هة] (ال)?علمي/, ['education']],
  [/تجرب/, ['probation']], [/نوع (ال)?عقد|طبيع[هة] (ال)?عقد|مده (ال)?عقد|نهايه (ال)?عقد|ينتهي عقد/, ['cNature', 'cDur', 'cEnd']],
  [/بدل|اساسي|الاساسي|اجمالي|صافي|مرتب|راتب|تفاصيل (ال)?راتب|مفردات/, ['basic', 'housing', 'transport', 'project', 'other', 'gross', 'tax', 'ded', 'net']],
  [/رصيد|اجازات|اجازه/, ['leaveBal', 'leaveDays']], [/حال[هة]|على راس (ال)?عمل|منتهي|مستقيل/, ['status']], [/رقم (ال)?وظيفي|رقمه|رقم (ال)?موظف/, ['empNo']],
  [/يوزر|مستخدم|اسم (ال)?دخول/, ['username']],
];
const rowsFor = (e, keys, all) => keys.map((k) => { const f = F[k]; let v = ''; try { v = f[1](e, all); } catch { /* */ } if (v === '' || v === undefined || v === null) return null; return '<b>' + f[0] + ':</b> ' + esc(yn(v)); }).filter(Boolean);

/** يرجّع HTML الرد، أو '' لو السؤال مش عن بيانات موظف */
export function answerEmployee(text, e, all) {
  const t = N(text);
  const wantAll = /(كل|جميع|ملف|بيانات|معلومات|تفاصيل|كارت|بطاق[هة] (ال)?موظف|ملخص|نبذه|عرفني|مين هو|مين هي)/.test(t);
  const keys = []; ASK.forEach((a) => { if (a[0].test(t)) a[1].forEach((k) => { if (keys.indexOf(k) < 0) keys.push(k); }); });
  const nm = '<b>' + esc(e.nameAr) + '</b>' + (e.empNo ? ' <span class="ai-mini">(رقم ' + esc(e.empNo) + ')</span>' : '');
  if (keys.length && !wantAll) {
    const r = rowsFor(e, keys, all);
    return nm + (r.length ? '<div class="ai-mini" style="line-height:2;margin-top:4px">' + r.join('<br>') + '</div>' : '<div class="ai-mini">هذه البيانات غير مسجلة في ملف الموظف.</div>');
  }
  const blocks = GROUPS.map((g) => { const r = rowsFor(e, g[1], all); return r.length ? '<div style="margin-top:6px"><b>' + g[0] + '</b><div class="ai-mini" style="line-height:1.9">' + r.join('<br>') + '</div></div>' : ''; }).join('');
  return nm + (blocks || '<div class="ai-mini">لا توجد بيانات مسجلة.</div>');
}
