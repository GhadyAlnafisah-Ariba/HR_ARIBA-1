# Work Log — 25–26 October 2026 — سجل العمل 25–26 أكتوبر 2026

> English first, then the full Arabic version (same content).
> Restore point taken before the work: git tag `25oct-v` (= `b7f5c10`) and `~/Desktop/HR/backups/25oct v/`.
> Last commit on `main` at the end of 26 Oct: `ac69a51`.
> Detail of the 25 Oct work: `23_DAILY_REPORT_25OCT.md`. Detail of the PWA build: `24_EMPLOYEE_PWA.md`. This file puts both days in one sequence and adds everything done on 26 Oct.

# English

## 1. Timeline

| Day | Step | Result |
|---|---|---|
| 25 Oct | Read the whole project; compared with HR's repo (`Mohamed-Awad-Ariba/Ariba-HR`, update 22/10, `3128689`) | 8 features found that we did not have |
| 25 Oct | Restore points | tag `25oct-v` on GitHub, local bundle/zip/dumps |
| 25 Oct | Ported the 8 features with their logic, in our design and server | parity suites: 81,428 cases, 0 differences; backend 129 tests passed |
| 25 Oct | Migration `002_announcements.sql` (two new tables only) | run by the owner on demo and production |
| 25 Oct | E-mail through the Gmail API over HTTPS (Railway Hobby blocks SMTP) | a real test message arrived |
| 25 Oct | Employee app turned into an installable PWA, hosted as service `employee-app` on **demo** | commits `0bef2b9`, `eac774c`, `f6ddbcf` |
| 26 Oct | Fixes after real use of the installed PWA, in 4 batches | §2 |
| 26 Oct | Leave-type pictograms and removal of every emoji | §3 |
| 26 Oct | HR site: sign-in after an HR password reset | §4 |
| 26 Oct | Replies drafted to HR (Mr. Mohamed Awad) | §6 |

## 2. Employee app (PWA) — fixes on 26 Oct

Everything below is deployed on **demo** (`https://employee-app-demo.up.railway.app`). The HR website was not changed by these items.

| Batch (commit) | Problem reported | Cause | Fix |
|---|---|---|---|
| 1 (`eafb7c2`) | Trash / confirm buttons did nothing | `Alert.alert` is a no-op on the web | `src/lib/web-alert.web.ts`: a real right-to-left dialog (title, message, cancel / destructive buttons, Escape, dark and light) |
| 1 | Back button did nothing | `router.back()` with no history | `src/lib/nav.ts` `goBack()`: back, or home when there is no history |
| 1 | Payslip print opened a second tab the installed app could not leave | `window.open` | `src/lib/pdf.web.ts` builds an A4 PDF inside the app (html2canvas + jsPDF); `src/lib/web-file.web.ts` shares it or downloads it from the same window |
| 1 | Opening a file left the app | same | same delivery helper |
| 1 | Signature title invisible in the dark theme | light text on a white sheet | explicit dark colour |
| 1 | Does not feel like an app once installed | no dynamic height, no theme colour | `100dvh`, `interactive-widget=resizes-content`, theme-colour meta kept in step with light/dark, no tap-zoom |
| 2 (`d7f6dd6`) | Header overlapped the clock / Dynamic Island; back button could not be pressed | the safe-area top inset read 0 in the installed iOS PWA | `src/lib/insets.web.ts` re-reads `env(safe-area-inset-*)` on load, resize and rotation, and takes the larger value; all screens use `useInsets()` |
| 2 | Dock «+» duplicated «طلب جديد» | — | removed from the dock (the button stays inside «طلباتي») |
| 2 | Requests listed in one run | — | grouped by the day they were sent, newest first: «اليوم», «أمس», then the full date |
| 3 (`d406a5f`) | Documents cut off, logo and text partly missing; could not be saved or printed | the document is laid out for A4 (794 px) | the viewer scales the sheet to the screen width; a «حفظ PDF» button saves an A4 file; wide content is shrunk to the page instead of being cut |

## 3. Pictograms and emoji (`ae6c21c`)

- Nine leave types now use the line pictograms the owner supplied (black masks, tinted to the theme colour): remote, maternity, umrah and hajj (same icon), paternity, unpaid, emergency, annual, marriage, permission. Files: `assets/leave-icons/*.png`; component `src/components/leave-icon.tsx`.
- They appear in the «new request» sheet (tiles enlarged) and beside every request in «طلباتي». The other types keep their existing icons.
- The emergency artwork was only 50 px; it was enlarged and its edges sharpened.
- **Emoji and dingbat symbols removed everywhere**: `src/lib/clean.ts` strips them from every text the app shows (including texts that come from the server, such as greeting titles), from toasts and dialogs, and from the HTML of documents and PDFs. Check boxes, the key icon and card titles use line icons instead. Arrows used as separators (← →) stay.
- Checked: 11 screens scanned for emoji in the rendered text: none.
- Server texts that contain emoji (notifications, announcement titles) were not changed; they are cleaned when shown in the app. The HR website was not touched.

