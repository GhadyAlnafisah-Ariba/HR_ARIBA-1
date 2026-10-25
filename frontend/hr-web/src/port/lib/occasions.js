// الإعلانات والتهاني: قائمة المناسبات + القوالب + الإرسال + إعداد التلقائي
import { rpc, getSetting, setSetting } from './api.js';
import { syncEmployee } from './employees.js';

/** فلتر المناسبات. auto: تُرسل تلقائيًا من بيانات الموظف (ميلاد/تعيين). الباقي يُسجَّل لكل موظف بتاريخه أو يُرسل يدويًا. */
export const OCCASIONS = [
  { k: 'announcement', ar: 'إعلان عام', en: 'Announcement', ic: '📢', ann: true },
  { k: 'birthday', ar: 'عيد ميلاد', en: 'Birthday', ic: '🎂', auto: true, t: '🎂 كل عام وأنت بخير يا {name}', b: 'تتمنى لك إدارة الموارد البشرية عامًا مليئًا بالصحة والنجاح والسعادة. كل عام وأنت بخير.' },
  { k: 'anniversary', ar: 'سنوية التعيين', en: 'Work anniversary', ic: '🎉', auto: true, t: '🎉 {years} سنة معنا يا {name}', b: 'نشكرك على جهودك وإخلاصك، ونتمنى لك دوام التوفيق في مسيرتك معنا.' },
  { k: 'graduation', ar: 'تخرج', en: 'Graduation', ic: '🎓', t: '🎓 مبروك التخرج يا {name}', b: 'نبارك لك التخرج ونتمنى لك مستقبلًا مشرقًا ومليئًا بالنجاح.' },
  { k: 'wedding', ar: 'زواج', en: 'Wedding', ic: '💍', t: '💍 مبروك الزواج يا {name}', b: 'بارك الله لك وبارك عليك وجمع بينكما في خير. نتمنى لكما حياة سعيدة.' },
  { k: 'newborn', ar: 'مولود جديد', en: 'New baby', ic: '👶', t: '👶 مبروك المولود الجديد يا {name}', b: 'بارك الله لك في الموهوب وشكرت الواهب وبلغ أشدّه ورُزقت برّه.' },
  { k: 'promotion', ar: 'ترقية', en: 'Promotion', ic: '⭐', t: '⭐ مبروك الترقية يا {name}', b: 'نبارك لك الترقية، وهي ثمرة جهدك وتميزك. نتمنى لك المزيد من التقدم.' },
  { k: 'achievement', ar: 'إنجاز / تميز', en: 'Achievement', ic: '🏆', t: '🏆 شكرًا على إنجازك يا {name}', b: 'نقدّر إنجازك المتميز ونشكرك على عطائك.' },
  { k: 'recovery', ar: 'سلامة / شفاء', en: 'Get well', ic: '💐', t: '💐 سلامتك يا {name}', b: 'نسأل الله لك الشفاء العاجل وأن يلبسك ثوب الصحة والعافية.' },
  { k: 'condolence', ar: 'تعزية', en: 'Condolence', ic: '🕊️', t: '🕊️ خالص العزاء يا {name}', b: 'عظّم الله أجرك وأحسن عزاءك وغفر لفقيدك، وإنا لله وإنا إليه راجعون.' },
  { k: 'eid_fitr', ar: 'عيد الفطر', en: 'Eid al-Fitr', ic: '🌙', t: '🌙 عيد فطر مبارك', b: 'كل عام وأنتم بخير، تقبّل الله منا ومنكم صالح الأعمال. عيدكم مبارك.' },
  { k: 'eid_adha', ar: 'عيد الأضحى', en: 'Eid al-Adha', ic: '🐑', t: '🐑 عيد أضحى مبارك', b: 'كل عام وأنتم بخير، وتقبّل الله طاعاتكم. عيدكم مبارك.' },
  { k: 'ramadan', ar: 'رمضان', en: 'Ramadan', ic: '🌙', t: '🌙 رمضان كريم', b: 'نبارككم حلول شهر رمضان المبارك، أعاده الله علينا وعليكم بالخير واليمن والبركات.' },
  { k: 'national_day', ar: 'اليوم الوطني', en: 'National Day', ic: '🇸🇦', t: '🇸🇦 كل عام والوطن بخير', b: 'نهنئكم باليوم الوطني، حفظ الله الوطن وقيادته وشعبه.' },
  { k: 'appreciation', ar: 'شكر وتقدير', en: 'Appreciation', ic: '🙏', t: '🙏 شكر وتقدير', b: 'نشكر لكم جهودكم المبذولة وتفانيكم في العمل.' },
  { k: 'other', ar: 'مناسبة أخرى', en: 'Other', ic: '🎊', t: '🎊 تهنئة يا {name}', b: 'تهنئة من إدارة الموارد البشرية ونتمنى لك دوام التوفيق والسعادة.' },
];
export const occ = (k) => OCCASIONS.find((o) => o.k === k) || OCCASIONS[OCCASIONS.length - 1];
/** المناسبات التي يمكن تسجيلها على موظف بتاريخ (تُرسل تلقائيًا في يومها) */
export const REGISTERABLE = OCCASIONS.filter((o) => !o.ann && !o.auto && !['eid_fitr', 'eid_adha', 'ramadan', 'national_day', 'appreciation'].includes(o.k));

