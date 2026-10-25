# Employee app as an installable web app (PWA) — تطبيق الموظف كتطبيق ويب قابل للتثبيت (PWA)

> English first, then the full Arabic version (same content).
> Scope: **only the Expo employee app** (`frontend/employee-app`). The HR website (`frontend/hr-web`) is unchanged and stays on the web as before.
> Branch: `feature/employee-pwa`. Nothing is deployed until the owner says so.

# English

## 1. What it is
The same Expo / React Native code that builds the iPhone and Android apps is also exported as a website (`expo export -p web`), served over HTTPS, and made installable: on iPhone (Safari › Share › Add to Home Screen) and on Android (Chrome › Install app). No store, no APK, no cost beyond one small Railway service.

## 2. What was added
| File | Purpose |
|---|---|
| `public/index.html` | Page template: `lang="ar" dir="rtl"`, `viewport-fit=cover`, theme colour `#014D3D`, manifest and iOS home-screen tags, service-worker registration |
| `public/manifest.webmanifest` | Name «أريبا — الموظف», `display: standalone`, portrait, icons (any + maskable) |
| `public/icons/*` | 192 / 512 / maskable 512 / Apple touch 180 / favicon, drawn from the ARIBA mark |
| `public/sw.js` | Small service worker: app shell offline; page loads network-first; build files cache-first; **never** caches the API or any other origin |
| `public/serve.json` | Static-host rules: every route returns the app, no-cache for `index.html` / `sw.js` / manifest, long cache for hashed files, security headers |
| `railway.json`, `package.json` (`build:web`, `serve:web`, `test:sw`, dependency `serve@14`) | Build and serve on Railway |
| `src/components/html-view(.web).tsx` | Document viewer: system web view on the phone, **sandboxed iframe** on the web (no scripts, no access to the app's storage) |
| `src/components/install-hint(.web).tsx` | «ثبّت التطبيق» card on the login screen (Android/desktop: the browser's install prompt; iPhone: the written steps) |
| `src/lib/{open-doc,payslip-pdf,signature}.ts`, `app/login.tsx` | Web branches: attachments download, payslip opens the print dialog (save as PDF), signature kept in this browser, no biometric button |

## 3. What works differently from the phone app
| | Phone app | Web app (PWA) |
|---|---|---|
| Sign-in with Face ID / fingerprint | Yes | No (hidden) |
| Token storage | Device keychain | Browser storage of this site |
| Punch with GPS | Yes | Yes, with the browser's location permission (less steady; may pause with the screen off) |
| Push notifications | Yes (needs an EAS build) | Not enabled; the bell refreshes when the app opens |
| Payslip PDF | Share sheet | Print dialog → «Save as PDF» |
| Attachments | Share sheet | Opens / downloads in the browser |
| Signature | Device file | This browser's storage (still never sent except inside a document the employee signs) |

## 4. How it was checked
| Check | Result |
|---|---|
| `tsc --noEmit` | Clean |
| `expo export -p web` | Builds; output contains the manifest, worker, icons, and the API address given at build time only |
| Static host rules (`serve`) | Deep links (`/salary`, `/letter/…`) return the app; `sw.js` / `index.html` no-cache; hashed files immutable; manifest `application/manifest+json`; security headers present |
| Sign-in and home on the web (local synthetic database) | Works; all API calls 200 with CORS; the announcements card shows; no Face ID button |
| Payslip button | One print window opened, one print call, Arabic RTL slip |
| Document viewer | iframe sandboxed with no scripts and no same-origin access; Arabic RTL document renders |
| Install hint | Shown only after the browser's install event; its button calls the prompt, then hides |
| `tests/sw.test.mjs` (node tests/sw.test.mjs) | All checks pass: shell cached, old caches removed, API / POST / other origins untouched, navigation network-first with offline fallback, build files cache-first |

## 5. Not verified (needs a real phone)
- Installing on a real iPhone and Android and opening from the home screen.
- The service worker inside a real browser (the built-in preview browser cannot register service workers; the worker logic is covered by `tests/sw.test.mjs`).
- Drawing a signature and uploading a file on the web build.
- Icon sharpness: the only logo file is 376 px wide, so the icons are upscaled; send a high-resolution logo (SVG or ≥ 1024 px) to regenerate them.

## 6. Deploying it (owner)
1. Railway → the project → **New service** → from the GitHub repo → set **Root Directory** to `frontend/employee-app` (it reads `railway.json`).
2. Service variable `EXPO_PUBLIC_API_URL` = the API of that environment (demo: `https://hrariba-demo.up.railway.app`, production: `https://hrariba-production.up.railway.app`). It is baked in at build time, so changing it needs a new build.
3. **Generate a domain** for the service (Settings › Networking).
4. Allow that origin on the API: append it to `CORS_ORIGINS` of the `HR_ARIBA` service in the same environment (keep the existing value, comma-separated, no trailing slash), then redeploy the API.
5. Open the domain on a phone and install it.

## 7. Using it
- **iPhone:** open the link in Safari → Share → «Add to Home Screen».
- **Android:** open it in Chrome → «Install app» (or the in-app «تثبيت التطبيق» button).
- Updates reach users automatically on the next open (pages are fetched network-first); no new install is needed.

# العربي

## 1. ما هو
كود Expo / React Native نفسه الذي يبني تطبيقي الآيفون والأندرويد يُصدَّر أيضًا كموقع (`expo export -p web`) يُقدَّم عبر HTTPS ويصير قابلًا للتثبيت: على الآيفون (Safari ← مشاركة ← إضافة إلى الشاشة الرئيسية)، وعلى الأندرويد (Chrome ← تثبيت التطبيق). بلا متجر ولا APK، وبلا تكلفة سوى خدمة صغيرة على Railway.

## 2. ما أُضيف
| الملف | الغرض |
|---|---|
| `public/index.html` | قالب الصفحة: `lang="ar" dir="rtl"` و`viewport-fit=cover` ولون السمة `#014D3D` ووسوم الشاشة الرئيسية وتسجيل الـ service worker |
| `public/manifest.webmanifest` | الاسم «أريبا — الموظف» و`display: standalone` وعمودي وأيقونات (عادية وقابلة للقناع) |
| `public/icons/*` | أيقونات 192 و512 والقابلة للقناع 512 وApple touch 180 وfavicon، مرسومة من شعار أريبا |
| `public/sw.js` | service worker صغير: هيكل التطبيق دون إنترنت؛ تحميل الصفحة شبكة أولًا؛ ملفات البناء من الذاكرة أولًا؛ **لا يخزّن أبدًا** الـ API ولا أي نطاق آخر |
| `public/serve.json` | قواعد الاستضافة: كل مسار يُرجع التطبيق، بلا تخزين مؤقت لـ `index.html` و`sw.js` والـ manifest، وتخزين طويل للملفات المبصومة، وترويسات أمان |
| `railway.json` و`package.json` (`build:web` و`serve:web` و`test:sw` والاعتمادية `serve@14`) | البناء والتقديم على Railway |
| `src/components/html-view(.web).tsx` | عارض المستندات: WebView على الجوال، و**iframe معزول** على الويب (بلا سكربتات وبلا وصول لتخزين التطبيق) |
| `src/components/install-hint(.web).tsx` | بطاقة «ثبّت التطبيق» في شاشة الدخول (أندرويد: نافذة تثبيت المتصفح؛ آيفون: الخطوات مكتوبة) |
| `src/lib/{open-doc,payslip-pdf,signature}.ts` و`app/login.tsx` | فروع الويب: تنزيل المرفقات، وقسيمة الراتب تفتح نافذة الطباعة (حفظ كـ PDF)، والتوقيع يُحفظ في هذا المتصفح، وإخفاء زر البصمة |

## 3. ما يختلف عن تطبيق الجوال
| | تطبيق الجوال | تطبيق الويب (PWA) |
|---|---|---|
| الدخول بالبصمة / Face ID | نعم | لا (مخفي) |
| تخزين التوكن | سلسلة مفاتيح الجهاز | تخزين المتصفح لهذا الموقع |
| البصمة بالموقع GPS | نعم | نعم بإذن الموقع في المتصفح (أقل ثباتًا وقد يتوقف مع إطفاء الشاشة) |
| الإشعارات الفورية | نعم (تحتاج بناء EAS) | غير مفعّلة؛ الجرس يتحدث عند فتح التطبيق |
| قسيمة PDF | نافذة المشاركة | نافذة الطباعة ← «حفظ كـ PDF» |
| المرفقات | نافذة المشاركة | تُفتح / تُنزَّل في المتصفح |
| التوقيع | ملف على الجهاز | تخزين هذا المتصفح (ولا يُرسل أبدًا إلا داخل مستند يوقّعه الموظف) |

## 4. كيف تم التحقق
| الفحص | النتيجة |
|---|---|
| `tsc --noEmit` | نظيف |
| `expo export -p web` | يبني؛ والناتج فيه الـ manifest والـ worker والأيقونات وعنوان الـ API المعطى وقت البناء فقط |
| قواعد الاستضافة (`serve`) | الروابط العميقة (`/salary` و`/letter/…`) تُرجع التطبيق؛ `sw.js` و`index.html` بلا تخزين؛ الملفات المبصومة ثابتة؛ الـ manifest بنوع `application/manifest+json`؛ ترويسات الأمان موجودة |
| الدخول والرئيسية على الويب (قاعدة اصطناعية محلية) | يعمل؛ كل نداءات الـ API بحالة 200 مع CORS؛ بطاقة الإعلانات تظهر؛ لا زر بصمة |
| زر قسيمة الراتب | فُتحت نافذة طباعة واحدة، واستُدعيت الطباعة مرة واحدة، والقسيمة عربية RTL |
| عارض المستندات | iframe معزول بلا سكربتات وبلا وصول لنفس المصدر؛ والمستند العربي RTL يظهر |
| تلميح التثبيت | يظهر بعد حدث التثبيت من المتصفح فقط؛ وزره يستدعي النافذة ثم يختفي |
| `tests/sw.test.mjs` (`node tests/sw.test.mjs`) | كل الفحوص ناجحة: تخزين الهيكل، وحذف النسخ القديمة، وعدم المساس بالـ API وطلبات POST والنطاقات الأخرى، والتنقل شبكة أولًا مع بديل دون إنترنت، وملفات البناء من الذاكرة أولًا |

## 5. لم يُتحقق منه (يحتاج جوالًا حقيقيًا)
- التثبيت على آيفون وأندرويد حقيقيين والفتح من الشاشة الرئيسية.
- الـ service worker داخل متصفح حقيقي (المتصفح المدمج للمعاينة لا يسجّل service workers؛ ومنطق الـ worker مغطى بـ `tests/sw.test.mjs`).
- رسم التوقيع ورفع ملف على نسخة الويب.
- وضوح الأيقونات: ملف الشعار الوحيد عرضه 376 بكسل فالأيقونات مكبّرة؛ أرسل شعارًا عالي الدقة (SVG أو ≥ 1024 بكسل) لنعيد توليدها.

## 6. النشر (المالك)
1. Railway ← المشروع ← **New service** ← من مستودع GitHub ← اجعل **Root Directory** = `frontend/employee-app` (يقرأ `railway.json`).
2. متغير الخدمة `EXPO_PUBLIC_API_URL` = عنوان الـ API لتلك البيئة (demo: `https://hrariba-demo.up.railway.app`، وproduction: `https://hrariba-production.up.railway.app`). يُدمج وقت البناء، فتغييره يحتاج بناءً جديدًا.
3. **Generate Domain** للخدمة (Settings ← Networking).
4. اسمح بهذا الأصل في الـ API: أضفه إلى `CORS_ORIGINS` في خدمة `HR_ARIBA` في البيئة نفسها (أبقِ القيمة الحالية، مفصولة بفواصل وبلا شرطة مائلة أخيرة)، ثم أعد نشر الـ API.
5. افتح الرابط على جوال وثبّته.

## 7. الاستخدام
- **آيفون:** افتح الرابط في Safari ← مشاركة ← «إضافة إلى الشاشة الرئيسية».
- **أندرويد:** افتحه في Chrome ← «تثبيت التطبيق» (أو زر «تثبيت التطبيق» داخل التطبيق).
- تصل التحديثات تلقائيًا عند الفتح التالي (الصفحة تُجلب شبكة أولًا)، فلا حاجة لإعادة التثبيت.
