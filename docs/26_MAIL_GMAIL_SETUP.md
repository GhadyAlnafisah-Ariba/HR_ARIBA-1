# Sending mail from the system (Gmail API) — إرسال البريد من النظام (Gmail API)

> English first, then the full Arabic version (same content).
> No personal account appears in this file: use the **company** mailbox that HR sends from.

---

# English

## 1. What it does
The backend sends the system's e-mail (notifications, letters and forms, greetings, test message) through the **Gmail API over HTTPS (port 443)**. This is needed because Railway blocks SMTP (ports 25/465/587) outside its Pro plan. The sender is one company Gmail / Google Workspace mailbox. The permission requested is only `gmail.send`: it can send, it **cannot read** the mailbox.

## 2. How the backend picks the sender (`backend/app/services/mailer.py`)
1. The mailbox saved by HR in **Settings → Mail** (SMTP or Microsoft 365), its password stored AES-GCM encrypted with `MAIL_SECRET_KEY`.
2. If none is saved: Gmail API with `GMAIL_*` variables; the sender is `GMAIL_SENDER`.
3. Fallbacks (optional): Microsoft Graph (`M365_*`), then Resend (`RESEND_API_KEY`, `EMAIL_FROM`).
`MAIL_DISABLED=1` stops every send (use it on demo and local runs).

## 3. One-time setup
### A. Google Cloud (sign in with the company mailbox)
1. console.cloud.google.com → **New project** (e.g. "ARIBA HR Mail").
2. **APIs & Services → Library → Gmail API → Enable**.
3. **OAuth consent screen**: user type **External**, app name, support e-mail; add the company mailbox as a **Test user**.
4. **Publish app** (move from *Testing* to *In production*). Important: in *Testing* mode Google expires the refresh token after **7 days**; published, it stays valid. The scope is sensitive-but-light (`gmail.send`); for internal use the "unverified app" warning can be accepted.
5. **Credentials → Create credentials → OAuth client ID → Desktop app**. Copy the **Client ID** and **Client secret**.

### B. Get the refresh token (once, on your own machine, never on the server)
```bash
cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
GMAIL_CLIENT_ID='…' GMAIL_CLIENT_SECRET='…' python tools/gmail_oauth_token.py --test someone@example.com
```
A browser opens: sign in with the **company mailbox** and allow "Send email". The token is printed in the terminal only (nothing is written to a file). `--test` sends a test message.

### C. Put the values in Railway (service `HR_ARIBA`, both environments as needed)
| Variable | Value |
|---|---|
| `GMAIL_CLIENT_ID` | from step A5 |
| `GMAIL_CLIENT_SECRET` | from step A5 |
| `GMAIL_REFRESH_TOKEN` | from step B |
| `GMAIL_SENDER` | the company mailbox address |
| `MAIL_DISABLED` | unset in production; `1` on demo |

Redeploy the backend, then use **Settings → Mail → Send test message** on the HR website.

## 4. Changing the sender mailbox later
Repeat A (or reuse the same Cloud project), run B signed in with the new mailbox, update the four variables, redeploy. Nothing else changes. Old sent mail stays in the old mailbox.

## 5. Troubleshooting
| Symptom | Cause / fix |
|---|---|
| `invalid_grant` in the mail log | refresh token expired or revoked (Testing mode = 7 days; password change; access removed). Publish the app and repeat B |
| Test message not delivered, "MAIL_DISABLED" | `MAIL_DISABLED=1` is set on this environment |
| 403 `insufficient permissions` | token was issued without `gmail.send`; repeat B and tick "Send email" |
| Daily limit errors | free Gmail ≈ 500 recipients/day; Google Workspace ≈ 2,000: use a Workspace mailbox for production |
| Saved mailbox password unreadable | `MAIL_SECRET_KEY` was changed; HR must save the mailbox password again |
| Works locally but not on Railway | SMTP is blocked there: use the Gmail API variables above |

## 6. Security notes
- Keep `GMAIL_CLIENT_SECRET` and `GMAIL_REFRESH_TOKEN` only in Railway variables (and a password manager). Never commit them.
- Use a dedicated company mailbox (e.g. hr@ the company domain), not a personal account: the system keeps working when a person leaves.

---

# العربية

## 1. ماذا تفعل هذه الميزة
يرسل الـ backend بريد النظام (الإشعارات، الخطابات والنماذج، التهاني، رسالة التجربة) عبر **Gmail API على HTTPS (المنفذ 443)**. هذا مطلوب لأن Railway يمنع SMTP (المنافذ 25/465/587) خارج خطة Pro. المرسِل صندوق Gmail / Google Workspace واحد تابع للشركة. الصلاحية المطلوبة `gmail.send` فقط: يستطيع الإرسال و**لا يستطيع قراءة** الصندوق.

