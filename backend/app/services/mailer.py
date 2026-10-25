"""E-mail (their supabase/functions/_shared/mail.ts): SMTP from the saved mailbox (the sender's own, else the company's),
Microsoft 365 through Graph (client credentials), and Resend as the fallback. Passwords are stored AES-GCM encrypted
with MAIL_SECRET_KEY (decision 5). Configuration from the environment:

  MAIL_SECRET_KEY          32+ characters; required to save or read a mailbox password
  RESEND_API_KEY, EMAIL_FROM                  Resend fallback (e.g. "Ariba HR <hr@example.com>")
  M365_TENANT_ID, M365_CLIENT_ID, M365_CLIENT_SECRET   Microsoft Graph Mail.Send (application permission)
  GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN   Gmail API over HTTPS (port 443) for a Gmail / Google Workspace
                           mailbox — for hosts that block SMTP (Railway outside the Pro plan); GMAIL_SENDER = the mailbox when none is saved
  MAIL_DISABLED=1          never connect out (tests, local runs); sends are logged as failed with MAIL_DISABLED
"""
from __future__ import annotations

import base64
import hashlib
import html
import os
import re
import smtplib
import ssl
from dataclasses import dataclass, field
from email.message import EmailMessage
from email.utils import formataddr
from typing import Any

import httpx
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy import text
from sqlalchemy.orm import Session

EMAIL_RE = re.compile(r"^\S+@\S+\.\S+$")


def is_email(x: Any) -> bool:
    return bool(EMAIL_RE.match(str(x or "").strip()))


def esc(s: Any) -> str:
    return html.escape(str(s or ""), quote=True)


def wrap(title: str, inner: str) -> str:
    """Their mail.ts `wrap` (the HTML frame of every e-mail)."""
    return (f'<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">'
            f'<div style="background:#014D3D;color:#fff;padding:14px 18px;font-weight:700">{esc(title)}</div>'
            f'<div style="padding:18px;line-height:1.9;color:#111">{inner}</div>'
            f'<div style="padding:10px 18px;background:#f8fafc;color:#64748b;font-size:12px">الموارد البشرية — أريبا</div></div>')


# ---------------------------------------------------------------- password encryption (AES-GCM)
def _key() -> bytes:
    secret = os.environ.get("MAIL_SECRET_KEY", "")
    if len(secret) < 32:
        raise RuntimeError("MAIL_SECRET_KEY is not set (32+ characters)")
    return hashlib.sha256(secret.encode()).digest()


def encrypt(password: str) -> bytes:
    nonce = os.urandom(12)
    return nonce + AESGCM(_key()).encrypt(nonce, password.encode(), b"ariba-mail")


def decrypt(blob: bytes | memoryview | None) -> str:
    if not blob:
        return ""
    b = bytes(blob)
    return AESGCM(_key()).decrypt(b[:12], b[12:], b"ariba-mail").decode()


# ---------------------------------------------------------------- accounts
@dataclass
class Account:
    owner: str
    host: str
    port: int
    secure: bool
    username: str
    password: str
    from_name: str | None
    from_email: str


@dataclass
class Mail:
    to: list[str]
    subject: str
    html: str
    attachments: list[dict[str, str]] = field(default_factory=list)  # {filename, content(base64), contentType}


def pick_account(db: Session, owner_id: str | None) -> Account | None:
    """The sender's own mailbox, else the company's (mail.ts pickAccount)."""
    owners = [o for o in (owner_id, "company") if o]
    rows = {r["owner"]: r for r in db.execute(text("SELECT * FROM public.ariba_mail_accounts WHERE owner = ANY(:o)"), {"o": owners}).mappings()}
    row = rows.get(owner_id or "") or rows.get("company")
    if not row:
        return None
    try:
        pw = decrypt(row["password_enc"])
    except Exception:  # noqa: BLE001 - a wrong key must not break the send; it fails over to Resend
        pw = ""
    return Account(row["owner"], row["host"] or "", int(row["port"] or 465), bool(row["secure"]), row["username"] or "", pw,
                   row["from_name"], row["from_email"])


