import { shortName } from '../../lib/names.js';
// تصدير Excel + الطباعة المختصرة للمسير (A4 عرضي) — نفس محتوى النظام القديم
import { PAYX as X } from '../../engines/payx.js';
import { num, sums, sameCur, fxOf } from '../../engines/payrollRows.js';
import { money, dmy } from './cols.jsx';
import { esc } from '../../lib/print.js';
import { buildXlsx, colL } from '../../lib/xlsx.js';

export const MONTHS_AR = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const MONTHS_EN = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const val = (r, t) => {
  const g = {
    'م': r.idx, 'الرقم': r.empNo, 'الاسم': r.name, 'الجنسية': r.nat, 'نطاق العمل': r.employer, 'الوظيفة': r.job, 'بداية العقد': dmy(r.join), 'نهاية العقد / آخر يوم': dmy(r.lastDay || r.contractEnd), 'مدة التعاقد (شهر)': r.contractMonths,
    'سنوات الخدمة': (r.K == null || Number.isNaN(r.K)) ? '' : Math.round(r.K * 100) / 100, 'سبب الإنهاء': r.eosLaw, 'المستحق سنويًا (يوم)': r.leaveDays, 'رصيد المستحق خلال فترة التعاقد': r.N,
    'ما تم استحقاقه (يوم)': X.findReason(r.reason) || r.usedManual != null ? num(r.usedManual != null ? r.usedManual : r.usedAuto) : '', 'الرصيد المستحق (يوم)': r.P, 'الأساسي': r.sal, 'العملة': r.currency, 'معدل الصرف': r.exchRate,
    'الراتب شامل البدلات': r.allIn, 'أيام العمل': r.workDays, 'أيام التأمينات': r.insDays, 'الراتب حسب الأيام': r.salByDays, 'ساعات الإضافي': r.otHours || 0, 'إضافي': r.overtime, 'سكن': r.houPay, 'مواصلات': r.traPay,
    'مشروع (شهري)': r.prjPay, 'أخرى (شهري)': r.othPay, 'بدل أجازة': r.leaveComp, 'خدمة (سنة)': r.svcY, 'خدمة (شهر)': r.svcM, 'خدمة (يوم)': r.svcD, 'تكلفة السنوات': r.costY, 'تكلفة الشهور': r.costM, 'تكلفة الأيام': r.costD,
    'إجمالي المكافأة': r.eos, 'مكافأة نهاية الخدمة': r.eosAmt, 'إجمالي المستحق': r.totalDue, 'سلف / غياب': r.loanDeduct, 'تأمينات موظف': r.noInsDeduct ? 0 : r.insEmp, 'ضريبة كسب العمل': r.tax, 'صندوق الشهداء': r.mf, 'أخرى': r.otherDeduct,
    'الأجر الخاضع للتأمينات': r.insBase, 'تأمينات شركة': r.insEr, 'حالة التأمينات': r.insStatus, 'إجمالي المستقطع': r.totalDeduct, 'المستحق بالعملة': r.net, 'الصافي (ريال سعودي)': r.netSAR, 'الصافي (جنيه مصري)': r.netSAR, 'طريقة الدفع': r.payMethod, 'ملاحظات': r.notes,
  }[t];
  if (typeof g === 'number' && Number.isFinite(g)) return Math.round(g * 100) / 100;
  return g == null || (typeof g === 'number' && !Number.isFinite(g)) ? '' : g;
};
/** تصدير المسير إلى Excel بمعادلات حقيقية: الراتب بالأيام، إجمالي المستحق، إجمالي المستقطع، الصافي، الصافي بالريال، إجمالي المكافأة، والإجماليات (SUM / SUMPRODUCT بسعر الصرف)،
 *  وتفصيل العملات وطرق الدفع بمعادلات SUMIF. أي تعديل في خلية بالإكسيل يعيد حساب الباقي. */
