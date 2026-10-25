# Daily Report — 25 October 2026 — تقرير يوم 25 أكتوبر 2026

> English first, then the full Arabic version (same content).
> Restore point taken before the work: git tag `25oct-v` (= `b7f5c10`, the same as `main` on GitHub) and `~/Desktop/HR/backups/25oct v/` (copy in `25oct/`).
> Last commit of the day on `main`: `f01ed7f`.

# English

## Daily Report — 25 October 2026

### 1. Summary
- Read the whole project (final report, docs, commit log) and compared it with the HR department's repo (`Mohamed-Awad-Ariba/Ariba-HR`, update of 22/10, commit `3128689`).
- Found **8 features** they have and we did not; ported all of them with their logic, in our design, palette, digits and server.
- Deployed to **demo and production**, with one additive database migration.
- Got e-mail working on Railway Hobby through the **Gmail API (HTTPS)**; a real test message arrived.

### 2. Restore points
| Point | Contents |
|---|---|
| Tag `25oct-v` on GitHub (`b7f5c10`) | The code exactly as it was on `main` before today's work |
| `~/Desktop/HR/backups/25oct v/` and `25oct/` | Git bundle, source zip, and dumps of the two local databases (real data: never commit or share) |
| `before-react-port/` dumps (taken by `run_on_railway.sh`) | Railway demo and production before migration 002 |

### 3. The HR 22/10 update — what was ported
| # | Feature | Where it lives here |
|---|---|---|
| 1 | Announcements and greetings (manual, automatic birthday / work anniversary / registered occasions, log) | `routers/port_announcements.py`, `002_announcements.sql`, scheduler job `occasions`, page `/announcements`, home card and bell in the employee app |
| 2 | Special-type entitlements (Tamheer / trainee / consultant): no leave, no end-of-service, no leave pay unless Settings grants it (`special_rights`) | `lib/calc/{empkind,payx,payroll-rows,country,leave-annual,runtime}.ts`, `port/engines/*`, `services/{gosi,leave,canonical_data}.py`, `RightsCard` in Settings |
| 3 | Payroll totals converted by each row's exchange rate | `lib/calc/payroll-rows.ts` (`sums`, `sameCur`, `fxOf`) |
| 4 | Payroll print: choose columns, currency and payment-method breakdown | `port/pages/payroll/{PrintColsDlg.jsx,output.js}` |
| 5 | Excel with real formulas and SUM totals on every exported table | `port/lib/xlsx.js`, `port/pages/payroll/output.js` |
| 6 | Official letterhead on documents sent to the employee or by e-mail | `port/lib/{finance,print}.js`, forms pages |
| 7 | «Ariba AI»: free questions and web search, admin commands with confirmation, answers from the employee file | `port/lib/{aiAgent,aiActions,empFields}.js`, `routers/port_ai.py` (`ANTHROPIC_API_KEY`, optional) |
| 8 | Smart short name (first + father + family) and small items (EOS page employee picker, Egypt Art. 77 `noEos`) | `port/lib/names.js` and the screens that cut the name |

Their files were copied verbatim wherever ours were verbatim, and their diff was patched onto the adapted ones (`frontend/hr-web/src/port/ADAPTED.md` lists every change). Their Supabase functions and `sql/21–24` were not copied: they are replaced by our server and by `docs/db-migrations/002_announcements.sql`.

### 4. E-mail on Railway Hobby
- Railway blocks outbound SMTP (ports 465/587) outside the Pro plan. The cause was documented (Railway docs) and explained against the colleague's setup (Supabase blocks only 25 and 587).
- `services/mailer.py` now sends through the **Gmail API over HTTPS (443)** when `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` are set and the mailbox is Gmail; otherwise SMTP, then Resend, as before.
- Microsoft 365 (Graph) failures now explain themselves (consent, mailbox, token) and fall back to Resend when it is configured.
- Helper `backend/tools/gmail_oauth_token.py` (scope `gmail.send` only) obtains the refresh token once, on the owner's machine.
- Google Cloud (account `ifx71fr@gmail.com`): project «ARIBA HR Mail», Gmail API enabled, OAuth consent screen (External, Testing), Desktop client, test users added.
- Railway variables set on demo and production; the site's «send test message» delivered a real e-mail from `ifx71fr@gmail.com`.

