"""Tests for /api/vacancy-alerts/subscribe + Resend email delivery (bugfix verification)."""
import os
import re
import subprocess
import time

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")

TEST_EMAIL = "delivered@resend.dev"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _tail_backend_log(lines=200):
    out = ""
    for f in ("/var/log/supervisor/backend.err.log", "/var/log/supervisor/backend.out.log"):
        try:
            out += subprocess.run(["tail", "-n", str(lines), f], capture_output=True, text=True).stdout
        except Exception:
            pass
    return out


class TestVacancyAlertSubscribe:
    def test_subscribe_success_and_resend_delivery(self, client):
        payload = {"email": TEST_EMAIL, "categories": ["ssc"], "qualifications": [], "keyword": ""}
        r = client.post(f"{BASE_URL}/api/vacancy-alerts/subscribe", json=payload)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        assert data.get("ok") is True
        assert isinstance(data.get("unsubscribe_token"), str) and len(data["unsubscribe_token"]) > 0
        assert "_id" not in data

        # persistence check via status endpoint
        st = client.get(f"{BASE_URL}/api/vacancy-alerts/status", params={"email": TEST_EMAIL})
        assert st.status_code == 200, st.text[:300]
        sdata = st.json()
        assert sdata.get("subscribed") is True
        assert "_id" not in str(sdata)

        # email delivery log check (Resend mode, not DEV MODE)
        found = False
        dev_mode = False
        for _ in range(10):
            log = _tail_backend_log(400)
            if f"Email sent via Resend to {TEST_EMAIL}" in log:
                found = True
                break
            if re.search(r"EMAIL — DEV MODE, would send to\] " + re.escape(TEST_EMAIL), log):
                dev_mode = True
                break
            if "Resend send failed" in log:
                pytest.fail("Resend send failed in backend log:\n" + "\n".join(
                    [l for l in log.splitlines() if "Resend send failed" in l][-3:]))
            time.sleep(1)
        assert not dev_mode, "Email was logged in DEV MODE instead of sent via Resend"
        assert found, "No 'Email sent via Resend to delivered@resend.dev' line in backend logs"

    def test_subscribe_invalid_email_422(self, client):
        r = client.post(f"{BASE_URL}/api/vacancy-alerts/subscribe",
                        json={"email": "not-an-email", "categories": ["ssc"], "qualifications": [], "keyword": ""})
        assert r.status_code == 422, f"{r.status_code}: {r.text[:300]}"
        assert "detail" in r.json()

    def test_subscribe_no_filters_400(self, client):
        r = client.post(f"{BASE_URL}/api/vacancy-alerts/subscribe",
                        json={"email": TEST_EMAIL, "categories": [], "qualifications": [], "keyword": ""})
        assert r.status_code == 400, f"{r.status_code}: {r.text[:300]}"
