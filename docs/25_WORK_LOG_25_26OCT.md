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

## 9. Management feedback after the meeting (26 Oct, evening)

| Request | Cause found | Fix |
|---|---|---|
| Egyptian dialect anywhere in the site or the app → formal Arabic | HR's ported screens, their translation dictionary (`trDict.js`), messages from the server and a few app texts were written in Egyptian dialect (about 200 strings) | Rewritten into plain formal Arabic in 76 files, with the same rewrite applied to the dictionary keys so the English mode still finds its translations. Texts that **recognise what a user types** (the AI assistant's command parser, `empFields.js`, `aiActions.js`) were left on purpose: they must understand both dialects. Backend tests: 129 passed |
| Files cannot be shared / exported to Teams | There was no Teams path at all; and on a phone the share sheet is refused when the file takes a few seconds to build because the tap has expired | Employee app: after a PDF is built a dialog offers «مشاركة (Teams وغيرها)» (a fresh tap, so the browser accepts it), «تنزيل», and on desktop «فتح Teams». HR site: «مشاركة / Teams» in every export dialog and «مشاركة PDF (Teams وغيره)» for official forms and the salary certificate; where the browser cannot share files the file is downloaded and a Teams chat is opened with the recipients and message filled in |
| A PDF prints as one page and a little more | The PDF builder cut a second page for any overflow; HR's print path only fitted documents with the official letterhead | Up to 1.35 pages of content is shrunk onto **one full page**; a longer document keeps normal pages (checked: 1.04 and 1.23 pages → 1 page, 1.52 → 2, 2.24 → 3). Same rule in the HR site PDF builder and in print for documents without a letterhead |

Not done, needs the company's Microsoft 365 admin: posting a file straight into a **Teams channel**. A file cannot be attached to a channel from a link; it needs a Graph app (Files.ReadWrite + ChannelMessage.Send) or a Power Automate flow. Sharing from the share sheet and the prefilled chat cover the daily need meanwhile.

## 10. Second round of management notes (26 Oct, night)

| # | Note | What was found | What was done |
|---|---|---|---|
| 1 | Night mode: the logo does not match the background (HR site) | The logo file has an opaque white square | Added `ariba-logo-dark.png` (transparent, deep greens lifted) used in night mode; an uploaded logo goes on a soft light tile |
| 2 | Sign-out icon turns white in day mode (HR site) | A rule paints everything in the top bar white, but the account pill is a light surface | The pill's icons are now the brand green in day mode (cream at night) |
| 3 | Hide the greeting automatically after a day (app) | The server kept greetings 3 days | Greetings are kept 24 hours at most, on the server (`interval '1 day'`) and again in the app for a screen left open overnight |
| 5 | A clear fingerprint icon while punching (app) | The dial showed «...» while verifying, and an exit icon for check-out | A large fingerprint (check-in and check-out) and, while verifying, the fingerprint with a scanning line and «جارٍ التحقق…» |
| 6 | A light glow around the punch circle during work hours (app) | None | A soft breathing glow from check-in until check-out; it stops after the check-out. The pulsing ring now only invites the first check-in |
| 7 | English for the app | No language layer | `src/i18n`: Arabic/English switch (Profile, and on the sign-in screen), saved on the device. All texts go through one translator (about 610 texts, patterns for texts with values, piece-by-piece fallback); layout direction follows the language; dates in English format. Not translated on purpose: official letters and the payslip PDF, and names/messages from the server. On a phone the layout direction applies at the next start (`forcesRTL` was switched off in `app.json` so the app decides) |
| 8 | Icons for the three boxes under the punch (app) | Plain numbers | Pictograms in the same line style: annual-leave balance, year-end balance (new, drawn in the same style) and remote days (the remote-work pictogram) |
| 10 | Separate colours for the HR site and the app, with sync | One shared setting (`brand_colors`) fed both | New setting `app_brand` (colours, hero card colour, app logo, punch watermark) with its own cards in Settings → Employee app; the website colours card is now «ألوان الموقع». The app reads it at start, on return to the app and every 90 s. Until the first change nothing moves: the app's current look is saved as its own identity before the website colours are first changed. The punch watermark is now shown behind the punch circle and the app logo on its sign-in screen. Tests: 131 passed (2 new for the separation) |
| 11 | The whole picture behind the punch button can be changed (app) | Only a faint logo could be set | New card «Picture behind the punch button» (Settings → Employee app): any JPG/PNG fills the whole home card with a light shade for readability; removing it brings the green background back. Stored in `app_brand.heroImage`, reaches the app within about two minutes |


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

