"""Gmail API sending (HTTPS, port 443) — the way out where SMTP is blocked (Railway outside Pro). Google is simulated."""
from __future__ import annotations

import base64
import email

import httpx

from app.services import mailer

PDF = base64.b64encode(b"%PDF-1.4 x").decode()
ACC = mailer.Account("company", "smtp.gmail.com", 465, True, "ariba.solution.co@gmail.com", "app-password", "ARIBA HR", "ariba.solution.co@gmail.com")
MAIL = mailer.Mail(["emp@example.com"], "مرحبا", "<p>نص عربي</p>", [{"filename": "a.pdf", "content": PDF, "contentType": "application/pdf"}])


class Google:
    """httpx.Client stand-in: records the calls, answers the token call and the send call."""
    token = (200, {"access_token": "tok"})
    send = (200, {"id": "m1"})
    calls: list = []

    def __init__(self, *a, **k): ...
    def __enter__(self): return self
    def __exit__(self, *a): return False

    def post(self, url, **kw):
        Google.calls.append((url, kw))
        status, body = Google.token if "oauth2.googleapis.com" in url else Google.send
        return httpx.Response(status, json=body)


def _env(monkeypatch, gmail=True, resend=False):
    for k in ("GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER", "RESEND_API_KEY", "EMAIL_FROM", "MAIL_DISABLED"):
        monkeypatch.delenv(k, raising=False)
    if gmail:
        monkeypatch.setenv("GMAIL_CLIENT_ID", "cid"); monkeypatch.setenv("GMAIL_CLIENT_SECRET", "sec"); monkeypatch.setenv("GMAIL_REFRESH_TOKEN", "rt")
    if resend:
        monkeypatch.setenv("RESEND_API_KEY", "r"); monkeypatch.setenv("EMAIL_FROM", "HR <hr@example.com>")
    Google.calls = []
    Google.token, Google.send = (200, {"access_token": "tok"}), (200, {"id": "m1"})
    monkeypatch.setattr(mailer.httpx, "Client", Google)
    monkeypatch.setattr(mailer, "_smtp", lambda acc, m: (_ for _ in ()).throw(OSError("[Errno 101] Network is unreachable")))


def test_sends_over_https_with_the_real_mime(monkeypatch):
    _env(monkeypatch)
    r = mailer.send(ACC, MAIL)
    assert r == {"ok": True, "via": "gmail_api", "from": "ariba.solution.co@gmail.com"}
    token_call, send_call = Google.calls
    assert token_call[1]["data"]["grant_type"] == "refresh_token" and token_call[1]["data"]["refresh_token"] == "rt"
    assert send_call[0] == "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    assert send_call[1]["headers"]["Authorization"] == "Bearer tok"
    msg = email.message_from_bytes(base64.urlsafe_b64decode(send_call[1]["json"]["raw"]))
    assert msg["To"] == "emp@example.com" and "ariba.solution.co@gmail.com" in msg["From"]
    assert email.header.decode_header(msg["Subject"])[0][0] in ("مرحبا".encode(), "مرحبا")
    parts = list(msg.walk())
    assert any(p.get_content_type() == "text/html" and "نص عربي" in p.get_payload(decode=True).decode() for p in parts)
    assert any(p.get_filename() == "a.pdf" and p.get_payload(decode=True).startswith(b"%PDF") for p in parts)


def test_works_without_a_saved_mailbox_when_the_sender_is_set(monkeypatch):
    _env(monkeypatch)
    monkeypatch.setenv("GMAIL_SENDER", "ariba.solution.co@gmail.com")
    assert mailer.send(None, MAIL)["via"] == "gmail_api"


def test_not_used_for_other_hosts_or_without_the_keys(monkeypatch):
    _env(monkeypatch, gmail=False)
    r = mailer.send(ACC, MAIL)
    assert not r["ok"] and "Network is unreachable" in r["message"] and not Google.calls  # SMTP only, as before
    _env(monkeypatch)
    other = mailer.Account("company", "smtp.example.com", 465, True, "u", "p", None, "u@example.com")
    assert not mailer.send(other, MAIL)["ok"] and not Google.calls


def test_expired_refresh_token_is_explained(monkeypatch):
    _env(monkeypatch)
    Google.token = (400, {"error": "invalid_grant", "error_description": "Token has been expired or revoked."})
    r = mailer.send(ACC, MAIL)
    assert not r["ok"] and "Testing" in r["message"] and "7 أيام" in r["message"]


def test_api_not_enabled_is_explained(monkeypatch):
    _env(monkeypatch)
    Google.send = (403, {"error": {"message": "Gmail API has not been used in project"}})
    r = mailer.send(ACC, MAIL)
    assert not r["ok"] and "gmail.send" in r["message"]


def test_falls_back_to_resend_when_gmail_fails(monkeypatch):
    _env(monkeypatch, resend=True)
    Google.token = (400, {"error": "invalid_grant"})
    monkeypatch.setattr(mailer, "_resend", lambda acc, m: {"ok": True, "via": "resend", "from": "HR <hr@example.com>"})
    assert mailer.send(ACC, MAIL)["via"] == "resend"