### 5. How it was checked (logic, not only looks)
| Check | Result |
|---|---|
| `tools/react-parity` against their 22/10 formulas | 21 suites, **81,428 cases, 0 differences**; 111/111 comparison rows |
| Leave suites with special-type entitlements granted | 0 differences (ours = Python server, theirs = JS) |
| `tools/legacy-parity` (old HTML) | All suites match; the 22/10 special-type rule has its own suite (4,000/4,000) |
| Backend tests | **129 passed**, 2 skipped (new: announcements, AI route, mail fallback, Gmail API) |
| Site: `tsc`, `eslint`, `next build`; employee app `tsc` | Clean |
| Screens tried locally (synthetic database) | Announcements page, entitlements card and its saving, payroll print-columns dialog, no console errors |
| Excel formula helpers | Totals written as `SUM(...)` formulas with the right values |

Impact on existing numbers (production-shaped local copy, 107 employees): two active Tamheer employees lose their leave balance (4.49 → 0, year-end 8.34 → 0); nobody else changes. One employee is paid in dollars, so the totals fix applies to him.

### 6. Database and deployment
- Migration `docs/db-migrations/002_announcements.sql` (+ `verify_002.sql`): two new tables only (`ariba_announcements`, `ariba_emp_occasions`); no existing table or row touched. Run by the owner on demo, then production, with automatic backups. Both tables confirmed present in both databases.
- Settings `special_rights` and `occasions_auto` live in `ariba_app_settings` (no schema change). Default: nobody entitled; automatic greetings off.
- `main` pushed to GitHub; demo and production health checks answer `ok`; the new routes answer `401` without login (they exist).
- Links: demo `https://frontend-demo-b5ec.up.railway.app`, production `https://frontend-production-f9a8a.up.railway.app`.

### 7. Commits of the day on `main`
`a79e7b2` reference copy of HR's 22/10 · `f1e2052` engines, screens, announcements · `b393f9f` AI route, mail fallback, app card · `2dafa60` docs · `b50eaa6` legacy-parity suite · `65bb9f7` parity fixes and numbers · `7cecaf4` verify_002 fix · `b0b8d74` Gmail API sending · `f01ed7f` token helper port option.

### 8. What remains
**Owner actions**
1. Repeat the «send test message» on **production**.
2. Reset the Google OAuth client secret (it appeared in a tool output during setup), then update `~/Desktop/HR/gmail_oauth.env` and the Railway variable.
3. Renew the Gmail refresh token before **1 November 2026**: the Google app is in Testing, so the token lasts 7 days. Permanent fix: publish the app, which needs a company domain with homepage and privacy-policy pages on it.
4. Optional: set `ANTHROPIC_API_KEY` on Railway to enable the AI assistant's free-question mode.
5. Tamheer / trainee / consultant: decide whether to grant leave or end-of-service in Settings (default: not entitled).

**Not verified yet**
- The employee app on a real device or simulator (type-check only); its new home card for announcements.
- The employee-app side of HR's update (their repo has the HR program only).

### 9. Future plans
- **«Ariba AI» assistant.** Review finding: its command layer is keyword matching (regular expressions in `lib/aiParse.js`), not a language model; only free questions go to Claude. Known limits: negation is ignored («do not record absence» records it), questions are read as commands, one employee per sentence, no memory between commands, Egyptian dialect in the replies. Every action is still behind a confirmation card and our protected routes. Plan: let Claude extract the intent and the employee name as JSON (sending the name only, never employee data) and keep the same confirmation cards and routes.
- Publish the Google app on the company domain so the mail token does not expire.

# العربي

## تقرير يوم 25 أكتوبر 2026

### 1. الخلاصة
- فحصنا المشروع كاملًا (التقرير النهائي والوثائق وسجل الـ commits) وقارناه بريبو قسم HR (`Mohamed-Awad-Ariba/Ariba-HR`، تحديث 22/10، commit `3128689`).
- وجدنا **8 ميزات** عندهم وليست عندنا، ونُقلت كلها بمنطقهم وفي تصميمنا وألواننا وأرقامنا وخادمنا.
- نُشرت على **demo وproduction** مع هجرة قاعدة بيانات إضافية واحدة.
- اشتغل الإيميل على Railway Hobby عبر **Gmail API (HTTPS)**، ووصلت رسالة تجربة حقيقية.

### 2. نقاط الرجوع
| النقطة | المحتوى |
|---|---|
| وسم `25oct-v` على GitHub (`b7f5c10`) | الكود كما كان على `main` قبل عمل اليوم |
| `~/Desktop/HR/backups/25oct v/` و`25oct/` | حزمة git ونسخة المصدر ونسختان من القاعدتين المحليتين (بيانات حقيقية: لا تُرفع ولا تُشارَك) |
| نسخ `before-react-port/` (يأخذها `run_on_railway.sh`) | قاعدتا Railway (demo وproduction) قبل الهجرة 002 |