## 9. ملاحظات الإدارة بعد الاجتماع (26 أكتوبر، مساءً)

| الطلب | السبب الذي وُجد | الإصلاح |
|---|---|---|
| اللهجة المصرية في الموقع أو التطبيق ← عربية فصحى رسمية | شاشات HR المنقولة وقاموس الترجمة (`trDict.js`) ورسائل من الخادم وبعض نصوص التطبيق كانت بلهجة مصرية (نحو 200 نص) | أُعيدت صياغتها بعربية رسمية بسيطة في 76 ملفاً، مع تطبيق نفس الصياغة على مفاتيح القاموس ليبقى الوضع الإنجليزي يجد ترجماته. النصوص التي **تتعرف على ما يكتبه المستخدم** (محلل أوامر المساعد الذكي و`empFields.js` و`aiActions.js`) تُركت عمداً لأنها يجب أن تفهم اللهجتين. اختبارات الباك إند: 129 ناجحة |
| لا يمكن مشاركة الملفات أو تصديرها إلى Teams | لم يكن هناك أي مسار لـ Teams أصلاً؛ وعلى الجوال تُرفض نافذة المشاركة إذا تأخر بناء الملف بضع ثوانٍ لأن النقرة انتهت | تطبيق الموظف: بعد بناء PDF يظهر حوار فيه «مشاركة (Teams وغيرها)» (بنقرة جديدة فيقبلها المتصفح) و«تنزيل»، وعلى الحاسوب «فتح Teams». موقع HR: «مشاركة / Teams» في كل نافذة تصدير و«مشاركة PDF (Teams وغيره)» للنماذج الرسمية وخطاب تعريف الراتب؛ وإن لم يدعم المتصفح مشاركة الملفات يُنزَّل الملف وتُفتح محادثة Teams بمستلميها ورسالتها جاهزين |
| طباعة PDF تخرج صفحة وقليلاً | بانى PDF كان يقص صفحة ثانية لأي زيادة، ومسار الطباعة في HR كان يضبط الصفحة الواحدة للمستندات ذات الورق الرسمي فقط | ما يصل إلى 1.35 صفحة يُصغَّر على **صفحة واحدة كاملة**، والمستند الأطول يبقى بصفحات عادية (جُرّب: 1.04 و1.23 صفحة ← صفحة واحدة، و1.52 ← صفحتان، و2.24 ← ثلاث). نفس القاعدة في بانى PDF بموقع HR وفي الطباعة للمستندات بدون ورق رسمي |

لم يُنفَّذ ويحتاج مسؤول Microsoft 365 في الشركة: نشر ملف مباشرة داخل **قناة في Teams**. لا يمكن إرفاق ملف بقناة من رابط؛ يلزم تطبيق Graph (صلاحيتا Files.ReadWrite وChannelMessage.Send) أو تدفق Power Automate. المشاركة من نافذة المشاركة والمحادثة الجاهزة تغطيان الاستخدام اليومي في الأثناء.

## 10. الجولة الثانية من ملاحظات الإدارة (26 أكتوبر، ليلًا)

