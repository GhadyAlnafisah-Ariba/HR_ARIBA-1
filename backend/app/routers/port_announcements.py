"""Announcements and greetings (the HR department's 22/10 sql/21, 22 and 24: ariba_ann_send, ariba_ann_hr_list, ariba_ann_delete,
ariba_ann_missing, ariba_my_announcements, ariba_occ_list/save/delete, ariba_occ_run_auto) as server routes on our normalized
schema. Delivery is a row in workflow_notifications, which the scheduler e-mails and pushes like every other notification."""
from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.core.scheduling import today_riyadh
from app.database import get_db
from app.routers import canonical as c
from app.services import port_common as pc

router = APIRouter()
MODS = "employees|settings"
KINDS = {"announcement", "greeting"}
AUDIENCES = {"all", "employer", "employees"}
# employee_directory rows that may receive: active and not terminated (their ariba__recipients)
ACTIVE = "d.active AND COALESCE(d.data->>'isTerminated','false') <> 'true' AND COALESCE(d.data->>'term','false') <> 'true'"
OCC_AR = {"graduation": "التخرج", "wedding": "الزواج", "newborn": "المولود الجديد", "promotion": "الترقية", "recovery": "الشفاء",
          "achievement": "الإنجاز", "other": "المناسبة"}


def norm_emp(db: Session, ident: str) -> str:
    """ariba_norm_emp (sql/24): the screen's id may be the XLS-… one kept in data.id; the notification goes to employee_id."""
    r = db.execute(text("""SELECT employee_id FROM public.employee_directory WHERE employee_id=:p OR data->>'id'=:p
        ORDER BY (employee_id=:p) DESC LIMIT 1"""), {"p": ident}).first()
    return r[0] if r else ident


def recipients(db: Session, audience: str, employer: str | None, ids: list[str]) -> list[str]:
    """ariba__recipients (sql/24)."""
    rows = db.execute(text(f"""SELECT d.employee_id FROM public.employee_directory d LEFT JOIN public.employers er ON er.id=d.employer_id
        WHERE {ACTIVE} AND (:a='all' OR (:a='employer' AND er.name=:emp) OR (:a='employees' AND (d.employee_id = ANY(:ids) OR d.data->>'id' = ANY(:ids))))
        ORDER BY d.employee_id"""), {"a": audience, "emp": employer, "ids": ids}).all()
    return [r[0] for r in rows]


def _first(name: Any) -> str:
    return str(name or "").split(" ")[0]


def _deliver(db: Session, to: list[str], title: str, body: str, kind: str) -> None:
    for eid in to:
        pc.notify(db, eid, None, title, body or title, stage="message", kind=kind)