### 3. تحديث HR بتاريخ 22/10 — ما نُقل
| # | الميزة | مكانها عندنا |
|---|---|---|
| 1 | الإعلانات والتهاني (يدوي، تلقائي: ميلاد وسنوية تعيين ومناسبات مسجلة، وسجل) | `routers/port_announcements.py`، `002_announcements.sql`، مهمة مجدولة `occasions`، صفحة `/announcements`، بطاقة في رئيسية تطبيق الموظف وفي الجرس |
| 2 | استحقاقات التمهير والتدريب والاستشاري: لا إجازة ولا مكافأة نهاية خدمة ولا بدل إجازة إلا إذا منحتها الإعدادات (`special_rights`) | `lib/calc/{empkind,payx,payroll-rows,country,leave-annual,runtime}.ts`، `port/engines/*`، `services/{gosi,leave,canonical_data}.py`، بطاقة `RightsCard` في الإعدادات |
| 3 | مجاميع المسير تُحوَّل بسعر صرف كل صف | `lib/calc/payroll-rows.ts` (`sums` و`sameCur` و`fxOf`) |
| 4 | طباعة المسير: اختيار الأعمدة وتفصيل العملات وطرق الدفع | `port/pages/payroll/{PrintColsDlg.jsx,output.js}` |
| 5 | Excel بمعادلات حقيقية وصف إجمالي SUM في كل جدول مُصدَّر | `port/lib/xlsx.js`، `port/pages/payroll/output.js` |
| 6 | الورق الرسمي على المستندات المرسلة للموظف أو بالإيميل | `port/lib/{finance,print}.js` وصفحات النماذج |
| 7 | «اريبا AI»: أسئلة حرة وبحث ويب، وأوامر إدارية بتأكيد، وأجوبة من ملف الموظف | `port/lib/{aiAgent,aiActions,empFields}.js`، `routers/port_ai.py` (المفتاح `ANTHROPIC_API_KEY` اختياري) |
| 8 | الاسم المختصر الذكي (الأول + الأب + العائلة) وتفاصيل صغيرة (قائمة اختيار موظف في نهاية الخدمة، وإصلاح `noEos` في م.77 المصري) | `port/lib/names.js` والشاشات التي تقص الاسم |

نُسخت ملفاتهم كما هي حيث كانت نسختنا حرفية، وطُبّق فرقهم على الملفات المعدّلة (كل التغييرات في `frontend/hr-web/src/port/ADAPTED.md`). لم تُنسخ دوال Supabase ولا `sql/21–24`، بل عُوّضت بخادمنا وبـ `docs/db-migrations/002_announcements.sql`.

### 4. الإيميل على Railway Hobby
- Railway يمنع SMTP الصادر (المنفذان 465 و587) خارج خطة Pro. وُثّق السبب (وثائق Railway) وفُسّر الفرق عن إعداد الزميل (Supabase يحجب 25 و587 فقط).
- `services/mailer.py` يرسل الآن عبر **Gmail API على HTTPS (443)** عند ضبط `GMAIL_CLIENT_ID` و`GMAIL_CLIENT_SECRET` و`GMAIL_REFRESH_TOKEN` وكون صندوق البريد Gmail؛ وإلا SMTP ثم Resend كما كان.
- أخطاء Microsoft 365 (Graph) صارت تشرح نفسها (الموافقة والصندوق والتوكن)، وتنتقل إلى Resend إن كان مضبوطًا.
- سكربت `backend/tools/gmail_oauth_token.py` (صلاحية `gmail.send` فقط) يستخرج التوكن مرة واحدة على جهاز المالك.
- Google Cloud (حساب `ifx71fr@gmail.com`): مشروع «ARIBA HR Mail»، وتفعيل Gmail API، وشاشة موافقة OAuth (External، وضع Testing)، وبيانات Desktop، وإضافة المستخدمين التجريبيين.
- المتغيرات مضبوطة على demo وproduction، وزر «إرسال رسالة تجربة» في الموقع أوصل إيميلًا حقيقيًا من `ifx71fr@gmail.com`.

### 5. كيف تم التحقق (من المنطق وليس الشكل فقط)
| الفحص | النتيجة |
|---|---|
| `tools/react-parity` على معادلاتهم الجديدة | 21 مجموعة، **81,428 حالة، 0 فروق**، و111 من 111 صفًا |
| فحوص الإجازات مع منح الاستحقاق | 0 فروق (خادمنا بـ Python مقابل كودهم بـ JS) |
| `tools/legacy-parity` (الـ HTML القديم) | كل المجموعات تطابق، وقاعدة الأنواع الخاصة لها مجموعة مستقلة (4,000 من 4,000) |
| اختبارات الخادم | **129 ناجحًا**، و2 متخطّى (الجديد: الإعلانات ومسار AI وبديل البريد وGmail API) |
| الموقع: `tsc` و`eslint` و`next build`، وتطبيق الموظف `tsc` | نظيفة |
| تجربة الشاشات محليًا (قاعدة اصطناعية) | صفحة الإعلانات، وبطاقة الاستحقاقات وحفظها، ونافذة أعمدة الطباعة، بلا أخطاء في الـ console |
| دوال Excel | الإجماليات تُكتب معادلات `SUM(...)` بقيم صحيحة |