## 4. HR website — sign-in after a password reset (`ac69a51`)

- **Symptom:** after HR reset a password, signing in showed «تعذر تحميل بيانات الحساب».
- **Cause:** a reset marks the account «temporary password». The server accepts the sign-in but refuses `/me/perms` until the password is changed; the site did not handle that case (the forced change-password dialog existed in the code but was not connected to sign-in).
- **Fix:** `port/lib/auth.js` returns `mustChange` and keeps the session; `Login.jsx` shows the forced «غيّر كلمة المرور» dialog; `finishLogin()` loads the profile after the change.
- **Checked** locally end to end: temporary account → dialog → new password → dashboard. Deployed to demo and production (the site is shared).

## 5. Checks done on 26 Oct

| Check | Result |
|---|---|
| `tsc --noEmit` on the employee app after every batch | clean |
| Service-worker logic test (`tests/sw.test.mjs`) | passed |
| Local run (mobile viewport, synthetic database): delete dialog, approve-with-signature dialog and cancel, payslip PDF, safe back, file open, signature draw / save / delete, document scaling and PDF save, new-request sheet and icons, day groups | worked |
| Each deployment on Railway | `employee-app` demo and `frontend` demo / production: SUCCESS; live page contains the new meta tags, manifest 200 |

**Not verified (cannot be tried here):** the installed app on a real iPhone (safe areas, status bar); the native Expo app (no Xcode / emulator here); the look of the generated PDF files by eye. The owner is asked to send screenshots from the phone.

## 6. Communication

- Replies to HR drafted in Arabic: thanks for the project and the two deployment documents, the launch follows the technologies approved by Mr. Odai on our existing system, all their features, screens and formulas were moved to it, and the prototype can be seen on the test environment (links in §7). The sentence about native apps in the Apple / Google stores was left out of the final wording because the native app is not published yet.

## 7. Where things are

| What | Link |
|---|---|
| HR website (demo) | https://frontend-demo-b5ec.up.railway.app |
| Employee app, PWA (demo) | https://employee-app-demo.up.railway.app |
| Demo API | https://hrariba-demo.up.railway.app |
| HR website (production) | https://frontend-production-f9a8a.up.railway.app |
| Production API | https://hrariba-production.up.railway.app |

Commits of the PWA and the 26 Oct work: `0bef2b9`, `eac774c`, `f6ddbcf`, `eafb7c2`, `d7f6dd6`, `d406a5f`, `ae6c21c`, `ac69a51`.

## 8. Decisions and what remains

- **Decided by the owner (26 Oct):** the colleague restructures the whole database after adding the two new tables and fixes the schema used by demo and production — no database work from us meanwhile; no production service for the employee PWA; the Gmail token renewal (expires about 1 Nov 2026) is left alone.
- **Remaining:** check the installed app on real phones (iOS and Android); the native Expo app and store publishing; optional `ANTHROPIC_API_KEY` for the AI assistant; a higher-resolution logo for the install icons; the Tamheer leave presentation decision for the management demo; after the colleague's schema is ready, re-test the server and both apps on it and re-run the parity suites.

---

# العربية

## 1. التسلسل الزمني

| اليوم | الخطوة | النتيجة |
|---|---|---|
| 25 أكتوبر | قراءة المشروع كاملاً ومقارنته بمستودع HR (`Mohamed-Awad-Ariba/Ariba-HR`، تحديث 22/10، `3128689`) | 8 ميزات عندهم وليست عندنا |
| 25 أكتوبر | نقاط الاسترجاع | وسم `25oct-v` على GitHub ونسخ محلية (bundle وzip ونسخ قواعد البيانات) |
| 25 أكتوبر | نقل الميزات الثماني بمنطقها وبتصميمنا وخادمنا | اختبارات التطابق: 81,428 حالة بدون فروقات، واختبارات الباك إند: 129 ناجحة |
| 25 أكتوبر | ترحيل `002_announcements.sql` (جدولان جديدان فقط) | نفّذه المالك على demo ثم الإنتاج |
| 25 أكتوبر | الإيميل عبر Gmail API على HTTPS (Railway Hobby يمنع SMTP) | وصلت رسالة تجربة حقيقية |
| 25 أكتوبر | تحويل تطبيق الموظف إلى PWA قابل للتثبيت، على خدمة `employee-app` في **demo** | `0bef2b9` و`eac774c` و`f6ddbcf` |
| 26 أكتوبر | إصلاحات بعد الاستخدام الفعلي للتطبيق المثبّت، على 4 دفعات | القسم 2 |
| 26 أكتوبر | أيقونات أنواع الإجازات وإزالة كل الإيموجي | القسم 3 |
| 26 أكتوبر | موقع HR: الدخول بعد إعادة تعيين كلمة السر | القسم 4 |
| 26 أكتوبر | صياغة الردود على HR (أ. محمد عوض) | القسم 6 |

