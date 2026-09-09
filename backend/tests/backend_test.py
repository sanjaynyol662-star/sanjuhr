"""Backend API tests for HR Digital Services (Haryana Enterprises) job portal.

Covers:
 - Vacancies public API + pagination + WhatsApp summary
 - Blogs public + admin CRUD
 - Resume/CV templates admin upload + public list
 - Admin manual vacancy CRUD (with SEO fields + WhatsApp summary)
 - Job SEO manager (list + shuffle + per-job update)
 - Auth (login, /me, unauth admin endpoints)
"""
import os
import io
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@hrdigitalservices.in")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Public: Vacancies ----------
def test_vacancies_pagination():
    r = requests.get(f"{API}/vacancies?page=1&per_page=20", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data["page"] == 1
    assert data["pages"] >= 2, f"Expected >=2 pages, got {data['pages']} total={data['total']}"
    assert len(data["items"]) == 20, f"page1 items={len(data['items'])}"
    assert data["total"] >= 20


def test_vacancies_page2_different():
    p1 = requests.get(f"{API}/vacancies?page=1&per_page=20", timeout=20).json()
    p2 = requests.get(f"{API}/vacancies?page=2&per_page=20", timeout=20).json()
    assert p2["page"] == 2
    assert len(p2["items"]) >= 1
    ids1 = {v["id"] for v in p1["items"]}
    ids2 = {v["id"] for v in p2["items"]}
    assert not (ids1 & ids2), "page 1 and page 2 share items"


def test_vacancy_detail_and_whatsapp_summary():
    listing = requests.get(f"{API}/vacancies?page=1&per_page=5", timeout=20).json()
    vid = listing["items"][0]["id"]
    r = requests.get(f"{API}/vacancies/{vid}", timeout=30)
    assert r.status_code == 200
    v = r.json()
    ws = v.get("whatsapp_summary") or ""
    assert "🔥" in ws
    assert "कुल पद" in ws
    assert "योग्यता" in ws
    assert "आखरी तारीख" in ws
    assert "लिंक" in ws


# ---------- Public: Blogs ----------
def test_blogs_list():
    r = requests.get(f"{API}/blogs", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Public: Resume templates ----------
def test_resume_templates_list_public():
    r = requests.get(f"{API}/resume-templates", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Auth ----------
def test_login_invalid():
    r = requests.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
    assert r.status_code == 401


def test_auth_me(auth_headers):
    r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=10)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_admin_endpoints_require_auth():
    for path in ["/admin/vacancies", "/admin/vacancies-seo", "/admin/blogs"]:
        r = requests.get(f"{API}{path}", timeout=10)
        assert r.status_code in (401, 403), f"{path} unauth got {r.status_code}"


# ---------- Admin: Manual Vacancy CRUD (with SEO + WhatsApp) ----------
def test_manual_vacancy_full_crud(auth_headers):
    payload = {
        "title": "TEST_Manual Vacancy 2026",
        "organization": "TEST Org",
        "post_name": "TEST_Manual Vacancy 2026",
        "qualification": "Graduation",
        "category": "other",
        "last_date_text": "31 Dec 2026",
        "apply_url": "https://example.com/apply",
        "description": "TEST description body",
        "total_posts": "42",
        "seo_title": "TEST SEO title 2026",
        "focus_keyword": "test job",
        "seo_description": "TEST SEO meta description for the manual vacancy 2026 government job.",
    }
    r = requests.post(f"{API}/admin/vacancies", json=payload, headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    v = r.json()
    assert v["title"] == payload["title"]
    assert v.get("seo_title") == payload["seo_title"]
    assert v.get("focus_keyword") == payload["focus_keyword"]
    ws = v.get("whatsapp_summary") or ""
    assert "🔥" in ws and "42" in ws
    vid = v["id"]

    # Public detail
    r2 = requests.get(f"{API}/vacancies/{vid}", timeout=15)
    assert r2.status_code == 200
    assert r2.json()["title"] == payload["title"]

    # Update
    payload2 = dict(payload, title="TEST_Manual Vacancy Updated", total_posts="99")
    r3 = requests.put(f"{API}/admin/vacancies/{vid}", json=payload2, headers=auth_headers, timeout=15)
    assert r3.status_code == 200
    assert r3.json()["title"] == "TEST_Manual Vacancy Updated"
    assert "99" in (r3.json().get("whatsapp_summary") or "")

    # Delete
    r4 = requests.delete(f"{API}/admin/vacancies/{vid}", headers=auth_headers, timeout=15)
    assert r4.status_code == 200
    r5 = requests.get(f"{API}/vacancies/{vid}", timeout=10)
    assert r5.status_code == 404


# ---------- Admin: Manual Vacancies List ----------
def test_admin_manual_vacancies_list(auth_headers):
    r = requests.get(f"{API}/admin/vacancies", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Admin: Job SEO Manager ----------
def test_admin_vacancies_seo_list(auth_headers):
    r = requests.get(f"{API}/admin/vacancies-seo?page=1&per_page=20",
                     headers=auth_headers, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and "total" in data and "pages" in data
    assert len(data["items"]) <= 20


def test_admin_vacancies_seo_search(auth_headers):
    r = requests.get(f"{API}/admin/vacancies-seo?page=1&per_page=20&q=police",
                     headers=auth_headers, timeout=20)
    assert r.status_code == 200


def test_admin_shuffle_seo(auth_headers):
    r = requests.post(f"{API}/admin/vacancies/shuffle-seo",
                      headers=auth_headers, timeout=60)
    assert r.status_code == 200
    assert r.json().get("ok") is True
    assert r.json().get("shuffled", 0) >= 1


def test_admin_per_job_seo_update(auth_headers):
    # Pick a scraped vacancy (not manual)
    lst = requests.get(f"{API}/admin/vacancies-seo?page=1&per_page=20",
                       headers=auth_headers, timeout=20).json()
    target = next((v for v in lst["items"] if v.get("source") != "manual"), lst["items"][0])
    vid = target["id"]
    payload = {
        "seo_title": "TEST_SEO_Title_pytest",
        "focus_keyword": "pytest keyword",
        "seo_description": "TEST_SEO_Description saved by pytest for verification.",
    }
    r = requests.put(f"{API}/admin/vacancies/{vid}/seo",
                     json=payload, headers=auth_headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["seo_title"] == payload["seo_title"]
    assert body["focus_keyword"] == payload["focus_keyword"]


# ---------- Admin: Blogs (multipart) ----------
def test_admin_blog_crud(auth_headers):
    files = {
        "title": (None, "TEST_Blog Post pytest"),
        "excerpt": (None, "TEST excerpt"),
        "content": (None, "<p>TEST content body</p>"),
        "status": (None, "published"),
    }
    r = requests.post(f"{API}/admin/blogs", files=files, headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    b = r.json()
    bid = b["id"]
    slug = b["slug"]

    # Public
    r2 = requests.get(f"{API}/blogs/{slug}", timeout=10)
    assert r2.status_code == 200
    assert r2.json()["title"] == "TEST_Blog Post pytest"

    # Update
    upd = {
        "title": (None, "TEST_Blog Post pytest Updated"),
        "excerpt": (None, "TEST excerpt updated"),
        "content": (None, "<p>updated</p>"),
        "status": (None, "published"),
    }
    r3 = requests.put(f"{API}/admin/blogs/{bid}", files=upd, headers=auth_headers, timeout=15)
    assert r3.status_code == 200
    assert r3.json()["title"] == "TEST_Blog Post pytest Updated"

    # Delete
    r4 = requests.delete(f"{API}/admin/blogs/{bid}", headers=auth_headers, timeout=10)
    assert r4.status_code == 200


# ---------- Admin: Resume Template upload ----------
def test_admin_resume_template_upload(auth_headers):
    pdf_bytes = b"%PDF-1.4\n%test resume\n%%EOF"
    files = {
        "name": (None, "TEST_Resume_Template_pytest"),
        "file": ("test_resume.pdf", io.BytesIO(pdf_bytes), "application/pdf"),
    }
    r = requests.post(f"{API}/admin/resume-templates",
                      files=files, headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    tpl = r.json()
    tid = tpl["id"]
    url = tpl["url"]
    assert url.startswith("/api/uploads/")

    # Public list should include it
    lst = requests.get(f"{API}/resume-templates", timeout=15).json()
    assert any(t["id"] == tid for t in lst)

    # Fetch file
    r2 = requests.get(f"{BASE_URL}{url}", timeout=30)
    assert r2.status_code == 200, f"download failed {r2.status_code}"

    # Cleanup
    r3 = requests.delete(f"{API}/admin/resume-templates/{tid}",
                         headers=auth_headers, timeout=10)
    assert r3.status_code == 200