الأثر على الأرقام الموجودة (النسخة المحلية الشبيهة بالإنتاج، 107 موظفين): موظفان نشطان من التمهير يصبح رصيد إجازتهما صفرًا (4.49 ← 0، ونهاية العام 8.34 ← 0). لا يتغير أحد غيرهما. وموظف واحد براتب بالدولار ينطبق عليه إصلاح المجاميع.

### 6. قاعدة البيانات والنشر
- هجرة `docs/db-migrations/002_announcements.sql` (مع `verify_002.sql`): جدولان جديدان فقط (`ariba_announcements` و`ariba_emp_occasions`) ولا يُمس أي جدول أو صف موجود. شغّلها المالك على demo ثم production مع نسخ احتياطية تلقائية، وتأكدنا من وجود الجدولين في القاعدتين.
- الإعدادان `special_rights` و`occasions_auto` في `ariba_app_settings` (بلا تغيير سكيما). الافتراضي: لا أحد مستحق، والتهاني التلقائية متوقفة.
- دُفع `main` إلى GitHub؛ والخادمان في demo وproduction يردّان `ok`، والمسارات الجديدة ترد `401` بلا دخول (أي أنها موجودة).
- الروابط: demo `https://frontend-demo-b5ec.up.railway.app`، وproduction `https://frontend-production-f9a8a.up.railway.app`.

### 7. commits اليوم على `main`
`a79e7b2` نسخة مرجعية لتحديث HR · `f1e2052` المحركات والشاشات والإعلانات · `b393f9f` مسار AI وبديل البريد وبطاقة التطبيق · `2dafa60` الوثائق · `b50eaa6` مجموعة legacy-parity · `65bb9f7` إصلاحات المطابقة والأرقام · `7cecaf4` إصلاح verify_002 · `b0b8d74` الإرسال عبر Gmail API · `f01ed7f` خيار المنفذ في سكربت التوكن.

### 8. ما تبقى
**إجراءات على المالك**
1. إعادة «إرسال رسالة تجربة» على **production**.
2. إعادة تعيين Client Secret في Google (ظهر في مخرجات أداة أثناء الإعداد)، ثم تحديث `~/Desktop/HR/gmail_oauth.env` ومتغير Railway.
3. تجديد توكن Gmail قبل **1 نوفمبر 2026**: التطبيق في وضع Testing فالتوكن يدوم 7 أيام. الحل الدائم: نشر التطبيق في Google، وهذا يحتاج نطاق الشركة وصفحتي موقع وخصوصية عليه.
4. اختياري: إضافة `ANTHROPIC_API_KEY` في Railway لتفعيل وضع الأسئلة الحرة في مساعد AI.
5. قرار بشأن التمهير والتدريب والاستشاري: هل تُمنح الإجازة أو مكافأة نهاية الخدمة من الإعدادات (الافتراضي: لا استحقاق).

**لم يُتحقق منه بعد**
- تطبيق الموظف على جهاز حقيقي أو محاكٍ (فُحص بـ `tsc` فقط)، ومنه بطاقة الإعلانات الجديدة في رئيسيته.
- الجزء الخاص بتطبيق الموظف من تحديث HR (ريبوهم فيه برنامج HR فقط).

### 9. الخطط المستقبلية
- **مساعد «اريبا AI».** نتيجة المراجعة: طبقة الأوامر مطابقة كلمات (تعابير نمطية في `lib/aiParse.js`) وليست نموذجًا لغويًا، ولا يذهب إلى Claude إلا الأسئلة الحرة. حدودها المعروفة: النفي مُهمَل («لا تسجل غياب» يسجله)، والأسئلة تُفهم أوامر، وموظف واحد في الجملة، ولا ذاكرة بين الأوامر، وردود بلهجة مصرية. وكل إجراء يبقى خلف بطاقة تأكيد ومساراتنا المحمية. الخطة: أن يستخرج Claude النية واسم الموظف كـ JSON (يُرسَل الاسم فقط لا بيانات الموظف)، مع إبقاء بطاقات التأكيد والمسارات نفسها.
- نشر تطبيق Google على نطاق الشركة حتى لا ينتهي توكن البريد.