## 2. تطبيق الموظف (PWA) — إصلاحات 26 أكتوبر

كل ما يلي منشور على **demo** (`https://employee-app-demo.up.railway.app`)، ولم يتغيّر موقع HR بسببه.

| الدفعة (commit) | المشكلة | السبب | الإصلاح |
|---|---|---|---|
| 1 (`eafb7c2`) | أزرار الحذف والتأكيد لا تعمل | `Alert.alert` لا يفعل شيئاً على الويب | `src/lib/web-alert.web.ts`: نافذة حقيقية من اليمين لليسار (عنوان ورسالة وأزرار إلغاء/حذف وEscape، داكن وفاتح) |
| 1 | زر الرجوع لا يعمل | `router.back()` بدون سجل صفحات | `src/lib/nav.ts` الدالة `goBack()`: رجوع، أو الرئيسية إن لم يوجد سجل |
| 1 | طباعة الراتب تفتح تاباً ثانياً لا يستطيع التطبيق المثبّت الخروج منه | `window.open` | `src/lib/pdf.web.ts` يبني PDF بمقاس A4 داخل التطبيق (html2canvas + jsPDF)، و`src/lib/web-file.web.ts` يشاركه أو ينزّله من نفس النافذة |
| 1 | فتح ملف يخرجك من التطبيق | نفس السبب | نفس أداة التسليم |
| 1 | عنوان التوقيع غير ظاهر في الثيم الداكن | نص فاتح على ورقة بيضاء | لون داكن صريح |
| 1 | لا يبدو كتطبيق بعد التثبيت | لا ارتفاع ديناميكي ولا لون ثيم | `100dvh` و`interactive-widget=resizes-content` ولون الثيم يتبع الفاتح/الداكن وبدون تكبير باللمس |
| 2 (`d7f6dd6`) | الهيدر يتداخل مع الساعة والجزيرة، وزر الرجوع لا ينضغط | مسافة الأمان العلوية تُقرأ صفراً في PWA المثبّت على iOS | `src/lib/insets.web.ts` يعيد قراءة `env(safe-area-inset-*)` عند التحميل وتغيير الحجم والتدوير ويأخذ الأكبر، وكل الشاشات تستخدم `useInsets()` |
| 2 | زر «+» في الشريط يكرر «طلب جديد» | — | أُزيل من الشريط (الزر باقٍ داخل «طلباتي») |
| 2 | الطلبات في سرد واحد | — | مقسّمة حسب يوم الإرسال، الأحدث أولاً: «اليوم» ثم «أمس» ثم التاريخ الكامل |
| 3 (`d406a5f`) | المستندات مقصوصة (الشعار والنص) ولا تُحفظ ولا تُطبع | المستند مصمّم على ورقة A4 (794 بكسل) | العارض يصغّر الورقة لتناسب عرض الشاشة، وزر «حفظ PDF» يحفظ ملف A4، والمحتوى العريض يُصغَّر ليدخل الصفحة بدل أن يُقص |

## 3. الأيقونات والإيموجي (`ae6c21c`)

- تسعة أنواع إجازات صارت بالأيقونات الخطية التي أرسلها المالك (أقنعة سوداء تتلوّن بلون الثيم): عن بعد، أمومة، عمرة وحج (نفس الأيقونة)، أبوة، بدون راتب، اضطرارية، سنوية، زواج، استئذان. الملفات: `assets/leave-icons/*.png`، والمكوّن `src/components/leave-icon.tsx`.
- تظهر في شاشة «طلب جديد» (بمربعات أكبر) وبجانب كل طلب في «طلباتي». باقي الأنواع بقيت بأيقوناتها.
- أيقونة الاضطرارية كانت 50 بكسل فقط، فكُبّرت وحُدّدت حوافها.
- **إزالة الإيموجي والرموز من كل مكان**: `src/lib/clean.ts` يزيلها من كل نص يعرضه التطبيق (ومنها النصوص القادمة من الخادم مثل عناوين التهاني)، ومن الرسائل والنوافذ، ومن HTML المستندات وملفات PDF. صناديق الاختيار والمفتاح وعناوين البطاقات صارت بأيقونات خطية. الأسهم الفاصلة (← →) بقيت.
- الفحص: 11 شاشة فُحص نصها المعروض ولم يوجد فيها إيموجي.
- نصوص الخادم التي فيها إيموجي (الإشعارات وعناوين الإعلانات) لم تتغيّر، وتُنظَّف عند عرضها في التطبيق. موقع HR لم يُلمس.