| # | الملاحظة | ما وُجد | ما نُفّذ |
|---|---|---|---|
| 1 | الوضع الليلي: لون الشعار لا يتوافق مع الخلفية (موقع HR) | ملف الشعار فيه مربع أبيض غير شفاف | أضفت `ariba-logo-dark.png` (شفاف مع رفع الأخضر الغامق) يُستخدم في الوضع الليلي؛ وأي شعار مرفوع يوضع على بلاطة فاتحة ناعمة |
| 2 | أيقونة الخروج تصير بيضاء في الوضع النهاري (موقع HR) | قاعدة تلوّن كل ما في الشريط العلوي بالأبيض بينما حساب المستخدم على سطح فاتح | أيقونات حساب المستخدم أخضر الهوية في النهاري (وبيج في الليلي) |
| 3 | إخفاء المباركة من الرئيسية تلقائيًا خلال يوم (التطبيق) | الخادم كان يُبقي المباركة 3 أيام | تبقى المباركة 24 ساعة كحد أقصى، في الخادم (`interval '1 day'`) وفي التطبيق أيضًا لشاشة تُركت مفتوحة طوال الليل |
| 5 | أيقونة إصبع واضحة أثناء البصمة (التطبيق) | الدائرة تعرض «...» أثناء التحقق وأيقونة خروج عند الانصراف | بصمة كبيرة في الحضور والانصراف، وأثناء التحقق تظهر البصمة مع خط مسح وعبارة «جارٍ التحقق…» |
| 6 | توهج خفيف حول دائرة البصمة طوال الدوام (التطبيق) | لا يوجد | توهج ناعم يتنفس من الحضور حتى الانصراف ويتوقف بعده. والحلقة النابضة صارت لدعوة الحضور الأول فقط |
| 7 | اللغة الإنجليزية للتطبيق | لا توجد طبقة لغة | `src/i18n`: تبديل عربي/إنجليزي (في ملفي وفي شاشة الدخول) ويُحفظ على الجهاز. كل النصوص تمرّ عبر مترجم واحد (نحو 610 نصًا، وأنماط للنصوص ذات القيم، وترجمة جزئية احتياطية)، واتجاه الشاشة يتبع اللغة، والتواريخ بالصيغة الإنجليزية. لم يُترجم عمدًا: الخطابات الرسمية وPDF قسيمة الراتب وأسماء ورسائل الخادم. على الجوال يُطبَّق اتجاه الشاشة عند التشغيل التالي (أُوقف `forcesRTL` في `app.json` ليقرر التطبيق) |
| 8 | أيقونات الخانات الثلاث تحت البصمة (التطبيق) | أرقام فقط | أيقونات بنفس أسلوب الخطوط: رصيد الإجازة السنوية، رصيد نهاية العام (جديدة ومرسومة بنفس الأسلوب)، وأيام العمل عن بعد (أيقونة العمل عن بعد) |
| 10 | فصل ألوان موقع HR عن التطبيق مع مزامنة | إعداد واحد مشترك (`brand_colors`) يغذي الاثنين | إعداد جديد `app_brand` (الألوان ولون البطاقة الخضراء وشعار التطبيق وشعار البصمة) له بطاقاته في الإعدادات ← تطبيق الموظف، وبطاقة ألوان الموقع صارت «ألوان الموقع». يقرؤه التطبيق عند التشغيل وعند العودة إليه وكل 90 ثانية. وإلى أن يتغير شيء لا يتحرك شيء: يُحفظ شكل التطبيق الحالي كهوية خاصة به قبل أول تغيير في ألوان الموقع. شعار البصمة صار يظهر خلف الدائرة وشعار التطبيق في شاشة دخوله. الاختبارات: 131 ناجحة (اثنان جديدان للفصل) |
| 11 | تغيير الصورة كاملة خلف البصمة (التطبيق) | كان يمكن وضع شعار باهت فقط | بطاقة جديدة «صورة خلف زر البصمة» (الإعدادات ← تطبيق الموظف): أي صورة JPG/PNG تملأ البطاقة الرئيسية كاملة مع تظليل خفيف لوضوح النص، وإزالتها تعيد الخلفية الخضراء. تُحفظ في `app_brand.heroImage` وتصل التطبيق خلال دقيقتين تقريبًا |
