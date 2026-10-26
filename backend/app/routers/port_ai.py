"""«Ariba AI» free questions (their supabase/functions/ariba-ai): general / external questions and web search through the
Anthropic Messages API. As decided in their code, NO employee data is sent here: the assistant's commands that read or change
program data run in the browser against our protected routes. The key stays on the server (ANTHROPIC_API_KEY); without it the
assistant keeps working for its direct commands and answers this mode with AI_NOT_CONFIGURED.
Env: ANTHROPIC_API_KEY, AI_MODEL (default claude-sonnet-5-5)."""
from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import APIRouter, Depends

from app.core.scheduling import today_riyadh
from app.routers import canonical as c

router = APIRouter()
STAFF = {"admin", "chairman", "hr", "ceo", "admin_manager", "finance", "accountant"}
SYSTEM = """أنت «مساعد اريبا AI» داخل نظام الموارد البشرية لشركة حلول أريبا لخدمات الأعمال. تكلّم المستخدم (مسؤول موارد بشرية) بالعربية المبسطة أو بلهجته.
دورك هنا: الإجابة عن أي سؤال عام أو خارجي (أنظمة العمل والتأمينات والضرائب والإقامة، الحسابات والإكسل والبرمجة، ترجمة وصياغة خطابات ورسائل، نصائح إدارة، معلومات عامة) من معرفتك، واستخدم البحث على الويب للمعلومات الحديثة أو المتغيرة (أسعار، قرارات، تواريخ، أخبار) واذكر المصدر باختصار.
حدود مهمة: ليس لديك أي وصول لبيانات موظفي الشركة (رواتب/إقامات/إجازات/حضور...) ولا تخمّنها. لو سُئلت عن بيانات داخلية أو طُلب تنفيذ إجراء في البرنامج، قل للمستخدم يكتب الطلب مباشرة بصيغة أمر مثل: «رصيد إجازة أحمد»، «أرسل رسالة لسارة: ...»، «كم عدد الموظفين»، «افتح المسير» — وسيُنفَّذ من داخل البرنامج.
لو احتاج فتح صفحة في البرنامج استخدم أداة open_page. أسلوبك: مختصر وعملي، وجداول Markdown بسيطة عند المقارنة."""
URL = "https://api.anthropic.com/v1/messages"


def _anthropic(key: str, model: str, messages: list[Any], tools: list[Any]) -> dict[str, Any]:
    body = {"model": model, "max_tokens": 4096, "system": SYSTEM + f"\nالتاريخ اليوم: {today_riyadh().isoformat()}.", "messages": messages,
            "tools": [*tools, {"type": "web_search_20250305", "name": "web_search", "max_uses": 5}]}
    r = httpx.post(URL, headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"}, json=body, timeout=90)
    if r.status_code >= 300:
        try:
            msg = r.json().get("error", {}).get("message") or r.text
        except ValueError:
            msg = r.text
        raise RuntimeError(f"{msg[:300]} [{r.status_code}]")
    return r.json()


@router.post("/ai/chat")
def chat(body: dict[str, Any], actor: dict[str, Any] = Depends(c.current_actor)):
    """{messages, tools} → {ok, content, stop_reason, extra} (or {ok:false, error, message}) as their ariba-ai answered."""
    if actor.get("role") not in STAFF:
        return {"ok": False, "error": "NOT_AUTHORIZED", "message": "المساعد الذكي لفريق الإدارة فقط"}
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return {"ok": False, "error": "AI_NOT_CONFIGURED", "message": "مفتاح الذكاء الاصطناعي (ANTHROPIC_API_KEY) غير مضاف في متغيرات الخادم"}
    messages = body.get("messages") if isinstance(body.get("messages"), list) else []
    messages = messages[-40:]
    tools = [t for t in (body.get("tools") if isinstance(body.get("tools"), list) else []) if isinstance(t, dict) and t.get("name") == "open_page"][:1]
    if not messages:
        return {"ok": False, "error": "NO_MESSAGES", "message": "لا توجد رسالة"}
    model = os.environ.get("AI_MODEL") or "claude-sonnet-5-5"
    msgs, res = messages, {}
    try:
        for _ in range(4):  # web search runs at Anthropic; on pause_turn we continue
            res = _anthropic(key, model, msgs, tools)
            if res.get("stop_reason") != "pause_turn":
                break
            msgs = [*msgs, {"role": "assistant", "content": res.get("content")}]
    except (RuntimeError, httpx.HTTPError) as e:
        return {"ok": False, "error": "AI_ERROR", "message": str(e)[:400]}
    return {"ok": True, "content": res.get("content"), "stop_reason": res.get("stop_reason"), "extra": msgs[len(messages):]}