def fix_account(acc: Account) -> Account:
    """mail.ts fixAccount: common Gmail typos; port 465 means SSL."""
    host = acc.host.strip().lower()
    if re.match(r"^smtp\.(gmil|gmial|gmai|gamil|gmal)\.com$", host) or host in ("gmail.com", "smtp.gmail"):
        host = "smtp.gmail.com"
    port = acc.port or 465
    return Account(acc.owner, host, port, True if port == 465 else acc.secure, acc.username, acc.password, acc.from_name, acc.from_email)


def is_o365(host: str) -> bool:
    return bool(re.search(r"office365|outlook\.com|live\.com|hotmail", host or "", re.I))


def _message(acc: Account, m: Mail) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((acc.from_name.replace('"', ""), acc.from_email)) if acc.from_name else acc.from_email
    msg["To"] = ", ".join(m.to)
    msg["Subject"] = m.subject
    msg.set_content("هذه الرسالة بتنسيق HTML.")
    msg.add_alternative(m.html, subtype="html")
    for a in m.attachments:
        maintype, _, subtype = (a.get("contentType") or "application/octet-stream").partition("/")
        msg.add_attachment(base64.b64decode(a["content"]), maintype=maintype, subtype=subtype or "octet-stream", filename=a["filename"])
    return msg


def _smtp(acc: Account, m: Mail) -> None:
    msg = _message(acc, m)
    ctx = ssl.create_default_context()
    if acc.port == 465 or acc.secure and acc.port != 587:
        with smtplib.SMTP_SSL(acc.host, acc.port, context=ctx, timeout=15) as s:
            s.login(acc.username, acc.password)
            s.send_message(msg)
    else:
        with smtplib.SMTP(acc.host, acc.port, timeout=15) as s:
            s.starttls(context=ctx)
            s.login(acc.username, acc.password)
            s.send_message(msg)


def is_gmail(host: str) -> bool:
    return bool(re.search(r"(^|\.)(gmail|googlemail)\.com$", (host or "").strip().lower()))


def gmail_configured() -> bool:
    return bool(os.environ.get("GMAIL_CLIENT_ID") and os.environ.get("GMAIL_CLIENT_SECRET") and os.environ.get("GMAIL_REFRESH_TOKEN"))


def _gmail_api(acc: Account | None, m: Mail) -> dict[str, Any]:
    """Gmail API users.messages.send over HTTPS (OAuth2 refresh token). The message is the same MIME the SMTP path builds, so the
    attachments and the Arabic text are identical; Google sends it as the authorised mailbox (From must be that mailbox or its alias)."""
    sender = (acc.from_email if acc else None) or os.environ.get("GMAIL_SENDER") or ""
    if not sender:
        return {"ok": False, "error": "GMAIL_SENDER_MISSING", "message": "حدّد بريد الشركة في الإعدادات أو GMAIL_SENDER"}
    if any(len(a["content"]) > 18_000_000 for a in m.attachments):
        return {"ok": False, "error": "GMAIL_ATTACHMENT_TOO_LARGE", "message": "المرفق أكبر من حد Gmail (نحو 25 MB)."}
    shell = acc or Account("company", "smtp.gmail.com", 465, True, sender, "", None, sender)
    raw = base64.urlsafe_b64encode(_message(shell, m).as_bytes()).decode()
    with httpx.Client(timeout=30) as c:
        tr = c.post("https://oauth2.googleapis.com/token", data={
            "client_id": os.environ["GMAIL_CLIENT_ID"], "client_secret": os.environ["GMAIL_CLIENT_SECRET"],
            "refresh_token": os.environ["GMAIL_REFRESH_TOKEN"], "grant_type": "refresh_token"})
        try:
            tj = tr.json()
        except ValueError:
            tj = {}
        token = tj.get("access_token") if tr.status_code == 200 else None
        if not token:
            why = re.sub(r"\s+", " ", str(tj.get("error_description") or tj.get("error") or tr.status_code))[:200]
            hint = " ← غالبًا انتهت صلاحية الـ refresh token (تطبيق Google في وضع Testing ينتهي بعد 7 أيام) أو القيم خاطئة." if "invalid_grant" in why or "invalid_grant" in str(tj.get("error")) else ""
            return {"ok": False, "error": "GMAIL_TOKEN_FAILED", "message": f"فشل دخول Gmail API ({why}).{hint}"}
        sent = c.post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", headers={"Authorization": f"Bearer {token}"}, json={"raw": raw})
        if sent.status_code >= 300:
            body = re.sub(r"\s+", " ", sent.text)
            if sent.status_code in (401, 403):
                hint = " ← فعّل Gmail API في المشروع ووافق على صلاحية gmail.send."
            elif sent.status_code == 400 and "Invalid" in body:
                hint = " ← تحقق من عنوان المستلم."
            else:
                hint = ""
            return {"ok": False, "error": "GMAIL_SEND_FAILED", "message": f"Gmail رفض الإرسال ({sent.status_code}){hint} " + body[:200]}
    return {"ok": True, "via": "gmail_api", "from": sender}


