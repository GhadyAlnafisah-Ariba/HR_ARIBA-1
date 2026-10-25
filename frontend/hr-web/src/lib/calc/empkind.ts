/* eslint-disable */
// @ts-nocheck
// Copied verbatim from ARIBA_HR_React/src/engines/empkind.js (kindOf / noEos / insExempt).
// نوع الموظف المشتق (استشاري / تمهير / تدريب / غير خاضع) — منقول من ariba-v130-insurance-exempt و v135
export function kindOf(e) {
  if (!e) return '';
  const w = String(e.wpsType || e.wps || 'wps');
  if (w === 'consultant' || w === 'tamheer' || w === 'trainee') return w;
  if (w !== 'wps') return w;
  const job = String(e.jobTitle || e.job || e.jt || ''), dep = String(e.department || e.dept || e.dep || ''), emp = String(e.employer || e.em || ''), typ = String(e.empType || ''), cat = String(e.excelCategory || '');
  if (/تمهير/.test(emp) || /تمهير/.test(job) || /تمهير/.test(dep)) return 'tamheer';
  if (/استشاري|مستشار|استشاريه|استشارية/.test(job) || cat === 'consultant' || /مهمة محددة/.test(typ)) return 'consultant';
  if (/متدرب|تدريب|trainee|intern/i.test(job) || /^\s*تدريب\s*$/.test(dep) || /تدريب/.test(emp) || /متدرب/.test(typ)) return 'trainee';
  return '';
}
import { rt } from './runtime';
/** النوع الخاص (استشاري/تمهير/تدريب/غير خاضع) */
export const isSpecial = (e) => !!kindOf(e);
const KINDS = ['tamheer', 'trainee', 'consultant'];
/** استحقاقات الأنواع الخاصة من الإعدادات (الافتراضي: لا إجازات ولا مكافأة). rights[kind] = { leave, eos } */
export function kindRight(kind, what) { const r = rt.kindRights; return !!(r && r[kind] && r[kind][what] === true); }
/** لا مكافأة نهاية خدمة: الأنواع الخاصة إلا لو الإعدادات فعّلت استحقاق المكافأة لنوعها */
export const noEos = (e) => { const k = kindOf(e); if (!k) return false; return KINDS.includes(k) ? !kindRight(k, 'eos') : true; };
/** لا إجازات: الأنواع الخاصة إلا لو الإعدادات فعّلت استحقاق الإجازة لنوعها */
export const noLeave = (e) => { const k = kindOf(e); if (!k) return false; return KINDS.includes(k) ? !kindRight(k, 'leave') : true; };
/** إعفاء من التأمينات: النوع المشتق أو insSystem === 'exempt' */
export const insExempt = (e) => !!(e && e.insSystem === 'exempt') || isSpecial(e);
