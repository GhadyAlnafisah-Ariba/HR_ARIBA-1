"""Microsoft 365 (Graph) failures: the explanatory hints of the 22/10 mail.ts, and the move to Resend when it is configured."""
from __future__ import annotations

import base64

import httpx

from app.services import mailer

PDF = base64.b64encode(b"%PDF-1.4 x").decode()
ACC = mailer.Account("company", "smtp.office365.com", 587, False, "hr@example.com", "", "HR", "hr@example.com")
MAIL = mailer.Mail(["emp@example.com"], "subj", "<p>x</p>", [{"filename": "a.pdf", "content": PDF, "contentType": "application/pdf"}])


class FakeClient:
    """httpx.Client stand-in: the token call answers `token`, the sendMail call answers `send`."""
    token = (200, {"access_token": "t"})
    send = (202, "")

    def __init__(self, *a, **k): ...
    def __enter__(self): return self
    def __exit__(self, *a): return False

    def post(self, url, **kw):
        status, body = self.token if "login.microsoftonline" in url else self.send
        return httpx.Response(status, json=body) if isinstance(body, dict) else httpx.Response(status, text=body)


def _env(monkeypatch, graph=True, resend=False):
    for k in ("M365_TENANT_ID", "M365_CLIENT_ID", "M365_CLIENT_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "MAIL_DISABLED"):
        monkeypatch.delenv(k, raising=False)
    if graph:
        monkeypatch.setenv("M365_TENANT_ID", "t"); monkeypatch.setenv("M365_CLIENT_ID", "c"); monkeypatch.setenv("M365_CLIENT_SECRET", "s")
    if resend:
        monkeypatch.setenv("RESEND_API_KEY", "r"); monkeypatch.setenv("EMAIL_FROM", "HR <hr@example.com>")
    monkeypatch.setattr(mailer.httpx, "Client", FakeClient)


def test_graph_ok(monkeypatch):
    _env(monkeypatch)
    FakeClient.token, FakeClient.send = (200, {"access_token": "t"}), (202, "")
    assert mailer.send(ACC, MAIL) == {"ok": True, "via": "microsoft_graph", "from": "hr@example.com"}


def test_graph_403_explains_consent(monkeypatch):
    _env(monkeypatch)
    FakeClient.token, FakeClient.send = (200, {"access_token": "t"}), (403, {"error": {"message": "Access is denied"}})
    r = mailer.send(ACC, MAIL)
    assert r["error"] == "M365_SEND_FAILED" and "Admin consent" in r["message"]


def test_graph_404_explains_the_mailbox(monkeypatch):
    _env(monkeypatch)
    FakeClient.token, FakeClient.send = (200, {"access_token": "t"}), (404, {"error": {"code": "MailboxNotEnabledForRESTAPI"}})
    assert "Exchange Online" in mailer.send(ACC, MAIL)["message"]


def test_token_failure_names_the_secret_mistake(monkeypatch):
    _env(monkeypatch)
    FakeClient.token = (401, {"error": "invalid_client", "error_description": "bad secret"})
    r = mailer.send(ACC, MAIL)
    assert r["error"] == "M365_TOKEN_FAILED" and "Secret ID" in r["message"]


def test_not_configured_without_resend_stops_with_the_setup_message(monkeypatch):
    _env(monkeypatch, graph=False)
    assert mailer.send(ACC, MAIL)["error"] == "M365_GRAPH_NOT_CONFIGURED"


def test_graph_failure_falls_back_to_resend_when_configured(monkeypatch):
    _env(monkeypatch, graph=True, resend=True)
    FakeClient.token, FakeClient.send = (200, {"access_token": "t"}), (403, {"error": {"message": "Access is denied"}})
    sent = {}
    monkeypatch.setattr(mailer, "_resend", lambda acc, m: sent.update(reply=acc.from_email if acc else None) or {"ok": True, "via": "resend", "from": "HR <hr@example.com>"})
    r = mailer.send(ACC, MAIL)
    assert r["ok"] and r["via"] == "resend" and sent["reply"] == "hr@example.com"