def _graph(acc: Account, m: Mail, can_fall_back: bool = False) -> dict[str, Any]:
    """Microsoft Graph sendMail (their mail.ts, 22/10). `can_fall_back`: Resend is configured, so a failure here is reported as
    {"ok": False, "fallback": True, "note": …} and the caller tries Resend instead of stopping with the error."""
    tenant, cid, secret = os.environ.get("M365_TENANT_ID"), os.environ.get("M365_CLIENT_ID"), os.environ.get("M365_CLIENT_SECRET")

    def fail(error: str, message: str, note: str) -> dict[str, Any]:
        return {"ok": False, "fallback": True, "note": note} if can_fall_back else {"ok": False, "error": error, "message": message}

    if not (tenant and cid and secret):
        return fail("M365_GRAPH_NOT_CONFIGURED", "Microsoft 365 يحتاج M365_TENANT_ID وM365_CLIENT_ID وM365_CLIENT_SECRET وصلاحية Microsoft Graph Mail.Send (Application) مع موافقة المسؤول. (الخطوات في docs/M365_GRAPH_SETUP.md)", "M365: الأسرار غير مضبوطة")
    if any(len(a["content"]) > 4_000_000 for a in m.attachments):
        return {"ok": False, "error": "M365_ATTACHMENT_TOO_LARGE", "message": "ملف PDF أكبر من 3 MB؛ قلّل حجمه ثم أعد الإرسال."}
    sender = (acc.from_email or acc.username).strip()
    with httpx.Client(timeout=20) as c:
        tr = c.post(f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
                    data={"client_id": cid, "client_secret": secret, "scope": "https://graph.microsoft.com/.default", "grant_type": "client_credentials"})
        try:
            tj = tr.json()
        except ValueError:
            tj = {}
        token = tj.get("access_token") if tr.status_code == 200 else None
        if not token:
            why = re.sub(r"\s+", " ", str(tj.get("error_description") or tj.get("error") or tr.status_code))[:200]
            return fail("M365_TOKEN_FAILED", f"فشل تسجيل تطبيق Microsoft 365 ({why}). راجع Tenant ID وClient ID وClient Secret (انتبه: القيمة Value وليست Secret ID) وأنها لم تنتهِ.", "M365 token: " + why)
        message = {"subject": m.subject, "body": {"contentType": "HTML", "content": m.html},
                   "toRecipients": [{"emailAddress": {"address": a}} for a in m.to],
                   "attachments": [{"@odata.type": "#microsoft.graph.fileAttachment", "name": a["filename"],
                                    "contentType": a.get("contentType") or "application/pdf", "contentBytes": a["content"]} for a in m.attachments]}
        sent = c.post(f"https://graph.microsoft.com/v1.0/users/{sender}/sendMail", headers={"Authorization": f"Bearer {token}"},
                      json={"message": message, "saveToSentItems": True})
        if sent.status_code >= 300:
            body = re.sub(r"\s+", " ", sent.text)
            if sent.status_code == 403 or re.search(r"Access|Authorization|denied", body, re.I):
                hint = " ← غالبًا صلاحية Mail.Send (Application) ناقصة أو لم تُعطَ Admin consent، أو سياسة ApplicationAccessPolicy تمنع هذا الصندوق."
            elif sent.status_code == 404 or re.search(r"MailboxNotEnabled|ResourceNotFound|NotFound", body, re.I):
                hint = f" ← الصندوق {sender} غير موجود أو بلا ترخيص Exchange Online (تأكد أن عنوان المرسل هو الصندوق الحقيقي)."
            elif sent.status_code == 401:
                hint = " ← الرمز مرفوض؛ راجع بيانات التطبيق."
            else:
                hint = ""
            return fail("M365_SEND_FAILED", f"Microsoft 365 رفض الإرسال ({sent.status_code}){hint} " + body[:220], f"M365 {sent.status_code}{hint}")
    return {"ok": True, "via": "microsoft_graph", "from": sender}


