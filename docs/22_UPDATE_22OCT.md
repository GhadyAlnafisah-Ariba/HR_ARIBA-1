# HR's 22 October update — ported — تحديث 22 أكتوبر من قسم HR (منقول)

> English first, then Arabic. Source: github.com/Mohamed-Awad-Ariba/Ariba-HR, commit `3128689` (read-only copy in `reference/hr-react/ARIBA_HR_React_22oct`).
> Restore point before this work: git tag `25oct-v` (= `b7f5c10`, the same as `main` on GitHub) and `~/Desktop/HR/backups/25oct v/`.

# English

## What was ported (all logic taken from their code; our design, palette, digits and server)
| # | Feature | Where it lives here |
|---|---|---|
| 1 | Special-type entitlements (Tamheer / trainee / consultant): no leave, no end-of-service, no leave pay unless Settings grants it (`special_rights`) | `lib/calc/{empkind,payx,payroll-rows,country,leave-annual,runtime}.ts`, `port/engines/{leave,payrollRows}.js`, `services/{gosi,leave,canonical_data}.py`, `RightsCard` in Settings |
| 2 | Payroll totals converted by each row's exchange rate; «net in currency» only when one currency | `lib/calc/payroll-rows.ts` (`sums`, `sameCur`, `fxOf`), archive totals |
| 3 | Excel with real formulas; SUM totals on every exported table | `port/lib/xlsx.js`, `port/pages/payroll/output.js` |
| 4 | Payroll print: choose the columns, currency and payment-method breakdown | `port/pages/payroll/{PrintColsDlg.jsx,output.js}` |
| 5 | Announcements and greetings (manual, automatic, registered occasions, log) | `routers/port_announcements.py`, `002_announcements.sql`, scheduler job `occasions`, page `/announcements`, home card in the employee app |
| 6 | Official letterhead on documents sent to the employee or by e-mail | `port/lib/{finance,print}.js`, forms pages |
| 7 | «Ariba AI»: free questions + web search, admin commands with confirmation, employee data answers | `port/lib/{aiAgent,aiActions,empFields}.js`, `routers/port_ai.py` (key `ANTHROPIC_API_KEY`, optional) |
| 8 | Smart short name (first + father + family) | `port/lib/names.js` and the screens that cut the name |
| 9 | Small: EOS page employee picker, Egypt Art. 77 `noEos`, reports skip no-EOS types | their pages, verbatim |
| 10 | Mail: Microsoft Graph failures explain themselves and fall back to Resend when it is configured | `services/mailer.py` |

## How it was checked (logic, not only looks)
- `tools/react-parity` re-pointed at their 22/10 engines: **21 suites, 81,428 cases, 0 differences**; 111/111 comparison rows. The leave suites also run with special-type entitlements granted.
- pytest 124 passed (new: `test_port_announcements.py`, `test_port_mail_fallback.py`); `tsc`, `eslint`, `next build`, employee-app `tsc` clean.
- On the production-shaped local copy (107 employees): 2 active Tamheer employees lose their leave balance (4.49 → 0, year-end 8.34 → 0); nobody else changes. One employee is paid in dollars (the totals fix applies to him).

## Database
One migration, additive only: `docs/db-migrations/002_announcements.sql` (+ `verify_002.sql`). Run with `run_on_railway.sh` on demo, then production, **before** the code is deployed.
Settings `special_rights` and `occasions_auto` live in `ariba_app_settings` (no schema). Default = nobody entitled.

# العربي

## ما نُقل (المنطق كله من كودهم، والتصميم والألوان والأرقام والخادم من عندنا)
1. استحقاقات التمهير والتدريب والاستشاري: لا إجازات ولا مكافأة نهاية خدمة ولا بدل إجازة إلا إذا فعّلتها الإعدادات (`special_rights`).
2. مجاميع المسير تُحوَّل بسعر صرف كل صف، و«المستحق بالعملة» يظهر عند عملة واحدة فقط.
3. Excel بمعادلات حقيقية وصف إجمالي (SUM) في كل جدول مُصدَّر.
4. طباعة المسير: اختيار الأعمدة، وتفصيل العملات وطرق الدفع.
5. الإعلانات والتهاني (يدوي، تلقائي، مناسبات الموظفين، سجل) مع بطاقة في رئيسية تطبيق الموظف.
6. الورق الرسمي على المستندات المرسلة للموظف أو بالإيميل.
7. مساعد AI: أسئلة حرة وبحث ويب، وأوامر إدارية بتأكيد، وأجوبة من ملف الموظف (المفتاح `ANTHROPIC_API_KEY` اختياري).
8. الاسم المختصر الذكي (الأول + الأب + العائلة).
9. تفاصيل صغيرة: قائمة اختيار موظف في نهاية الخدمة، وإصلاح `noEos` في م.77 المصري، والتقارير تستبعد من لا مكافأة لهم.
10. البريد: أخطاء Microsoft Graph تشرح نفسها وتنتقل إلى Resend إن كان مضبوطًا.

## التحقق (من المنطق وليس الشكل فقط)
- أداة المطابقة على معادلاتهم الجديدة: **21 مجموعة و81,428 حالة، صفر فروق**، و111 من 111 صفًا. وفحوص الإجازات تعمل أيضًا مع منح الاستحقاق.
- pytest: 124 نجح. و`tsc` و`eslint` و`next build` وتطبيق الموظف: نظيفة.
- على النسخة المحلية الشبيهة بالإنتاج (107 موظفين): موظفان نشطان من التمهير يصبح رصيد إجازتهما صفرًا (4.49 ← 0، ونهاية العام 8.34 ← 0). لا يتغير أحد غيرهما. وموظف واحد براتب بالدولار ينطبق عليه إصلاح المجاميع.

## قاعدة البيانات
هجرة واحدة إضافية فقط: `docs/db-migrations/002_announcements.sql` (مع `verify_002.sql`). تُشغَّل بـ `run_on_railway.sh` على demo ثم production **قبل** نشر الكود.
الإعدادان `special_rights` و`occasions_auto` في `ariba_app_settings` بلا تغيير سكيما. الافتراضي: لا أحد مستحق.
