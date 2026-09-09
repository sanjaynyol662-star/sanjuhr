#!/usr/bin/env python3
"""Backend test for Hindi content generation feature (Hybrid templates + Gemini Flash LLM)."""
import requests
import re
import json
from typing import Dict, Any, Optional

# Base URL from frontend/.env
BASE_URL = "https://employee-hub-596.preview.emergentagent.com/api"

# Admin credentials (try first, fallback to second)
ADMIN_CREDS = [
    {"email": "admin@hrdigitalservices.in", "password": "Admin@12345"},
    {"email": "admin@haryanaenterprises.com", "password": "Admin@12345"},
]

# Test results
results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}


def log_test(name: str, passed: bool, details: str = ""):
    """Log a test result."""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  {details}")
    results["tests"].append({"name": name, "passed": passed, "details": details})
    if passed:
        results["passed"] += 1
    else:
        results["failed"] += 1


def admin_login() -> Optional[requests.Session]:
    """Login as admin and return session with cookies."""
    for creds in ADMIN_CREDS:
        session = requests.Session()
        try:
            resp = session.post(f"{BASE_URL}/auth/login", json=creds, timeout=15)
            if resp.status_code == 200:
                print(f"✅ Admin login successful with {creds['email']}")
                return session
        except Exception as e:
            print(f"⚠️  Login attempt with {creds['email']} failed: {e}")
    print("❌ All admin login attempts failed")
    return None


def has_devanagari(text: str) -> bool:
    """Check if text contains Devanagari (Hindi) characters."""
    if not text:
        return False
    # Unicode range for Devanagari: U+0900 to U+097F
    return bool(re.search(r'[\u0900-\u097F]', text))


