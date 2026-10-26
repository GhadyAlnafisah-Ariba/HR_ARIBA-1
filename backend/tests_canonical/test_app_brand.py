"""The employee app has its own identity (`app_brand`), apart from the website's colours (`brand_colors`)."""
from __future__ import annotations

from sqlalchemy import text

from port_fixtures import login

V1 = "/api/v1"


def h(api, user):
    return login(api, user)


def _clear(port_engine):
    with port_engine.begin() as c:
        c.execute(text("DELETE FROM public.ariba_app_settings WHERE key IN ('brand_colors','app_brand','company_logo')"))


import pytest


@pytest.fixture(autouse=True)
def _clean(port_engine):
    _clear(port_engine)
    yield
    _clear(port_engine)


def test_app_follows_the_old_shared_value_until_the_site_colours_change(api, port_engine):
    _clear(port_engine)
    hr = h(api, "hr.test")
    assert api.get(f"{V1}/public/brand").json()["brand"] == {}                       # nothing set: the app keeps its own colours
    assert api.put(f"{V1}/settings/kv/brand_colors", json={"value": {"p": "#111111", "s": "#EEEEEE", "a": "#222222"}}, headers=hr).status_code == 200
    assert api.get(f"{V1}/public/brand").json()["brand"]["p"] == "#111111"          # first change: still shared (nothing to protect)
    # the site's colours change again: the app's look was saved as its own identity first, so it does not move
    assert api.put(f"{V1}/settings/kv/brand_colors", json={"value": {"p": "#333333", "s": "#FFFFFF"}}, headers=hr).status_code == 200
    assert api.get(f"{V1}/public/brand").json()["brand"]["p"] == "#111111"
    assert api.get(f"{V1}/settings/kv/brand_colors", headers=hr).json()["value"]["p"] == "#333333"


def test_app_identity_is_set_apart_and_carries_its_own_logo(api, port_engine):
    _clear(port_engine)
    hr = h(api, "hr.test")
    assert api.put(f"{V1}/settings/kv/company_logo", json={"value": {"data": "data:image/png;base64,AAAA"}}, headers=hr).status_code == 200
    assert api.get(f"{V1}/public/brand").json()["logo"] == "data:image/png;base64,AAAA"      # no app logo yet: the company logo
    assert api.put(f"{V1}/settings/kv/app_brand", json={"value": {"p": "#014D3D", "s": "#F4F0E4", "hero": "#0B6B4F", "logo": "data:image/png;base64,BBBB", "punch": "data:image/png;base64,CCCC", "heroImage": "data:image/png;base64,DDDD"}}, headers=hr).status_code == 200
    r = api.get(f"{V1}/public/brand").json()
    assert r["brand"]["hero"] == "#0B6B4F" and r["brand"]["punch"] == "data:image/png;base64,CCCC" and r["logo"] == "data:image/png;base64,BBBB" and r["brand"]["heroImage"] == "data:image/png;base64,DDDD"
    assert api.put(f"{V1}/settings/kv/app_brand", json={"value": {"p": "#000000"}}, headers=h(api, "emp.test")).status_code == 403
    assert api.put(f"{V1}/settings/kv/brand_colors", json={"value": {"p": "#999999", "s": "#FFFFFF"}}, headers=hr).status_code == 200
    assert api.get(f"{V1}/public/brand").json()["brand"]["p"] == "#014D3D"                    # the site's colours never reach the app