def _resend(acc: Account | None, m: Mail) -> dict[str, Any] | None:
    key, sender = os.environ.get("RESEND_API_KEY"), os.environ.get("EMAIL_FROM")
    if not (key and sender):
        return None
    r = httpx.post("https://api.resend.com/emails", headers={"Authorization": f"Bearer {key}"}, timeout=20, json={
        "from": sender, "to": m.to, "subject": m.subject, "html": m.html, "reply_to": acc.from_email if acc else None,
        "attachments": [{"filename": a["filename"], "content": a["content"]} for a in m.attachments]})
    if r.status_code < 300:
        return {"ok": True, "via": "resend", "from": sender}
    return {"ok": False, "error": "SEND_FAILED", "message": "Resend: " + r.text[:200]}


def send(acc0: Account | None, m: Mail) -> dict[str, Any]:
    """mail.ts sendMail: Graph for Microsoft 365; Gmail API for Gmail when GMAIL_* is set; else SMTP; Resend when those fail or nothing is saved.
    Our server is not on Supabase, so ports 25/587 are not blocked here."""
    if os.environ.get("MAIL_DISABLED") == "1":
        return {"ok": False, "error": "MAIL_DISABLED", "message": "الإرسال معطّل في هذه البيئة (MAIL_DISABLED)"}
    errs: list[str] = []
    acc = fix_account(acc0) if acc0 else None
    reply_to_acc = acc
    resend_ready = bool(os.environ.get("RESEND_API_KEY") and os.environ.get("EMAIL_FROM"))
    if acc and is_o365(acc.host):
        try:
            g = _graph(acc, m, can_fall_back=resend_ready)
        except httpx.HTTPError as e:
            g = ({"ok": False, "fallback": True, "note": "M365: " + str(e)[:120]} if resend_ready
                 else {"ok": False, "error": "M365_SEND_FAILED", "message": "تعذر الاتصال بـ Microsoft Graph: " + str(e)[:180]})
        if not g.get("fallback"):
            return g
        errs.append(g["note"])
        reply_to_acc, acc = acc, None  # Microsoft 365 never goes through SMTP; Resend below is the fallback (reply-to stays the mailbox)
    if gmail_configured() and ((acc and is_gmail(acc.host)) or (not acc and os.environ.get("GMAIL_SENDER"))):
        try:
            g = _gmail_api(acc, m)
        except httpx.HTTPError as e:
            g = {"ok": False, "error": "GMAIL_SEND_FAILED", "message": "تعذر الاتصال بـ Gmail API: " + str(e)[:180]}
        if g["ok"]:
            return g
        errs.append(g["message"])  # SMTP below is the next try (it works where port 465 is open), then Resend
    if acc:
        try:
            _smtp(acc, m)
            return {"ok": True, "via": "smtp", "from": acc.from_email}
        except (OSError, smtplib.SMTPException) as e:
            errs.append("SMTP: " + str(e)[:200])
    try:
        r = _resend(reply_to_acc, m)
    except httpx.HTTPError as e:
        r = {"ok": False, "error": "SEND_FAILED", "message": "Resend: " + str(e)[:200]}
    if r and r["ok"]:
        return r
    if r:
        errs.append(r["message"])
    if not acc and not r and not errs:
        return {"ok": False, "error": "EMAIL_NOT_CONFIGURED", "message": "مفيش بريد إرسال مضبوط (الإعدادات ← البريد والإشعارات)"}
    return {"ok": False, "error": "SEND_FAILED", "message": " | ".join(errs)}


def log_send(db: Session, kind: str, to: list[str], subject: str, result: dict[str, Any], by: str | None) -> None:
    db.execute(text("""INSERT INTO public.ariba_mail_log(kind,recipients,subject,status,error,sent_by)
        VALUES(:k,:to,:s,:st,:e,:by)"""), {"k": kind, "to": to, "s": subject[:300], "st": "sent" if result.get("ok") else "failed",
                                           "e": None if result.get("ok") else str(result.get("message") or result.get("error"))[:500], "by": by})


def employee_email(data: dict[str, Any]) -> str | None:
    for k in ("email", "workEmail", "mail"):
        v = str(data.get(k) or "").strip()
        if is_email(v):
            return v
    return None