def test_lazy_generation_and_cache(session: requests.Session):
    """Test 1: LAZY GENERATION + CACHE (core)."""
    print("\n" + "="*80)
    print("TEST 1: LAZY GENERATION + CACHE")
    print("="*80)
    
    # Get vacancy list
    resp = session.get(f"{BASE_URL}/vacancies?limit=5", timeout=15)
    log_test("GET /api/vacancies?limit=5", resp.status_code == 200, f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        log_test("Lazy generation test", False, "Cannot get vacancy list")
        return None
    
    data = resp.json()
    items = data.get("items", []) if isinstance(data, dict) else data
    
    if not items:
        log_test("Lazy generation test", False, "No vacancies found")
        return None
    
    vacancy_id = items[0].get("id")
    log_test("Extract vacancy ID", bool(vacancy_id), f"ID: {vacancy_id}")
    
    # First GET - should trigger lazy generation
    print(f"\n📝 First GET /api/vacancies/{vacancy_id} (should trigger lazy generation)")
    resp1 = session.get(f"{BASE_URL}/vacancies/{vacancy_id}", timeout=20)
    log_test("First GET /api/vacancies/{id}", resp1.status_code == 200, f"Status: {resp1.status_code}")
    
    if resp1.status_code != 200:
        log_test("Lazy generation test", False, f"First GET failed: {resp1.status_code}")
        return None
    
    v1 = resp1.json()
    
    # Check all required Hindi fields are present and non-empty
    required_fields = ["hindi_intro", "hindi_description", "hindi_how_to_apply", 
                      "hindi_selection_process", "hindi_source", "hindi_generated_at"]
    
    for field in required_fields:
        value = v1.get(field)
        is_present = value is not None and (isinstance(value, str) and value.strip() or not isinstance(value, str))
        log_test(f"Field '{field}' present and non-empty", is_present, 
                f"Value: {str(value)[:100] if value else 'None'}")
    
    # Check hindi_source is either 'llm' or 'template'
    hindi_source = v1.get("hindi_source")
    valid_source = hindi_source in ("llm", "template")
    log_test("hindi_source is 'llm' or 'template'", valid_source, f"Value: {hindi_source}")
    
    # Check Hindi fields contain Devanagari characters
    hindi_fields = ["hindi_intro", "hindi_description", "hindi_how_to_apply", "hindi_selection_process"]
    for field in hindi_fields:
        text = v1.get(field, "")
        has_hindi = has_devanagari(text)
        log_test(f"'{field}' contains Devanagari characters", has_hindi, 
                f"Sample: {text[:80] if text else 'Empty'}")
    
    # Check for junk in intro (like 'PER/0106/...')
    intro = v1.get("hindi_intro", "")
    has_junk = bool(re.search(r'PER/\d+/', intro))
    log_test("hindi_intro does NOT contain junk like 'PER/0106/...'", not has_junk, 
            f"Intro: {intro[:100]}")
    
    # Second GET - should return cached content (same hindi_generated_at and hindi_intro)
    print(f"\n📝 Second GET /api/vacancies/{vacancy_id} (should return cached content)")
    resp2 = session.get(f"{BASE_URL}/vacancies/{vacancy_id}", timeout=15)
    log_test("Second GET /api/vacancies/{id}", resp2.status_code == 200, f"Status: {resp2.status_code}")
    
    if resp2.status_code != 200:
        log_test("Cache test", False, f"Second GET failed: {resp2.status_code}")
        return vacancy_id
    
    v2 = resp2.json()
    
    # Compare hindi_generated_at
    gen_at_1 = v1.get("hindi_generated_at")
    gen_at_2 = v2.get("hindi_generated_at")
    cache_time_match = gen_at_1 == gen_at_2
    log_test("hindi_generated_at is identical (cached)", cache_time_match, 
            f"First: {gen_at_1}, Second: {gen_at_2}")
    
    # Compare hindi_intro
    intro_1 = v1.get("hindi_intro")
    intro_2 = v2.get("hindi_intro")
    cache_intro_match = intro_1 == intro_2
    log_test("hindi_intro is identical (cached)", cache_intro_match, 
            f"Match: {intro_1 == intro_2}")
    
    return vacancy_id


def test_structured_facts_stay_english(session: requests.Session, vacancy_id: str):
    """Test 2: STRUCTURED FACTS STAY ENGLISH."""
    print("\n" + "="*80)
    print("TEST 2: STRUCTURED FACTS STAY ENGLISH")
    print("="*80)
    
    resp = session.get(f"{BASE_URL}/vacancies/{vacancy_id}", timeout=15)
    log_test("GET /api/vacancies/{id}", resp.status_code == 200, f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        return
    
    v = resp.json()
    
    # Check that structured fields remain in English (not translated to Hindi)
    english_fields = ["title", "organization", "qualification", "last_date_text"]
    
    for field in english_fields:
        value = v.get(field, "")
        if not value:
            log_test(f"'{field}' check (empty field)", True, "Field is empty, skipping")
            continue
        
        # Check if field is NOT primarily Devanagari (should be English)
        # Allow some Hindi but majority should be English/Latin script
        devanagari_chars = len(re.findall(r'[\u0900-\u097F]', value))
        total_chars = len(re.sub(r'\s', '', value))
        
        if total_chars == 0:
            log_test(f"'{field}' stays English", True, "Field is whitespace only")
            continue
        
        devanagari_ratio = devanagari_chars / total_chars if total_chars > 0 else 0
        is_english = devanagari_ratio < 0.5  # Less than 50% Devanagari = English
        
        log_test(f"'{field}' stays English (not translated)", is_english, 
                f"Value: {value[:80]}, Devanagari ratio: {devanagari_ratio:.2%}")


def test_admin_regenerate(session: requests.Session, vacancy_id: str):
    """Test 3: ADMIN REGENERATE."""
    print("\n" + "="*80)
    print("TEST 3: ADMIN REGENERATE")
    print("="*80)
    
    # Test regenerate with valid ID
    print(f"\n📝 POST /api/admin/vacancies/{vacancy_id}/hindi/regenerate")
    resp = session.post(f"{BASE_URL}/admin/vacancies/{vacancy_id}/hindi/regenerate", timeout=30)
    log_test("POST regenerate with valid ID", resp.status_code == 200, f"Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        
        # Check response contains Hindi fields
        has_hindi_intro = bool(data.get("hindi_intro"))
        has_hindi_desc = bool(data.get("hindi_description"))
        has_hindi_apply = bool(data.get("hindi_how_to_apply"))
        has_hindi_selection = bool(data.get("hindi_selection_process"))
        has_source = data.get("hindi_source") in ("llm", "template")
        
        log_test("Response contains hindi_intro", has_hindi_intro, f"Length: {len(data.get('hindi_intro', ''))}")
        log_test("Response contains hindi_description", has_hindi_desc, f"Length: {len(data.get('hindi_description', ''))}")
        log_test("Response contains hindi_how_to_apply", has_hindi_apply, f"Length: {len(data.get('hindi_how_to_apply', ''))}")
        log_test("Response contains hindi_selection_process", has_hindi_selection, f"Length: {len(data.get('hindi_selection_process', ''))}")
        log_test("Response contains valid hindi_source", has_source, f"Value: {data.get('hindi_source')}")
    
    # Test regenerate with invalid ID (malformed)
    print(f"\n📝 POST /api/admin/vacancies/xxxxxxxx/hindi/regenerate (invalid ID)")
    resp_invalid = session.post(f"{BASE_URL}/admin/vacancies/xxxxxxxx/hindi/regenerate", timeout=15)
    is_error = resp_invalid.status_code in (400, 404)
    log_test("POST regenerate with invalid ID returns 400/404", is_error, 
            f"Status: {resp_invalid.status_code} (expected 400 or 404)")
    
    # Test regenerate with well-formed but non-existent 24-hex ID
    fake_id = "a" * 24
    print(f"\n📝 POST /api/admin/vacancies/{fake_id}/hindi/regenerate (non-existent ID)")
    resp_notfound = session.post(f"{BASE_URL}/admin/vacancies/{fake_id}/hindi/regenerate", timeout=15)
    is_404 = resp_notfound.status_code == 404
    log_test("POST regenerate with non-existent ID returns 404", is_404, 
            f"Status: {resp_notfound.status_code} (expected 404)")


def test_admin_edit_override_persists(session: requests.Session, vacancy_id: str):
    """Test 4: ADMIN EDIT/OVERRIDE PERSISTS (does not get wiped)."""
    print("\n" + "="*80)
    print("TEST 4: ADMIN EDIT/OVERRIDE PERSISTS")
    print("="*80)
    
    # Get current vacancy details
    resp = session.get(f"{BASE_URL}/vacancies/{vacancy_id}", timeout=15)
    if resp.status_code != 200:
        log_test("Get vacancy for edit test", False, f"Cannot get vacancy: {resp.status_code}")
        return
    
    v = resp.json()
    original_title = v.get("title", "Test Vacancy")
    
    # Step 1: PUT with custom hindi_intro
    custom_intro = "मेरा कस्टम हिंदी परिचय टेस्ट"
    print(f"\n📝 PUT /api/admin/vacancies/{vacancy_id} with custom hindi_intro")
    
    payload = {
        "title": original_title,  # Reuse existing title
        "hindi_intro": custom_intro,
        "organization": v.get("organization", "Test Org"),
        "category": v.get("category", "other"),
    }
    
    resp_put = session.put(f"{BASE_URL}/admin/vacancies/{vacancy_id}", json=payload, timeout=15)
    log_test("PUT with custom hindi_intro", resp_put.status_code == 200, f"Status: {resp_put.status_code}")
    
    # Step 2: GET and verify custom intro is saved
    print(f"\n📝 GET /api/vacancies/{vacancy_id} (verify custom intro)")
    resp_get1 = session.get(f"{BASE_URL}/vacancies/{vacancy_id}", timeout=15)
    log_test("GET after PUT", resp_get1.status_code == 200, f"Status: {resp_get1.status_code}")
    
    if resp_get1.status_code == 200:
        v1 = resp_get1.json()
        intro_matches = v1.get("hindi_intro") == custom_intro
        is_edited = v1.get("hindi_edited") == True
        
        log_test("hindi_intro equals custom value", intro_matches, 
                f"Expected: '{custom_intro}', Got: '{v1.get('hindi_intro', '')[:100]}'")
        log_test("hindi_edited is True", is_edited, f"Value: {v1.get('hindi_edited')}")
    
    # Step 3: GET again to verify it's still there (lazy generation must NOT overwrite)
    print(f"\n📝 GET /api/vacancies/{vacancy_id} AGAIN (verify persistence)")
    resp_get2 = session.get(f"{BASE_URL}/vacancies/{vacancy_id}", timeout=15)
    log_test("GET again", resp_get2.status_code == 200, f"Status: {resp_get2.status_code}")
    
    if resp_get2.status_code == 200:
        v2 = resp_get2.json()
        intro_still_matches = v2.get("hindi_intro") == custom_intro
        log_test("Custom hindi_intro STILL persists (not overwritten)", intro_still_matches, 
                f"Value: '{v2.get('hindi_intro', '')[:100]}'")
    
    # Step 4: PUT again WITHOUT hindi fields (just title) - should preserve Hindi
    print(f"\n📝 PUT /api/admin/vacancies/{vacancy_id} WITHOUT hindi fields")
    payload_no_hindi = {
        "title": original_title,
        "organization": v.get("organization", "Test Org"),
        "category": v.get("category", "other"),
    }
    
    resp_put2 = session.put(f"{BASE_URL}/admin/vacancies/{vacancy_id}", json=payload_no_hindi, timeout=15)
    log_test("PUT without hindi fields", resp_put2.status_code == 200, f"Status: {resp_put2.status_code}")
    
    # Step 5: GET and verify custom intro is STILL preserved
    print(f"\n📝 GET /api/vacancies/{vacancy_id} (verify Hindi preserved after normal edit)")
    resp_get3 = session.get(f"{BASE_URL}/vacancies/{vacancy_id}", timeout=15)
    log_test("GET after PUT without hindi", resp_get3.status_code == 200, f"Status: {resp_get3.status_code}")
    
    if resp_get3.status_code == 200:
        v3 = resp_get3.json()
        intro_preserved = v3.get("hindi_intro") == custom_intro
        log_test("Custom hindi_intro PRESERVED after normal edit", intro_preserved, 
                f"Value: '{v3.get('hindi_intro', '')[:100]}'")


def test_ssr_match(session: requests.Session, vacancy_id: str):
    """Test 5: SSR MATCH."""
    print("\n" + "="*80)
    print("TEST 5: SSR MATCH")
    print("="*80)
    
    # Get the vacancy detail first to know what Hindi content to expect
    resp_detail = session.get(f"{BASE_URL}/vacancies/{vacancy_id}", timeout=15)
    if resp_detail.status_code != 200:
        log_test("Get vacancy for SSR test", False, f"Cannot get vacancy: {resp_detail.status_code}")
        return
    
    v = resp_detail.json()
    expected_hindi_desc = v.get("hindi_description", "")
    
    # GET SSR with Facebook bot user-agent
    print(f"\n📝 GET /api/render?path=/vacancies/{vacancy_id} with Facebook bot UA")
    headers = {"User-Agent": "facebookexternalhit/1.1"}
    resp_ssr = session.get(f"{BASE_URL}/render?path=/vacancies/{vacancy_id}", headers=headers, timeout=20)
    
    log_test("GET /api/render with bot UA", resp_ssr.status_code == 200, f"Status: {resp_ssr.status_code}")
    
    if resp_ssr.status_code != 200:
        log_test("SSR test", False, f"SSR endpoint failed: {resp_ssr.status_code}")
        return
    
    html = resp_ssr.text
    
    # Check content-type is text/html
    content_type = resp_ssr.headers.get("Content-Type", "")
    is_html = "text/html" in content_type
    log_test("Content-Type is text/html", is_html, f"Value: {content_type}")
    
    # Check for JobPosting JSON-LD schema
    has_job_posting = "JobPosting" in html and "application/ld+json" in html
    log_test("HTML contains JobPosting application/ld+json", has_job_posting, 
            f"Found: {has_job_posting}")
    
    # Extract JSON-LD and check description contains Devanagari
    if has_job_posting:
        # Find all JSON-LD blocks
        json_ld_pattern = r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>'
        json_ld_blocks = re.findall(json_ld_pattern, html, re.DOTALL | re.IGNORECASE)
        
        job_posting_found = False
        for block in json_ld_blocks:
            try:
                data = json.loads(block)
                if data.get("@type") == "JobPosting":
                    job_posting_found = True
                    description = data.get("description", "")
                    has_hindi_in_schema = has_devanagari(description)
                    log_test("JobPosting description contains Devanagari Hindi", has_hindi_in_schema, 
                            f"Sample: {description[:100]}")
                    break
            except json.JSONDecodeError:
                continue
        
        if not job_posting_found:
            log_test("JobPosting JSON-LD found and parsed", False, "Could not find or parse JobPosting")
    
    # Check visible body contains Hindi section headings
    hindi_headings = ["विवरण", "आवेदन कैसे करें", "चयन प्रक्रिया"]
    for heading in hindi_headings:
        has_heading = heading in html
        log_test(f"HTML body contains Hindi heading '{heading}'", has_heading, 
                f"Found: {has_heading}")
    
    # Check that visible Hindi content matches the API response
    if expected_hindi_desc:
        # Extract a sample from expected Hindi description (first 50 chars)
        sample = expected_hindi_desc[:50].strip()
        if sample:
            # Check if this sample appears in the HTML (allowing for HTML encoding)
            sample_in_html = sample in html
            log_test("SSR HTML contains sample from hindi_description", sample_in_html, 
                    f"Sample: {sample}")


def main():
    """Run all tests."""
    print("="*80)
    print("HINDI CONTENT GENERATION BACKEND TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print()
    
    # Login as admin
    session = admin_login()
    if not session:
        print("\n❌ CRITICAL: Admin login failed. Cannot proceed with tests.")
        return
    
    # Test 1: Lazy generation and cache
    vacancy_id = test_lazy_generation_and_cache(session)
    
    if not vacancy_id:
        print("\n❌ CRITICAL: Could not get vacancy ID. Stopping tests.")
        return
    
    # Test 2: Structured facts stay English
    test_structured_facts_stay_english(session, vacancy_id)
    
    # Test 3: Admin regenerate
    test_admin_regenerate(session, vacancy_id)
    
    # Test 4: Admin edit/override persists
    test_admin_edit_override_persists(session, vacancy_id)
    
    # Test 5: SSR match
    test_ssr_match(session, vacancy_id)
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ Passed: {results['passed']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"📊 Total: {results['passed'] + results['failed']}")
    print()
    
    if results['failed'] > 0:
        print("❌ FAILED TESTS:")
        for test in results['tests']:
            if not test['passed']:
                print(f"  - {test['name']}")
                if test['details']:
                    print(f"    {test['details']}")
    else:
        print("🎉 ALL TESTS PASSED!")


if __name__ == "__main__":
    main()