## 4. موقع HR — الدخول بعد إعادة تعيين كلمة السر (`ac69a51`)

- **العَرَض:** بعد أن يعيد HR تعيين كلمة سر، يظهر عند الدخول «تعذر تحميل بيانات الحساب».
- **السبب:** إعادة التعيين تجعل الحساب «كلمة مؤقتة». الخادم يقبل الدخول لكنه يرفض `/me/perms` حتى تُغيَّر الكلمة، والموقع لم يكن يتعامل مع هذه الحالة (نموذج التغيير الإجباري موجود في الكود لكنه غير مربوط بالدخول).
- **الإصلاح:** `port/lib/auth.js` يرجّع `mustChange` ويُبقي الجلسة، و`Login.jsx` يعرض نموذج «غيّر كلمة المرور» الإجباري، والدالة `finishLogin()` تحمّل الملف بعد التغيير.
- **الفحص** محلياً من البداية للنهاية: حساب مؤقت ← النموذج ← كلمة جديدة ← لوحة التحكم. نُشر على demo والإنتاج (الموقع مشترك).

## 5. الفحوصات يوم 26 أكتوبر

| الفحص | النتيجة |
|---|---|
| `tsc --noEmit` على تطبيق الموظف بعد كل دفعة | سليم |
| اختبار منطق الـservice worker (`tests/sw.test.mjs`) | ناجح |
| تشغيل محلي (شاشة جوال وقاعدة بيانات تجريبية): نافذة الحذف، نافذة الموافقة بالتوقيع والإلغاء، PDF الراتب، الرجوع الآمن، فتح الملف، رسم التوقيع وحفظه وحذفه، تصغير المستند وحفظ PDF، شاشة الطلب الجديد والأيقونات، فواصل الأيام | اشتغلت |
| كل نشر على Railway | `employee-app` demo و`frontend` demo والإنتاج: SUCCESS؛ والصفحة الحية فيها الوسوم الجديدة والـmanifest يرجع 200 |

**لم يُتحقق منه (لا يمكن تجربته هنا):** التطبيق المثبّت على iPhone حقيقي (المناطق الآمنة وشريط الحالة)، وتطبيق Expo الأصلي (لا Xcode ولا محاكي هنا)، وشكل ملفات PDF الناتجة بالعين. نطلب من المالك إرسال لقطات من الجوال.

## 6. المراسلات

- صيغت الردود على HR بالعربية: شكر على المشروع ووثيقتي النشر، والإطلاق يتم وفق التقنيات التي اعتمدها الأستاذ عدي على نظامنا القائم، ونُقلت كل ميزاتهم وشاشاتهم ومعادلاتهم، ويمكنهم الاطلاع على النموذج الأولي في بيئة التجربة (الروابط في القسم 7). حُذفت من الصيغة النهائية جملة التطبيق الأصلي في متجري Apple وGoogle لأنه لم يُنشر بعد.

## 7. أين الأشياء

| ماذا | الرابط |
|---|---|
| موقع HR (demo) | https://frontend-demo-b5ec.up.railway.app |
| تطبيق الموظف PWA (demo) | https://employee-app-demo.up.railway.app |
| API الديمو | https://hrariba-demo.up.railway.app |
| موقع HR (الإنتاج) | https://frontend-production-f9a8a.up.railway.app |
| API الإنتاج | https://hrariba-production.up.railway.app |

commits الـPWA وعمل 26 أكتوبر: `0bef2b9` و`eac774c` و`f6ddbcf` و`eafb7c2` و`d7f6dd6` و`d406a5f` و`ae6c21c` و`ac69a51`.

## 8. القرارات والمتبقي

- **قرارات المالك (26 أكتوبر):** الزميلة تعيد هيكلة قاعدة البيانات كاملة بعد إضافة الجدولين وتضبط السكيما المستخدمة في demo والإنتاج، ولا عمل منا على قاعدة البيانات في هذه الأثناء؛ لا خدمة إنتاج لتطبيق الموظف PWA؛ تجديد توكن Gmail (ينتهي نحو 1 نوفمبر 2026) يُترك.
- **المتبقي:** فحص التطبيق المثبّت على جوالات حقيقية (iOS وAndroid)؛ تطبيق Expo الأصلي والنشر في المتجرين؛ `ANTHROPIC_API_KEY` اختياري للمساعد الذكي؛ شعار بدقة أعلى لأيقونات التثبيت؛ قرار عرض إجازات «تمهير» أمام الإدارة؛ وبعد جاهزية سكيما الزميلة: إعادة اختبار الخادم والتطبيقين عليها وإعادة تشغيل اختبارات التطابق.
