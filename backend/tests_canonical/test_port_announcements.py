"""Announcements and greetings (22/10 update) on a real database: send to everyone / one employer / chosen employees, the
permission check, hiding, the employee's own list, the registered occasions and the automatic greetings (once per year)."""
from __future__ import annotations

from datetime import date

from port_fixtures import login, sql

V1 = "/api/v1"


def h(api, user):
    return login(api, user)


def _count(engine, title):
    return sql(engine, "SELECT count(*) AS n FROM public.workflow_notifications WHERE title=:t AND kind IN ('announcement','greeting')", t=title)[0]["n"]


def test_send_to_everyone_reaches_only_active_staff(api, port_engine):
    r = api.post(f"{V1}/announcements/send", headers=h(api, "hr.test"), json={"kind": "announcement", "title": "إجازة العيد", "body": "من 28 مارس", "audience": "all"})
    assert r.status_code == 200, r.text
    active = sql(port_engine, """SELECT count(*) AS n FROM public.employee_directory d WHERE d.active
        AND COALESCE(d.data->>'isTerminated','false')<>'true' AND COALESCE(d.data->>'term','false')<>'true'""")[0]["n"]
    assert r.json()["sent"] == active > 0
    assert _count(port_engine, "إجازة العيد") == active


def test_employee_cannot_send_and_title_is_required(api):
    assert api.post(f"{V1}/announcements/send", headers=h(api, "emp.test"), json={"title": "x"}).status_code == 403
    r = api.post(f"{V1}/announcements/send", headers=h(api, "hr.test"), json={"title": "  ", "audience": "all"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "TITLE_REQUIRED"


def test_chosen_employees_and_the_employees_own_list(api, port_engine):
    r = api.post(f"{V1}/announcements/send", headers=h(api, "hr.test"), json={"kind": "announcement", "title": "لموظف واحد", "audience": "employees", "ids": ["51"], "pinned": True})
    assert r.json()["sent"] == 1
    mine = api.get(f"{V1}/me/announcements", headers=h(api, "emp.test")).json()["items"]
    assert [x["title"] for x in mine if x["title"] == "لموظف واحد"] == ["لموظف واحد"]
    other = api.get(f"{V1}/me/announcements", headers=h(api, "mgr.test")).json()["items"]
    assert not [x for x in other if x["title"] == "لموظف واحد"]


def test_hiding_removes_it_from_the_list_but_keeps_the_notifications(api, port_engine):
    aid = api.post(f"{V1}/announcements/send", headers=h(api, "hr.test"), json={"title": "سيُخفى", "audience": "employees", "ids": ["51"]}).json()["id"]
    assert any(x["id"] == aid for x in api.get(f"{V1}/announcements", headers=h(api, "hr.test")).json()["items"])
    assert api.delete(f"{V1}/announcements/{aid}", headers=h(api, "hr.test")).status_code == 200
    assert not any(x["id"] == aid for x in api.get(f"{V1}/announcements", headers=h(api, "hr.test")).json()["items"])
    assert _count(port_engine, "سيُخفى") == 1


def test_missing_ids_are_reported(api):
    r = api.post(f"{V1}/announcements/missing", headers=h(api, "hr.test"), json={"ids": ["51", "no-such-employee"]}).json()
    assert r["missing"] == ["no-such-employee"]


def test_registered_occasion_and_automatic_greetings_once_a_year(api, port_engine):
    today = date.today()
    sql(port_engine, "UPDATE public.employee_directory SET dob=:d WHERE employee_id='51'", d=date(1990, today.month, today.day))
    # off by default: nothing is sent
    assert api.post(f"{V1}/occasions/run-auto", headers=h(api, "hr.test")).json()["sent"] == 0
    api.put(f"{V1}/settings/kv/occasions_auto", headers=h(api, "hr.test"), json={"value": {"enabled": True, "birthday": True, "anniversary": False, "custom": True, "tpl": {}}})
    r = api.post(f"{V1}/occasions", headers=h(api, "hr.test"), json={"employee_id": "52", "occasion": "graduation", "date": today.isoformat(), "yearly": False})
    assert r.status_code == 200, r.text
    first = api.post(f"{V1}/occasions/run-auto", headers=h(api, "hr.test")).json()["sent"]
    assert first >= 2  # the birthday of 51 and the graduation of 52
    assert api.post(f"{V1}/occasions/run-auto", headers=h(api, "hr.test")).json()["sent"] == 0  # auto_key: once per person / occasion / year
    greetings = sql(port_engine, "SELECT recipient_employee_id AS r, title FROM public.workflow_notifications WHERE kind='greeting' AND recipient_employee_id IN ('51','52')")
    assert {g["r"] for g in greetings} == {"51", "52"}
    items = api.get(f"{V1}/occasions", headers=h(api, "hr.test")).json()["items"]
    assert any(i["employee_id"] == "52" and i["occasion"] == "graduation" for i in items)