export const AUTO_KEY = 'occasions_auto';
export const DEF_AUTO = { enabled: false, birthday: true, anniversary: true, custom: true, tpl: {} };
export const getAuto = async () => { try { const v = await getSetting(AUTO_KEY); return { ...DEF_AUTO, ...(v && typeof v === 'object' ? v : {}) }; } catch { return { ...DEF_AUTO }; } };
export const setAuto = (v) => setSetting(AUTO_KEY, v);
/** يشغّل مرة في اليوم لكل جهاز (idempotent على السيرفر) */
export async function runAutoOncePerDay(tag) {
  try {
    const k = 'ariba_occ_run_' + tag, today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(k) === today) return null;
    const r = await rpc('ariba_occ_run_auto', {}); localStorage.setItem(k, today); return r;
  } catch { return null; }
}

const firstName = (e) => String(e.nameAr || e.nameEn || '').trim().split(/\s+/)[0] || '';
export const isActive = (e) => !(e.isTerminated || e.term) && e.active !== false && !e.isHourly_off;
/** الموظفون المستهدفون حسب الجمهور (من بيانات البرنامج) */
export function pickRecipients(employees, audience, employer, ids) {
  const act = (employees || []).filter(isActive);
  if (audience === 'all') return act;
  if (audience === 'employer') return act.filter((e) => e.employer === employer);
  const set = new Set((ids || []).map(String)); return act.filter((e) => set.has(String(e.id)));
}
/** يتأكد إن الموظفين المحددين مسجّلين في تطبيق الموظف (employee_directory)، ولو لأ بيسجّلهم (مزامنة) قبل الإرسال.
 *  يرجّع أسماء اللي تعذّر تسجيلهم (مش هيوصلهم). */
async function ensureRegistered(list) {
  const ids = list.map((e) => String(e.id)); if (!ids.length) return [];
  let miss = [];
  try { const r = await rpc('ariba_ann_missing', { p_ids: ids }); miss = (r && r.missing) || []; } catch { return []; } /* sql/22 لسه ما اتشغلش: نكمّل زي الأول */
  const bad = [];
  for (const id of miss) {
    const e = list.find((x) => String(x.id) === String(id)); if (!e) continue;
    try { await syncEmployee(e); } catch { bad.push(e.nameAr || e.nameEn || id); }
  }
  return bad;
}
/** إرسال إعلان/تهنئة. لو النص فيه {name} أو {years} يُرسل لكل موظف على حدة باسمه.
 *  يرجع {sent: العدد الفعلي اللي وصله إشعار فعلاً، expected: المستهدف، failed: أسماء من لم يصلهم}. */
export async function sendAnn({ kind, occasion, title, body, audience, employer, ids, pinned, expires, employees }) {
  const list = pickRecipients(employees, audience, employer, ids);
  const failed = audience === 'employees' ? await ensureRegistered(list) : [];
  const personal = /\{name\}|\{years\}/.test(title + body);
  if (!personal) {
    const r = await rpc('ariba_ann_send', { p_kind: kind, p_occasion: occasion || null, p_title: title, p_body: body, p_audience: audience, p_employer: audience === 'employer' ? employer : null, p_ids: audience === 'employees' ? ids.map(String) : [], p_pinned: !!pinned, p_expires: expires || null });
    return { sent: (r && r.sent) || 0, expected: list.length, failed };
  }
  let n = 0;
  for (const e of list) {
    const years = e.contractJoin || e.joinDate ? Math.max(0, new Date().getFullYear() - new Date(e.contractJoin || e.joinDate).getFullYear()) : '';
    const rep = (s) => s.replace(/\{name\}/g, firstName(e)).replace(/\{years\}/g, String(years));
    const r = await rpc('ariba_ann_send', { p_kind: kind, p_occasion: occasion || null, p_title: rep(title), p_body: rep(body), p_audience: 'employees', p_employer: null, p_ids: [String(e.id)], p_pinned: !!pinned, p_expires: expires || null });
    const k = (r && r.sent) || 0; n += k; if (!k && !failed.includes(e.nameAr || e.nameEn)) failed.push(e.nameAr || e.nameEn || String(e.id));
  }
  return { sent: n, expected: list.length, failed };
}
