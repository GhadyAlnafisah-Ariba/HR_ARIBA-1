"""One-time helper (run on YOUR machine, never on the server): signs in to the company Gmail account in your browser and prints the
refresh token the server needs for Gmail API sending.

  GMAIL_CLIENT_ID=… GMAIL_CLIENT_SECRET=… .venv/bin/python tools/gmail_oauth_token.py [--test someone@example.com]

Google Cloud setup (once): create a project → enable «Gmail API» → OAuth consent screen (External, add the company Gmail as a test
user, then «Publish app» so the token does not expire after 7 days) → Credentials → OAuth client ID → «Desktop app». Copy the
client id and secret into the two variables above. The scope is only `gmail.send` (it cannot read the mailbox).
Then put the three values in Railway: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN (and GMAIL_SENDER).
The token is printed to the terminal only; nothing is written to a file."""
from __future__ import annotations

import os
import sys
import threading
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

PORT = int(os.environ.get("GMAIL_OAUTH_PORT", "8765"))
REDIRECT = f"http://127.0.0.1:{PORT}/callback"
SCOPE = "https://www.googleapis.com/auth/gmail.send"


def main() -> int:
    cid, secret = os.environ.get("GMAIL_CLIENT_ID"), os.environ.get("GMAIL_CLIENT_SECRET")
    if not (cid and secret):
        print("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET first (see the top of this file).")
        return 2
    got: dict[str, str] = {}
    done = threading.Event()

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            got["code"] = (q.get("code") or [""])[0]
            got["error"] = (q.get("error") or [""])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("<h3>تم. ارجع إلى الـ Terminal.</h3>".encode())
            done.set()

        def log_message(self, *a):  # silence
            return

    srv = HTTPServer(("127.0.0.1", PORT), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": REDIRECT, "response_type": "code", "scope": SCOPE, "access_type": "offline", "prompt": "consent"})
    print("Opening your browser. Sign in with the COMPANY Gmail account and allow «Send email».\nIf it does not open, paste this link:\n" + url + "\n")
    webbrowser.open(url)
    done.wait(timeout=300)
    srv.shutdown()
    if not got.get("code"):
        print("No code received:", got.get("error") or "timed out")
        return 1
    r = httpx.post("https://oauth2.googleapis.com/token", data={"code": got["code"], "client_id": cid, "client_secret": secret,
                                                                 "redirect_uri": REDIRECT, "grant_type": "authorization_code"}, timeout=30)
    j = r.json()
    if not j.get("refresh_token"):
        print("No refresh token returned:", j.get("error_description") or j.get("error") or j)
        return 1
    print("GMAIL_REFRESH_TOKEN=" + j["refresh_token"])
    if "--test" in sys.argv:
        to = sys.argv[sys.argv.index("--test") + 1]
        os.environ["GMAIL_REFRESH_TOKEN"] = j["refresh_token"]
        os.environ.setdefault("GMAIL_SENDER", "")
        from app.services import mailer
        me = httpx.get("https://gmail.googleapis.com/gmail/v1/users/me/profile",
                       headers={"Authorization": "Bearer " + j["access_token"]}, timeout=30)
        sender = (me.json().get("emailAddress") if me.status_code == 200 else None) or os.environ.get("GMAIL_SENDER") or to
        os.environ["GMAIL_SENDER"] = sender
        res = mailer.send(None, mailer.Mail([to], "رسالة تجربة — نظام الموارد البشرية", mailer.wrap("رسالة تجربة", "وصلتك هذه الرسالة عبر Gmail API."), []))
        print("test send:", res)
        return 0 if res.get("ok") else 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