export function payrollXlsx(rows, cols, SUMCOL, y, m) {
  const heads = cols.map((c) => c.t), L = {}; heads.forEach((h, i) => { L[h] = colL(i); });
  const has = (...h) => h.every((x) => L[x]); const n = rows.length, last = n + 1, r2 = (v) => Math.round(num(v) * 100) / 100;
  const netSarH = heads.find((h) => /^الصافي \(/.test(h));
  const data = [heads];
  rows.forEach((r, i) => {
    const x = i + 2, row = cols.map((c) => (c.t === 'معدل الصرف' ? fxOf(r) : val(r, c.t)));
    const set = (h, f, v) => { const ci = heads.indexOf(h); if (ci >= 0) row[ci] = { f, v: r2(v) }; };
    const c = (h) => L[h] + x;
    if (has('الراتب حسب الأيام', 'الأساسي', 'أيام العمل') && num(r.days) > 0) set('الراتب حسب الأيام', c('الأساسي') + '*' + c('أيام العمل') + '/' + num(r.days), r.salByDays);
    if (has('إجمالي المكافأة', 'تكلفة السنوات', 'تكلفة الشهور', 'تكلفة الأيام')) set('إجمالي المكافأة', c('تكلفة السنوات') + '+' + c('تكلفة الشهور') + '+' + c('تكلفة الأيام'), r.eos);
    const dueH = ['الراتب حسب الأيام', 'إضافي', 'سكن', 'مواصلات', 'مشروع (شهري)', 'أخرى (شهري)', 'بدل أجازة', 'مكافأة نهاية الخدمة'];
    if (has(...dueH)) set('إجمالي المستحق', dueH.map(c).join('+') + (num(r.otherAllow) ? '+' + num(r.otherAllow) : ''), r.totalDue);
    const dedH = ['سلف / غياب', 'تأمينات موظف', 'أخرى', 'ضريبة كسب العمل', 'صندوق الشهداء'].filter((h) => L[h]);
    if (has('سلف / غياب', 'تأمينات موظف', 'أخرى')) set('إجمالي المستقطع', dedH.map(c).join('+'), r.totalDeduct);
    if (has('إجمالي المستحق', 'إجمالي المستقطع', 'المستحق بالعملة')) set('المستحق بالعملة', c('إجمالي المستحق') + '-' + c('إجمالي المستقطع'), r.net);
    if (netSarH && has('المستحق بالعملة', 'معدل الصرف')) set(netSarH, c('المستحق بالعملة') + '*' + c('معدل الصرف'), r.netSAR);
    data.push(row);
  });
  const s = sums(rows), cum = sameCur(rows);
  const tot = cols.map((c, i) => {
    if (i === 0) return 'الإجمالي (بعد تحويل العملات إلى الريال)';
    const k = SUMCOL[c.t]; if (!k) return '';
    const rng = L[c.t] + '2:' + L[c.t] + last;
    if (k === 'netSAR' || (k === 'net' && cum)) return { f: 'SUM(' + rng + ')', v: r2(s[k]) };
    if (k === 'net') return '';
    return L['معدل الصرف'] ? { f: 'SUMPRODUCT(' + rng + ',' + L['معدل الصرف'] + '2:' + L['معدل الصرف'] + last + ')', v: r2(s[k]) } : { f: 'SUM(' + rng + ')', v: r2(s[k]) };
  });
  data.push(tot);
  // تفصيل العملات (SUMIF) + طرق الدفع
  const q = (t) => '"' + String(t).replace(/"/g, '""') + '"';
  const curs = []; rows.forEach((r) => { const c = r.currency || 'ريال سعودي'; if (!curs.includes(c)) curs.push(c); });
  if (has('العملة', 'إجمالي المستحق', 'المستحق بالعملة') && netSarH) {
    data.push([], ['تفصيل العملات'], ['العملة', 'عدد الموظفين', 'إجمالي المستحق (بالعملة)', 'إجمالي المستقطع (بالعملة)', 'الصافي (بالعملة)', 'يعادل بالريال']);
    const cr = L['العملة'] + '2:' + L['العملة'] + last, col = (h) => L[h] + '2:' + L[h] + last;
    curs.forEach((c) => {
      const li = rows.filter((r) => (r.currency || 'ريال سعودي') === c), sm = (k) => li.reduce((a, r) => a + num(r[k]), 0);
      data.push([c, { f: 'COUNTIF(' + cr + ',' + q(c) + ')', v: li.length }, { f: 'SUMIF(' + cr + ',' + q(c) + ',' + col('إجمالي المستحق') + ')', v: r2(sm('totalDue')) },
        L['إجمالي المستقطع'] ? { f: 'SUMIF(' + cr + ',' + q(c) + ',' + col('إجمالي المستقطع') + ')', v: r2(sm('totalDeduct')) } : '', { f: 'SUMIF(' + cr + ',' + q(c) + ',' + col('المستحق بالعملة') + ')', v: r2(sm('net')) }, { f: 'SUMIF(' + cr + ',' + q(c) + ',' + col(netSarH) + ')', v: r2(sm('netSAR')) }]);
    });
    const a = data.length - curs.length + 1; // أول صف عملة (رقم الصف في الإكسيل)
    data.push(['الإجمالي الكلي بالريال', '', '', '', '', { f: 'SUM(F' + a + ':F' + (a + curs.length - 1) + ')', v: r2(s.netSAR) }]);
  }
  if (has('طريقة الدفع') && netSarH) {
    data.push([], ['حسب طريقة الدفع (ر.س)']);
    const pr = L['طريقة الدفع'] + '2:' + L['طريقة الدفع'] + last, sr = L[netSarH] + '2:' + L[netSarH] + last, pays = [];
    rows.forEach((r) => { const p = r.payMethod || 'مدد'; if (!pays.includes(p)) pays.push(p); });
    pays.forEach((p) => data.push([p, { f: 'SUMIF(' + pr + ',' + q(p) + ',' + sr + ')', v: r2(rows.filter((r) => (r.payMethod || 'مدد') === p).reduce((a, r) => a + num(r.netSAR), 0)) }]));
  }
  const blob = buildXlsx([{ name: 'رواتب الموظفين', rows: data, raw: true, widths: cols.map((c, i) => (i === 2 ? 30 : (i < 6 ? 14 : 15))) }]);
  return { blob, name: 'payroll_' + y + '_' + String(m).padStart(2, '0') + '.xlsx' };
}

const PCSS = '<style>@page{size:A4 landscape;margin:8mm 9mm}*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#10231c;font-size:8.2px;direction:rtl}'
  + '.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #014D3D;padding-bottom:4px;margin-bottom:5px}.hd img{height:12mm}.hd .t{text-align:center;flex:1}.hd .t b{display:block;font-size:13px;color:#014D3D}.hd .t span{font-size:9.5px;color:#555}'
  + 'table{width:100%;border-collapse:collapse;table-layout:auto}thead{display:table-header-group}tr{page-break-inside:avoid}th{background:#014D3D;color:#fff;padding:3px 2px;font-size:8px;font-weight:700;text-align:center;border:1px solid #014D3D}td{padding:1.5px 3px;border:1px solid #d9e3df;text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap}td.n{text-align:right;font-weight:700;white-space:normal}'
  + 'tr.g td{background:#e8f3ee;font-weight:800;color:#014D3D;text-align:right}tr.s td{background:#f1f6f4;font-weight:800}tr.gt td{background:#014D3D;color:#fff;font-weight:800;font-size:9px}'
  + '.sum{display:flex;gap:5px;margin:4px 0}.sum div{flex:1;border:1px solid #d9e3df;border-radius:6px;padding:4px 6px;background:#f7faf9}.sum b{display:block;font-size:11px;color:#014D3D}.sum span{font-size:8px;color:#666}'
  + '.sg{display:flex;justify-content:space-around;margin-top:3px;page-break-inside:avoid}.sg div{text-align:center;width:26%;font-size:8.5px;font-weight:700}.sg i{display:block;border-top:1px solid #333;margin-top:9px;padding-top:1px;font-style:normal;font-weight:400;color:#555}'
  + '.ft2{font-size:7.5px;color:#666;margin:2px 0}table.fx{width:auto;margin:4px 0;min-width:60%}table.fx td,table.fx th{padding:2px 6px}.pay{margin:4px 0;padding:4px 8px;border:1px solid #014D3D;border-radius:5px;background:#f1f6f4;font-size:9.5px;font-weight:700}.pay b{color:#014D3D;font-size:10.5px}td.nt{text-align:right;white-space:normal;min-width:70px;font-size:7.5px}.ft{margin-top:3px;font-size:7.5px;color:#777;text-align:center;border-top:1px solid #ddd;padding-top:3px}.cur{color:#a15c00}</style>';


/** أعمدة ورقة طباعة المسير القابلة للاختيار. def: العمود يظهر افتراضيًا؟ ('auto' = يظهر فقط لو فيه قيم) */
export const PRINT_COLS = [
  { k: 'idx', ar: 'م', en: '#', def: 1, cell: (r, i) => i + 1 },
  { k: 'empNo', ar: 'الرقم الوظيفي', en: 'Emp. no.', def: 0, cell: (r) => esc(r.empNo) },
  { k: 'name', ar: 'الاسم', en: 'Employee', def: 1, cls: 'n', cell: (r) => esc(shortName(String(r.name || ''))) },
  { k: 'nat', ar: 'الجنسية', en: 'Nationality', def: 0, cell: (r) => esc(r.nat) },
  { k: 'job', ar: 'الوظيفة', en: 'Job', def: 0, cell: (r) => esc(r.job) },
  { k: 'workDays', ar: 'أيام', en: 'Days', def: 1, cell: (r) => num(r.workDays) },
  { k: 'insDays', ar: 'أيام التأمينات', en: 'Ins. days', def: 0, cell: (r) => num(r.insDays) },
  { k: 'sal', ar: 'الأساسي', en: 'Basic', def: 1, sum: 'sal', cell: (r) => money(r.sal) },
  { k: 'salByDays', ar: 'الراتب حسب الأيام', en: 'Salary by days', def: 0, sum: 'salByDays', cell: (r) => money(r.salByDays) },
  { k: 'hou', ar: 'سكن', en: 'Housing', def: 1, sum: 'houPay', cell: (r) => money(r.houPay) },
  { k: 'tra', ar: 'مواصلات', en: 'Transport', def: 1, sum: 'traPay', cell: (r) => money(r.traPay) },
  { k: 'prjoth', ar: 'مشروع + أخرى', en: 'Project + other', def: 1, sumF: (s) => s.prjPay + s.othPay, cell: (r) => money(num(r.prjPay) + num(r.othPay) + num(r.otherAllow)) },
  { k: 'ot', ar: 'إضافي', en: 'Overtime', def: 1, sum: 'overtime', cell: (r) => money(r.overtime) },
  { k: 'leave', ar: 'بدل إجازة', en: 'Leave pay', def: 1, sum: 'leaveComp', cell: (r) => money(r.leaveComp) },
  { k: 'eos', ar: 'مكافأة نهاية الخدمة', en: 'End-of-service', def: 1, sum: 'eosAmt', cell: (r) => money(r.eosAmt) },
  { k: 'due', ar: 'إجمالي المستحق', en: 'Total due', def: 1, sum: 'totalDue', b: 1, cell: (r) => money(r.totalDue) },
  { k: 'loan', ar: 'سلف / غياب', en: 'Advances / absence', def: 1, sum: 'loanDeduct', cell: (r) => money(r.loanDeduct) },
  { k: 'ins', ar: 'تأمينات الموظف', en: 'Employee insurance', def: 1, sumL: (l) => l.reduce((a, r) => a + (r.noInsDeduct ? 0 : num(r.insEmp)) * fxOf(r), 0), cell: (r) => money(r.insEmp && !r.noInsDeduct ? r.insEmp : 0) },
  { k: 'tax', ar: 'ضريبة كسب العمل', en: 'Income tax', def: 'auto', sum: 'tax', cell: (r) => money(r.tax) },
  { k: 'mf', ar: 'صندوق الشهداء', en: 'Martyrs fund', def: 'auto', sum: 'mf', cell: (r) => money(r.mf) },
  { k: 'oth', ar: 'خصومات أخرى', en: 'Other deductions', def: 1, sum: 'otherDeduct', cell: (r) => money(r.otherDeduct) },
  { k: 'ded', ar: 'إجمالي المستقطع', en: 'Total deductions', def: 1, sum: 'totalDeduct', b: 1, cell: (r) => money(r.totalDeduct) },
  { k: 'net', ar: 'الصافي', en: 'Net', def: 1, sum: 'net', netCol: 1, b: 1, cell: (r) => money(r.net) },
  { k: 'cur', ar: 'العملة', en: 'Currency', def: 1, cls: 'cur', cell: (r) => esc(r.currency && r.currency !== 'ريال سعودي' ? r.currency : 'ر.س') },
  { k: 'fx', ar: 'سعر الصرف', en: 'Rate', def: 0, cell: (r) => num(fxOf(r)) },
  { k: 'netSAR', ar: 'الصافي (ر.س)', en: 'Net (SAR)', def: 1, sum: 'netSAR', b: 1, cell: (r) => money(r.netSAR) },
  { k: 'pay', ar: 'طريقة الدفع', en: 'Payment method', def: 0, cell: (r) => esc(r.payMethod || 'مدد') },
  { k: 'iban', ar: 'الآيبان', en: 'IBAN', def: 0, cell: (r) => esc(r.iban) },
  { k: 'notes', ar: 'ملاحظات', en: 'Notes', def: 1, cls: 'nt', cell: (r) => esc(r.notes) },
];
const PC_KEY = 'ariba_payroll_print_cols_v2';
/** الأعمدة الافتراضية (مع إظهار الضريبة/صندوق الشهداء تلقائيًا لو فيه قيم) */
export function defaultPrintCols(rows) {
  const any = (k) => rows.some((r) => num(r[k]) !== 0);
  return PRINT_COLS.filter((c) => c.def === 1 || (c.def === 'auto' && any(c.k === 'tax' ? 'tax' : 'mf'))).map((c) => c.k);
}
export function loadPrintCols(rows) {
  try { const v = JSON.parse(localStorage.getItem(PC_KEY) || 'null'); if (Array.isArray(v) && v.length) { const ok = v.filter((k) => PRINT_COLS.some((c) => c.k === k)); if (ok.length) return ok; } } catch { /* ignore */ }
  return defaultPrintCols(rows);
}
export function savePrintCols(keys) { try { localStorage.setItem(PC_KEY, JSON.stringify(keys)); } catch { /* ignore */ } }

/** يرجع HTML كامل لطباعة المسير (كل القيم مهرّبة esc). cols = مفاتيح الأعمدة المختارة بالترتيب الأصلي */
export function payrollPrintHtml(rows, { y, m, logo, signer, en = false, companyTitle, cols }) {
  const mn = (en ? MONTHS_EN : MONTHS_AR)[m] + ' ' + y, order = [], by = {};
  rows.forEach((r) => { const k = r.employer || '—'; if (!by[k]) { by[k] = []; order.push(k); } by[k].push(r); });
  const sel = new Set((cols && cols.length) ? cols : defaultPrintCols(rows));
  const C = PRINT_COLS.filter((c) => sel.has(c.k));
  const sumCell = (c, list, s) => {
    if (c.sumL) return money(c.sumL(list));
    if (c.sumF) return money(c.sumF(s));
    if (c.sum) return (c.netCol && !sameCur(list)) ? '—' : money(s[c.sum]);
    return '';
  };
  const firstSum = Math.max(1, C.findIndex((c) => c.sum || c.sumF || c.sumL));
  const hasSum = C.some((c) => c.sum || c.sumF || c.sumL);
  const tr = (r, i) => '<tr>' + C.map((c) => {
    const v = c.cell(r, i); const t = c.k === 'name' && fxOf(r) !== 1 ? v + ' <span class="cur">(' + esc(r.currency) + ')</span>' : v;
    return '<td' + (c.cls ? ' class="' + c.cls + '"' : '') + '>' + (c.b ? '<b>' + t + '</b>' : t) + '</td>';
  }).join('') + '</tr>';
  const srow = (label, list, cls) => { const s = sums(list); const lab = '<td colspan="' + (hasSum ? firstSum : C.length) + '" style="text-align:right">' + esc(label) + ' (' + list.length + ')</td>';
    return '<tr class="' + cls + '">' + lab + C.slice(hasSum ? firstSum : C.length).map((c) => '<td>' + sumCell(c, list, s) + '</td>').join('') + '</tr>'; };
  let body = '', n = 0;
  order.forEach((k) => { body += '<tr class="g"><td colspan="' + C.length + '">' + esc(k) + '</td></tr>'; by[k].forEach((r) => { body += tr(r, n++); }); body += srow((en ? 'Total ' : 'إجمالي ') + k, by[k], 's'); });
  body += srow(en ? 'Grand total (SAR)' : 'الإجمالي العام (ر.س)', rows, 'gt');

  const s = sums(rows), byCur = {}, byPay = {};
  rows.forEach((r) => {
    const c = r.currency || 'ريال سعودي', f = fxOf(r), o = byCur[c] || (byCur[c] = { n: 0, due: 0, ded: 0, net: 0, sar: 0, fx: new Set() });
    o.n++; o.due += num(r.totalDue); o.ded += num(r.totalDeduct); o.net += num(r.net); o.sar += num(r.netSAR); o.fx.add(f);
    const p = r.payMethod || 'مدد'; byPay[p] = (byPay[p] || 0) + num(r.netSAR);
  });
  const foreign = Object.keys(byCur).filter((c) => c !== 'ريال سعودي');
  const box = (v, l) => '<div><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>';
  const curTxt = Object.keys(byCur).map((c) => money(byCur[c].net) + ' ' + (c === 'ريال سعودي' ? 'ر.س' : c)).join(' + ');
  const payTxt = Object.keys(byPay).map((k) => esc(k) + ' <b>' + money(byPay[k]) + '</b>').join(' &nbsp;·&nbsp; ');
  // تفصيل العملات: يظهر فقط لو في عملة غير الريال — ثم الإجمالي الكلي بعد التحويل
  let fxBlock = '';
  if (foreign.length) {
    const rowsFx = Object.keys(byCur).map((c) => { const o = byCur[c], sar = c === 'ريال سعودي', fx = [...o.fx]; return '<tr><td class="n">' + esc(sar ? 'ر.س (ريال سعودي)' : c) + '</td><td>' + o.n + '</td><td>' + (sar ? '1' : (fx.length === 1 ? fx[0] : (en ? 'various' : 'متعدد'))) + '</td><td>' + money(o.due) + '</td><td>' + money(o.ded) + '</td><td><b>' + money(o.net) + '</b></td><td><b>' + money(o.sar) + '</b></td></tr>'; }).join('');
    fxBlock = '<table class="fx"><thead><tr>' + (en ? ['Currency', 'Employees', 'Rate (SAR)', 'Total due', 'Deductions', 'Net (currency)', 'Net in SAR'] : ['العملة', 'عدد الموظفين', 'سعر الصرف (ر.س)', 'إجمالي المستحق', 'الاستقطاعات', 'الصافي بالعملة', 'يعادل بالريال']).map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rowsFx
      + '<tr class="gt"><td colspan="6" style="text-align:right">' + (en ? 'Grand total net after converting to SAR' : 'الإجمالي الكلي للصافي بعد تحويل العملات إلى الريال') + '</td><td>' + money(s.netSAR) + '</td></tr></tbody></table>';
  }
  const dedNote = en ? 'Advances + employee insurance + tax / martyrs fund + other deductions' : 'سلف/غياب + تأمينات الموظف + ضريبة/صندوق (إن وُجد) + خصومات أخرى';
  const sg = signer || { titleAr: 'مدير الموارد البشرية', nameAr: '' };
  return PCSS + '<div class="hd"><div class="t"><b>' + esc(companyTitle || 'كشف رواتب ومكافآت الموظفين') + '</b><span>عن شهر ' + esc(mn) + ' — عدد الموظفين ' + rows.length + '</span></div>' + (logo ? '<img src="' + esc(logo) + '" alt="">' : '') + '</div>'
    + '<table><thead><tr>' + C.map((c) => '<th>' + esc(en ? c.en : c.ar) + '</th>').join('') + '</tr></thead><tbody>' + body + '</tbody></table>'
    + '<div class="sum">' + box(money(s.totalDue), (en ? 'Total due (SAR)' : 'إجمالي المستحقات (ر.س)')) + box(money(s.totalDeduct), (en ? 'Total deductions (SAR)' : 'إجمالي الاستقطاعات (ر.س)')) + box(curTxt, en ? 'Net by currency' : 'الصافي بالعملات') + box(money(s.netSAR), en ? 'Net (SAR)' : 'الصافي (ر.س)') + box(money(s.insEr), en ? 'Employer insurance' : 'تأمينات الشركة') + '</div>'
    + '<div class="ft2">' + esc(en ? 'Total deductions =' : 'إجمالي الاستقطاعات =') + ' ' + esc(dedNote) + '</div>'
    + fxBlock
    + '<div class="pay">' + (en ? 'By payment method (SAR): ' : 'حسب طريقة الدفع (ر.س): ') + payTxt + '</div>'
    + '<div class="sg"><div>' + esc(sg.titleAr) + '<i>' + esc(sg.nameAr) + '</i></div><div>المدير المالي<i></i></div><div>الرئيس التنفيذي<i></i></div></div>';
}
