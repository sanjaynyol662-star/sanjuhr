"""Tests for advanced search and category/state filters on /api/vacancies."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://a31b8a59-185f-4795-9b64-bbb24deef3be.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _get(api, path):
    r = api.get(f"{BASE_URL}{path}", timeout=30)
    assert r.status_code == 200, f"{path} => {r.status_code}: {r.text[:200]}"
    return r.json()


class TestSearch:
    def test_search_clerk(self, api):
        data = _get(api, "/api/vacancies?q=clerk&per_page=50")
        total = data.get("total", 0)
        items = data.get("items", [])
        assert total > 0, "expected clerk results"
        # every returned item should have 'clerk' somewhere in searchable fields
        for it in items[:20]:
            blob = " ".join(str(it.get(k, "")) for k in ("title","post_name","organization","qualification","row_text","category","state")).lower()
            assert "clerk" in blob, f"clerk not in item: {it.get('title')}"

    def test_search_12th(self, api):
        data = _get(api, "/api/vacancies?q=12th&per_page=20")
        assert data.get("total", 0) > 0

    def test_search_multi_word_army_delhi(self, api):
        data = _get(api, "/api/vacancies?q=army%20delhi&per_page=50")
        items = data.get("items", [])
        # AND semantics: each item must contain both tokens
        for it in items:
            blob = " ".join(str(it.get(k,"")) for k in ("title","post_name","organization","qualification","row_text","category","state")).lower()
            assert "army" in blob and "delhi" in blob, f"missing token in: {it.get('title')} | blob-sample={blob[:200]}"

    def test_search_nonsense(self, api):
        data = _get(api, "/api/vacancies?q=xyzz123")
        assert data.get("total", 0) == 0
        assert data.get("items", []) == []


class TestCategoryStateFilters:
    def test_other_excludes_haryana(self, api):
        data = _get(api, "/api/vacancies?category=other&per_page=50")
        items = data.get("items", [])
        assert len(items) > 0, "expected some 'other' items"
        leaks = [i for i in items if (i.get("state") or "").lower() == "haryana"]
        assert leaks == [], f"Haryana leaked in 'other': {[i.get('title') for i in leaks]}"

    def test_haryana_category(self, api):
        data = _get(api, "/api/vacancies?category=haryana&per_page=20")
        assert data.get("total", 0) > 0

    def test_state_delhi(self, api):
        data = _get(api, "/api/vacancies?state=delhi&per_page=50")
        items = data.get("items", [])
        # allow zero if none exist, but if present all must be delhi
        for it in items:
            st = (it.get("state") or "").lower()
            assert st == "delhi", f"non-delhi item in delhi filter: {it.get('title')} state={st}"
