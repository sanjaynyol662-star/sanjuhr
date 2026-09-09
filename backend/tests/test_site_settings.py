"""Site theme & social links settings (GET /api/site-settings, PUT /api/admin/site-settings)"""
import os
import time

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/") + "/api"

ADMIN_EMAIL = "admin@haryanaenterprises.com"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(client):
    r = client.post(f"{BASE_URL}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def admin(client, token):
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


@pytest.fixture(scope="module", autouse=True)
def restore(client, token):
    yield
    client.headers.update({"Authorization": f"Bearer {token}"})
    r = client.put(f"{BASE_URL}/admin/site-settings", json={
        "default_theme": "light", "default_primary": "", "theme_locked": False,
    })
    assert r.status_code == 200


class TestSiteSettings:
    def test_unauthenticated_put_rejected(self, client):
        s = requests.Session()
        r = s.put(f"{BASE_URL}/admin/site-settings", json={"default_theme": "dark"})
        assert r.status_code in (401, 403), r.text[:200]

    def test_put_and_public_get(self, admin, client):
        payload = {
            "default_theme": "dracula", "default_primary": "", "theme_locked": False,
            "social_twitter": "https://x.com/hrdigital", "social_facebook": "",
            "social_instagram": "https://instagram.com/hrdigital", "social_youtube": "",
        }
        r = admin.put(f"{BASE_URL}/admin/site-settings", json=payload)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("ok") is True
        stamp = data.get("theme_updated_at")
        assert isinstance(stamp, str) and "T" in stamp

        pub = requests.get(f"{BASE_URL}/site-settings")
        assert pub.status_code == 200
        d = pub.json()
        assert d["default_theme"] == "dracula"
        assert d["default_primary"] == ""
        assert d["theme_locked"] is False
        assert d["social_twitter"] == "https://x.com/hrdigital"
        assert d["social_facebook"] == ""
        assert d["social_instagram"] == "https://instagram.com/hrdigital"
        assert d["social_youtube"] == ""
        assert d["theme_updated_at"] == stamp
        assert "_id" not in d

    def test_social_only_save_stamp_behaviour(self, admin):
        before = requests.get(f"{BASE_URL}/site-settings").json()["theme_updated_at"]
        time.sleep(1)
        r = admin.put(f"{BASE_URL}/admin/site-settings", json={"social_youtube": "https://youtube.com/@hrdigital"})
        assert r.status_code == 200
        after = requests.get(f"{BASE_URL}/site-settings").json()
        assert after["social_youtube"] == "https://youtube.com/@hrdigital"
        # Report only: social-only save should not bump the stamp
        assert after["theme_updated_at"] == before, "social-only save changed theme_updated_at"

    def test_theme_change_bumps_stamp(self, admin):
        before = requests.get(f"{BASE_URL}/site-settings").json()["theme_updated_at"]
        time.sleep(1)
        r = admin.put(f"{BASE_URL}/admin/site-settings", json={"default_theme": "nature", "default_primary": "#9f2d2d", "theme_locked": False})
        assert r.status_code == 200
        after = requests.get(f"{BASE_URL}/site-settings").json()
        assert after["default_theme"] == "nature"
        assert after["default_primary"] == "#9f2d2d"
        assert after["theme_updated_at"] != before

    def test_lock_toggle_persists(self, admin):
        r = admin.put(f"{BASE_URL}/admin/site-settings", json={"theme_locked": True})
        assert r.status_code == 200
        assert requests.get(f"{BASE_URL}/site-settings").json()["theme_locked"] is True
        r = admin.put(f"{BASE_URL}/admin/site-settings", json={"theme_locked": False})
        assert r.status_code == 200
        assert requests.get(f"{BASE_URL}/site-settings").json()["theme_locked"] is False

    def test_invalid_theme_value_handling(self, admin):
        """Report-only: backend does not validate default_theme against allowed list"""
        r = admin.put(f"{BASE_URL}/admin/site-settings", json={"default_theme": "not-a-theme"})
        assert r.status_code == 200
        got = requests.get(f"{BASE_URL}/site-settings").json()["default_theme"]
        assert got in ("light", "dark", "system", "luxury", "retro", "arctic", "nature", "ember", "dracula", "midnight"), \
            f"invalid theme '{got}' accepted and served publicly"