## 2. كيف يختار الـ backend المرسِل (`backend/app/services/mailer.py`)
1. الصندوق الذي حفظه HR في **الإعدادات ← البريد** (SMTP أو Microsoft 365)، وكلمة سره مشفّرة AES-GCM بـ `MAIL_SECRET_KEY`.
2. إن لم يوجد صندوق محفوظ: Gmail API بمتغيرات `GMAIL_*`، والمرسِل هو `GMAIL_SENDER`.
3. بدائل اختيارية: Microsoft Graph (`M365_*`) ثم Resend (`RESEND_API_KEY` و`EMAIL_FROM`).
المتغير `MAIL_DISABLED=1` يوقف كل إرسال (للديمو والتشغيل المحلي).

## 3. الإعداد لمرة واحدة
### أ. Google Cloud (سجّل الدخول بصندوق الشركة)
1. console.cloud.google.com ← **New project** (مثلًا "ARIBA HR Mail").
2. **APIs & Services ← Library ← Gmail API ← Enable**.
3. **OAuth consent screen**: نوع المستخدم **External**، اسم التطبيق، بريد الدعم؛ أضف صندوق الشركة كـ **Test user**.
4. **Publish app** (انقل من *Testing* إلى *In production*). مهم: في وضع *Testing* تنتهي صلاحية الـ refresh token بعد **7 أيام** عند Google؛ بعد النشر يبقى صالحًا. الصلاحية `gmail.send` خفيفة؛ للاستخدام الداخلي يمكن قبول تحذير "تطبيق غير موثّق".
5. **Credentials ← Create credentials ← OAuth client ID ← Desktop app**. انسخ **Client ID** و**Client secret**.

### ب. الحصول على الـ refresh token (مرة واحدة، على جهازك أنت، وليس على الخادم)
```bash
cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
GMAIL_CLIENT_ID='…' GMAIL_CLIENT_SECRET='…' python tools/gmail_oauth_token.py --test someone@example.com
```
يفتح المتصفح: سجّل الدخول بـ **صندوق الشركة** ووافق على "Send email". يُطبع الرمز في الطرفية فقط (لا يُكتب في ملف). الخيار `--test` يرسل رسالة تجربة.

### ج. ضع القيم في Railway (خدمة `HR_ARIBA`، في البيئتين حسب الحاجة)
| المتغير | القيمة |
|---|---|
| `GMAIL_CLIENT_ID` | من الخطوة أ5 |
| `GMAIL_CLIENT_SECRET` | من الخطوة أ5 |
| `GMAIL_REFRESH_TOKEN` | من الخطوة ب |
| `GMAIL_SENDER` | عنوان صندوق الشركة |
| `MAIL_DISABLED` | غير مضبوط في الإنتاج؛ `1` في الديمو |

أعد نشر الـ backend، ثم من موقع HR: **الإعدادات ← البريد ← إرسال رسالة تجربة**.

## 4. تغيير صندوق الإرسال لاحقًا
كرّر أ (أو أعد استخدام مشروع Cloud نفسه)، نفّذ ب مسجّلًا الدخول بالصندوق الجديد، حدّث المتغيرات الأربعة، وأعد النشر. لا شيء غير ذلك يتغير. الرسائل المرسلة سابقًا تبقى في الصندوق القديم.

## 5. حل المشكلات
| العَرَض | السبب / الحل |
|---|---|
| `invalid_grant` في سجل البريد | انتهى الـ refresh token أو أُلغي (وضع Testing = 7 أيام؛ تغيير كلمة السر؛ سحب الصلاحية). انشر التطبيق وكرّر ب |
| لا تصل رسالة التجربة ويظهر "MAIL_DISABLED" | المتغير `MAIL_DISABLED=1` مضبوط في هذه البيئة |
| خطأ 403 `insufficient permissions` | صدر الرمز بدون `gmail.send`؛ كرّر ب وفعّل "Send email" |
| أخطاء الحد اليومي | Gmail المجاني ≈ 500 مستلم/يوم؛ Google Workspace ≈ 2000: استخدم صندوق Workspace للإنتاج |
| كلمة سر الصندوق المحفوظ غير مقروءة | تغيّر `MAIL_SECRET_KEY`؛ يحفظ HR كلمة السر من جديد |
| يعمل محليًا ولا يعمل على Railway | SMTP محجوب هناك: استخدم متغيرات Gmail API أعلاه |

## 6. ملاحظات أمنية
- احفظ `GMAIL_CLIENT_SECRET` و`GMAIL_REFRESH_TOKEN` في متغيرات Railway ومدير كلمات السر فقط، ولا تضعهما في Git أبدًا.
- استخدم صندوقًا مخصصًا للشركة (مثل hr@ نطاق الشركة) وليس حسابًا شخصيًا: يستمر النظام بالعمل إذا غادر شخص الشركة.