def send(db: Session, actor: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    kind = "greeting" if b.get("kind") == "greeting" else "announcement"
    title, body = str(b.get("title") or "").strip(), str(b.get("body") or "")
    audience, employer = str(b.get("audience") or "all"), str(b.get("employer") or "").strip() or None
    if not title:
        raise ApiError(400, "TITLE_REQUIRED", "اكتب العنوان")
    if audience not in AUDIENCES:
        raise ApiError(400, "BAD_AUDIENCE", "جمهور غير صحيح")
    if audience == "employer" and not employer:
        raise ApiError(400, "EMPLOYER_REQUIRED", "اختر الشركة")
    ids = sorted({norm_emp(db, str(i)) for i in (b.get("ids") or [])}) if audience == "employees" else []
    if audience == "employees" and not ids:
        raise ApiError(400, "EMPLOYEES_REQUIRED", "اختر موظفًا واحدًا على الأقل")
    to = recipients(db, audience, employer, ids)
    exp = b.get("expires")
    aid = db.execute(text("""INSERT INTO public.ariba_announcements(kind,occasion,title,body,audience,employer,employee_ids,pinned,expires_on,source,created_by,sent_count)
        VALUES(:k,:o,:t,:b,:a,:e,:ids,:p,:x,'manual',:by,:n) RETURNING id"""),
        {"k": kind, "o": (str(b.get("occasion") or "").strip() or None), "t": title[:200], "b": body, "a": audience, "e": employer, "ids": ids,
         "p": bool(b.get("pinned")), "x": date.fromisoformat(exp) if exp else None, "by": actor.get("employee_id"), "n": len(to)}).scalar()
    _deliver(db, to, title[:200], body.strip(), kind)
    return {"ok": True, "id": str(aid), "sent": len(to)}


@router.post("/announcements/send")
def ann_send(body: dict[str, Any], request: Request, actor: dict[str, Any] = Depends(c.current_actor), db: Session = Depends(get_db)):
    pc.require(db, actor, MODS, "edit")
    out = send(db, actor, body)
    what = "تهنئة" if body.get("kind") == "greeting" else "إعلان"
    c._write_audit(db, actor, request, "employees", f"إرسال {what}: {str(body.get('title') or '')[:80]} ({out['sent']} موظف)", body.get("kind") or "announcement", out["id"],
                   summary=f"إرسال {what}: {str(body.get('title') or '')[:80]} ({out['sent']} موظف)")
    db.commit()
    return out


@router.get("/announcements")
def ann_list(limit: int = 100, actor: dict[str, Any] = Depends(c.current_actor), db: Session = Depends(get_db)):
    pc.require(db, actor, MODS, "view")
    rows = c._rows(db, """SELECT id,kind,occasion,title,body,audience,employer,employee_ids,pinned,expires_on,source,sent_count,created_at
        FROM public.ariba_announcements WHERE NOT hidden ORDER BY created_at DESC LIMIT :n""", n=max(1, min(int(limit), 300)))
    return {"ok": True, "items": [{**r, "id": str(r["id"])} for r in rows]}


@router.delete("/announcements/{ann_id}")
def ann_delete(ann_id: str, actor: dict[str, Any] = Depends(c.current_actor), db: Session = Depends(get_db)):
    """Hide, not delete: the sent notifications stay."""
    pc.require(db, actor, MODS, "edit")
    db.execute(text("UPDATE public.ariba_announcements SET hidden=true WHERE id=CAST(:i AS uuid)"), {"i": ann_id})
    db.commit()
    return {"ok": True}


@router.post("/announcements/missing")
def ann_missing(body: dict[str, Any], actor: dict[str, Any] = Depends(c.current_actor), db: Session = Depends(get_db)):
    """ariba_ann_missing: the chosen ids that cannot receive (not in the directory, inactive or terminated)."""
    pc.require(db, actor, MODS, "edit")
    ids = [str(i) for i in (body.get("ids") or [])]
    ok = {r[0] for r in db.execute(text(f"SELECT d.employee_id FROM public.employee_directory d WHERE {ACTIVE} AND (d.employee_id = ANY(:i) OR d.data->>'id' = ANY(:i))"), {"i": ids})}
    okx = {r[0] for r in db.execute(text(f"SELECT d.data->>'id' FROM public.employee_directory d WHERE {ACTIVE} AND d.data->>'id' = ANY(:i)"), {"i": ids})}
    return {"ok": True, "missing": [i for i in ids if i not in ok and i not in okx]}


@router.get("/me/announcements")
def my_announcements(actor: dict[str, Any] = Depends(c.current_actor), db: Session = Depends(get_db)):
    """ariba_my_announcements: running announcements (pinned, or the last 14 days) and greetings of the last 3 days for me."""
    me = actor.get("employee_id")
    today = today_riyadh()
    emp = db.execute(text("SELECT er.name FROM public.employee_directory d LEFT JOIN public.employers er ON er.id=d.employer_id WHERE d.employee_id=:e"), {"e": me}).first()
    employer = emp[0] if emp else None
    rows = c._rows(db, """SELECT a.id,a.kind,a.occasion,a.title,a.body,a.pinned,a.created_at FROM public.ariba_announcements a
        WHERE NOT a.hidden AND (a.expires_on IS NULL OR a.expires_on >= :today)
          AND ((a.kind='announcement' AND (a.pinned OR a.created_at > now() - interval '14 days'))
            OR (a.kind='greeting' AND a.created_at > now() - interval '3 days'))
          AND (a.audience='all' OR (a.audience='employer' AND a.employer=:emp) OR (a.audience='employees' AND :me = ANY(a.employee_ids)))
        ORDER BY a.pinned DESC, a.created_at DESC LIMIT 10""", today=today, emp=employer, me=me)
    return {"ok": True, "items": [{**r, "id": str(r["id"])} for r in rows]}


# ---------------------------------------------------------------- employees' registered occasions
@router.get("/occasions")
def occ_list(actor: dict[str, Any] = Depends(c.current_actor), db: Session = Depends(get_db)):
    pc.require(db, actor, MODS, "view")
    rows = c._rows(db, """SELECT o.id,o.employee_id,COALESCE(d.name_ar,d.name_en,o.employee_id) AS name,o.occasion,o.occ_date,o.yearly,o.note
        FROM public.ariba_emp_occasions o LEFT JOIN public.employee_directory d ON d.employee_id=o.employee_id WHERE NOT o.hidden ORDER BY o.occ_date DESC""")
    return {"ok": True, "items": [{**r, "id": str(r["id"]), "occ_date": r["occ_date"].isoformat()} for r in rows]}


@router.post("/occasions")
def occ_save(body: dict[str, Any], actor: dict[str, Any] = Depends(c.current_actor), db: Session = Depends(get_db)):
    pc.require(db, actor, MODS, "edit")
    eid, occ, d = str(body.get("employee_id") or "").strip(), str(body.get("occasion") or "").strip(), body.get("date")
    if not eid or not occ or not d:
        raise ApiError(400, "BAD_INPUT", "بيانات ناقصة")
    oid = db.execute(text("""INSERT INTO public.ariba_emp_occasions(employee_id,occasion,occ_date,yearly,note,created_by)
        VALUES(:e,:o,:d,:y,:n,:by) RETURNING id"""), {"e": norm_emp(db, eid), "o": occ, "d": date.fromisoformat(str(d)[:10]), "y": bool(body.get("yearly")),
                                                       "n": (str(body.get("note") or "").strip() or None), "by": actor.get("employee_id")}).scalar()
    db.commit()
    return {"ok": True, "id": str(oid)}


@router.delete("/occasions/{occ_id}")
def occ_delete(occ_id: str, actor: dict[str, Any] = Depends(c.current_actor), db: Session = Depends(get_db)):
    pc.require(db, actor, MODS, "edit")
    db.execute(text("UPDATE public.ariba_emp_occasions SET hidden=true WHERE id=CAST(:i AS uuid)"), {"i": occ_id})
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- automatic greetings (ariba__occ_run)
def _tpl(cfg_tpl: dict[str, Any], key: str, field: str, default: str) -> str:
    v = ((cfg_tpl or {}).get(key) or {}).get(field)
    return str(v) if v else default


def run_auto(db: Session, today: date | None = None) -> int:
    """Birthday, work anniversary and the registered occasions of today, once per person / occasion / year (auto_key).
    Only when Settings › automatic greetings is on (occasions_auto.enabled). Returns how many were sent."""
    cfg = pc.get_setting(db, "occasions_auto")
    if not isinstance(cfg, dict) or cfg.get("enabled") is not True:
        return 0
    today = today or today_riyadh()
    tpl = cfg.get("tpl") if isinstance(cfg.get("tpl"), dict) else {}
    can_get = set(recipients(db, "all", None, []))
    n = 0

    def once(eid: str, occasion: str, key: str, title: str, body: str) -> None:
        nonlocal n
        got = db.execute(text("""INSERT INTO public.ariba_announcements(kind,occasion,title,body,audience,employee_ids,source,auto_key,sent_count)
            VALUES('greeting',:o,:t,:b,'employees',ARRAY[CAST(:e AS text)],'auto',:k,1) ON CONFLICT (auto_key) DO NOTHING RETURNING id"""),
            {"o": occasion, "t": title, "b": body, "e": eid, "k": key}).first()
        if got:
            pc.notify(db, eid, None, title, body, stage="message", kind="greeting")
            n += 1

    if cfg.get("birthday") is not False and str(cfg.get("birthday")).lower() != "false":
        for r in db.execute(text("""SELECT employee_id, COALESCE(name_ar,name_en,employee_id) FROM public.employee_directory
                WHERE dob IS NOT NULL AND EXTRACT(month FROM dob)=:m AND EXTRACT(day FROM dob)=:d"""), {"m": today.month, "d": today.day}).all():
            if r[0] in can_get:
                nm = _first(r[1])
                once(r[0], "birthday", f"birthday:{r[0]}:{today.year}",
                     _tpl(tpl, "birthday", "title", "🎂 كل عام وأنت بخير يا {name}").replace("{name}", nm),
                     _tpl(tpl, "birthday", "body", "تتمنى لك إدارة الموارد البشرية عامًا مليئًا بالصحة والنجاح والسعادة. كل عام وأنت بخير.").replace("{name}", nm))
    if cfg.get("anniversary") is not False and str(cfg.get("anniversary")).lower() != "false":
        for r in db.execute(text("""SELECT employee_id, COALESCE(name_ar,name_en,employee_id), CAST(:y - EXTRACT(year FROM join_date) AS int) FROM public.employee_directory
                WHERE join_date IS NOT NULL AND EXTRACT(year FROM join_date) < :y AND EXTRACT(month FROM join_date)=:m AND EXTRACT(day FROM join_date)=:d"""),
                           {"y": today.year, "m": today.month, "d": today.day}).all():
            if r[0] in can_get:
                nm, yrs = _first(r[1]), str(r[2])
                once(r[0], "anniversary", f"anniversary:{r[0]}:{today.year}",
                     _tpl(tpl, "anniversary", "title", "🎉 {years} سنة معنا يا {name}").replace("{name}", nm).replace("{years}", yrs),
                     _tpl(tpl, "anniversary", "body", "نشكرك على جهودك وإخلاصك، ونتمنى لك دوام التوفيق في مسيرتك معنا.").replace("{name}", nm).replace("{years}", yrs))
    if cfg.get("custom") is not False and str(cfg.get("custom")).lower() != "false":
        for r in db.execute(text("""SELECT o.id, o.employee_id, o.occasion, COALESCE(d.name_ar,d.name_en,o.employee_id) FROM public.ariba_emp_occasions o
                JOIN public.employee_directory d ON d.employee_id=o.employee_id WHERE NOT o.hidden AND
                ((o.yearly AND EXTRACT(month FROM o.occ_date)=:m AND EXTRACT(day FROM o.occ_date)=:d) OR (NOT o.yearly AND o.occ_date=:t))"""),
                           {"m": today.month, "d": today.day, "t": today}).all():
            if r[1] in can_get:
                nm = _first(r[3])
                once(r[1], r[2], f"occ:{r[0]}:{today.year}",
                     _tpl(tpl, r[2], "title", "🎊 تهنئة بمناسبة " + OCC_AR.get(r[2], r[2]) + " يا {name}").replace("{name}", nm),
                     _tpl(tpl, r[2], "body", "تهنئة من إدارة الموارد البشرية، ونتمنى لك دوام التوفيق والسعادة.").replace("{name}", nm))
    return n


@router.post("/occasions/run-auto")
def occ_run_auto(actor: dict[str, Any] = Depends(c.current_actor), db: Session = Depends(get_db)):
    """ariba_occ_run_auto: any valid session may trigger today's greetings; the unique auto_key stops repeats."""
    n = run_auto(db)
    db.commit()
    return {"ok": True, "sent": n}


__all__ = ["router", "run_auto", "recipients", "norm_emp"]
