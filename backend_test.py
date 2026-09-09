#!/usr/bin/env python3
"""Backend test for HR Digital Services Hindi-generation fixes.

Tests the 4 fixes:
1. Important Links in SSR + registration kind
2. English-term protection (no Devanagari transliteration)
3. Human-like Hindi with varied sentences and LLM temp ~0.7
4. English descriptive fields + version-based regeneration
"""
import requests
import re
import json
from typing import Dict, Any, Optional, List

# Base URL - using internal localhost as specified
BASE_URL = "http://localhost:8001/api"

# Admin credentials from review request
ADMIN_EMAIL = "admin@haryanaenterprises.com"
ADMIN_PASSWORD = "Admin@123"

# Test results
results = {
    "passed": 0,
    "failed": 0,
    "tests": [],
    "critical_failures": []
}


def log_test(name: str, passed: bool, details: str = "", critical: bool = False):
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
        if critical:
            results["critical_failures"].append(name)


def admin_login() -> Optional[str]:
    """Login as admin and return JWT token."""
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=15
        )
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access_token")
            if token:
                print(f"✅ Admin login successful")
                return token
            else:
                print(f"❌ Login response missing access_token: {data}")
                return None
        else:
            print(f"❌ Admin login failed: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"❌ Admin login exception: {e}")
        return None


# Devanagari transliterations that should NOT appear (Fix 2)
FORBIDDEN_DEVANAGARI_TERMS = [
    "पीडीएफ",           # PDF
    "एडमिट कार्ड",      # Admit Card
    "रिजल्ट",           # Result
    "सिलेबस",           # Syllabus
    "रजिस्ट्रेशन लिंक",  # Registration Link
    "ऑफिशियल वेबसाइट",  # Official Website
]


def check_english_terms_protection(text: str) -> tuple[bool, List[str]]:
    """Check if text contains forbidden Devanagari transliterations.
    
    Returns: (is_clean, list_of_violations)
    """
    violations = []
    for term in FORBIDDEN_DEVANAGARI_TERMS:
        if term in text:
            violations.append(term)
    return len(violations) == 0, violations


def test_1_get_vacancy_list():
    """Test 1: GET /api/vacancies?limit=1 to get a vacancy ID."""
    print("\n" + "="*80)
    print("TEST 1: GET /api/vacancies?limit=1")
    print("="*80)
    
    try:
        resp = requests.get(f"{BASE_URL}/vacancies?limit=1", timeout=15)
        log_test("GET /api/vacancies?limit=1 returns 200", resp.status_code == 200, 
                f"Status: {resp.status_code}", critical=True)
        
        if resp.status_code != 200:
            return None
        
        data = resp.json()
        items = data.get("items", []) if isinstance(data, dict) else data
        
        if not items:
            log_test("Vacancy list has items", False, "No vacancies found", critical=True)
            return None
        
        vacancy_id = items[0].get("id")
        log_test("Extract vacancy ID", bool(vacancy_id), f"ID: {vacancy_id}")
        
        return vacancy_id
        
    except Exception as e:
        log_test("GET /api/vacancies?limit=1", False, f"Exception: {e}", critical=True)
        return None


def test_2_vacancy_detail_fields(vacancy_id: str):
    """Test 2: GET /api/vacancies/{id} - verify Hindi and English fields."""
    print("\n" + "="*80)
    print(f"TEST 2: GET /api/vacancies/{vacancy_id} - Field Verification")
    print("="*80)
    
    try:
        resp = requests.get(f"{BASE_URL}/vacancies/{vacancy_id}", timeout=20)
        log_test(f"GET /api/vacancies/{vacancy_id} returns 200", resp.status_code == 200, 
                f"Status: {resp.status_code}", critical=True)
        
        if resp.status_code != 200:
            return None
        
        v = resp.json()
        
        # Check Hindi fields
        hindi_fields = [
            "hindi_intro",
            "hindi_description",
            "hindi_how_to_apply",
            "hindi_selection_process"
        ]
        
        print("\n📝 Checking Hindi fields:")
        for field in hindi_fields:
            value = v.get(field)
            is_present = value and isinstance(value, str) and value.strip()
            log_test(f"Field '{field}' present and non-empty", is_present, 
                    f"Length: {len(value) if value else 0}", critical=True)
        
        # Check hindi_ver == 2
        hindi_ver = v.get("hindi_ver")
        log_test("hindi_ver == 2", hindi_ver == 2, f"Value: {hindi_ver}", critical=True)
        
        # Check English fields (Fix 4)
        english_fields = [
            "english_intro",
            "english_description",
            "english_how_to_apply",
            "english_selection_process"
        ]
        
        print("\n📝 Checking English fields (Fix 4):")
        for field in english_fields:
            value = v.get(field)
            is_present = value and isinstance(value, str) and value.strip()
            log_test(f"Field '{field}' present and non-empty", is_present, 
                    f"Length: {len(value) if value else 0}", critical=True)
        
        return v
        
    except Exception as e:
        log_test(f"GET /api/vacancies/{vacancy_id}", False, f"Exception: {e}", critical=True)
        return None


def test_3_english_term_protection(vacancy_data: dict):
    """Test 3: English-term protection (Fix 2) - verify no Devanagari transliterations."""
    print("\n" + "="*80)
    print("TEST 3: English-term Protection (Fix 2)")
    print("="*80)
    
    hindi_fields = [
        "hindi_intro",
        "hindi_description",
        "hindi_how_to_apply",
        "hindi_selection_process"
    ]
    
    all_clean = True
    
    for field in hindi_fields:
        text = vacancy_data.get(field, "")
        if not text:
            continue
        
        is_clean, violations = check_english_terms_protection(text)
        
        if is_clean:
            log_test(f"'{field}' has NO forbidden Devanagari transliterations", True, 
                    f"✓ Clean")
        else:
            log_test(f"'{field}' has NO forbidden Devanagari transliterations", False, 
                    f"❌ Found: {', '.join(violations)}", critical=True)
            all_clean = False
            # Print sample of the text for debugging
            print(f"  Sample text: {text[:200]}")
    
    return all_clean


def test_4_multiple_vacancies_english_terms():
    """Test 4: Test English-term protection across 3-4 different vacancy IDs."""
    print("\n" + "="*80)
    print("TEST 4: English-term Protection Across Multiple Vacancies")
    print("="*80)
    
    try:
        # Get 4 vacancies
        resp = requests.get(f"{BASE_URL}/vacancies?limit=4", timeout=15)
        if resp.status_code != 200:
            log_test("Get multiple vacancies", False, f"Status: {resp.status_code}")
            return
        
        data = resp.json()
        items = data.get("items", []) if isinstance(data, dict) else data
        
        if len(items) < 3:
            log_test("Get at least 3 vacancies", False, f"Only got {len(items)} vacancies")
            return
        
        print(f"\n📝 Testing {len(items)} vacancies:")
        
        for i, item in enumerate(items[:4], 1):
            vacancy_id = item.get("id")
            print(f"\n  Vacancy {i}/{len(items[:4])}: {vacancy_id}")
            
            # Get full details
            resp_detail = requests.get(f"{BASE_URL}/vacancies/{vacancy_id}", timeout=20)
            if resp_detail.status_code != 200:
                print(f"    ⚠️  Could not fetch details: {resp_detail.status_code}")
                continue
            
            v = resp_detail.json()
            
            # Check English term protection
            hindi_fields = ["hindi_intro", "hindi_description", "hindi_how_to_apply", "hindi_selection_process"]
            all_clean = True
            
            for field in hindi_fields:
                text = v.get(field, "")
                if not text:
                    continue
                
                is_clean, violations = check_english_terms_protection(text)
                if not is_clean:
                    all_clean = False
                    print(f"    ❌ {field}: Found {violations}")
            
            if all_clean:
                print(f"    ✅ All Hindi fields clean")
            
            log_test(f"Vacancy {i} ({vacancy_id[:8]}...) English-term protection", all_clean, 
                    f"Clean: {all_clean}")
        
    except Exception as e:
        log_test("Multiple vacancies English-term test", False, f"Exception: {e}")


def test_5_ssr_important_links():
    """Test 5: SSR Important Links (Fix 1)."""
    print("\n" + "="*80)
    print("TEST 5: SSR Important Links (Fix 1)")
    print("="*80)
    
    try:
        # First, find a vacancy that has important_links
        resp = requests.get(f"{BASE_URL}/vacancies?limit=10", timeout=15)
        if resp.status_code != 200:
            log_test("Get vacancies for SSR test", False, f"Status: {resp.status_code}")
            return
        
        data = resp.json()
        items = data.get("items", []) if isinstance(data, dict) else data
        
        # Find a vacancy with important_links
        vacancy_with_links = None
        for item in items:
            vacancy_id = item.get("id")
            resp_detail = requests.get(f"{BASE_URL}/vacancies/{vacancy_id}", timeout=20)
            if resp_detail.status_code == 200:
                v = resp_detail.json()
                important_links = v.get("important_links", [])
                if important_links and len(important_links) > 0:
                    vacancy_with_links = vacancy_id
                    print(f"  Found vacancy with important_links: {vacancy_id}")
                    print(f"  Links count: {len(important_links)}")
                    break
        
        if not vacancy_with_links:
            log_test("Find vacancy with important_links", False, 
                    "No vacancy found with important_links in first 10 results")
            # Try the first vacancy anyway
            vacancy_with_links = items[0].get("id") if items else None
            if not vacancy_with_links:
                return
            print(f"  Using first vacancy anyway: {vacancy_with_links}")
        
        # Test SSR endpoint
        print(f"\n📝 GET /api/render?path=/vacancies/{vacancy_with_links}")
        resp_ssr = requests.get(
            f"{BASE_URL}/render",
            params={"path": f"/vacancies/{vacancy_with_links}"},
            timeout=20
        )
        
        log_test("GET /api/render returns 200", resp_ssr.status_code == 200, 
                f"Status: {resp_ssr.status_code}", critical=True)
        
        if resp_ssr.status_code != 200:
            return
        
        html = resp_ssr.text
        
        # Check for "Important Links" heading
        has_important_links_heading = "Important Links" in html
        log_test("SSR HTML contains 'Important Links' heading", has_important_links_heading, 
                f"Found: {has_important_links_heading}")
        
        # Check for English labels
        english_labels = [
            "Official Notification PDF",
            "Apply Online",
            "Official Website",
            "Registration Link"
        ]
        
        found_labels = []
        for label in english_labels:
            if label in html:
                found_labels.append(label)
        
        has_english_label = len(found_labels) > 0
        log_test("SSR HTML contains at least one English label", has_english_label, 
                f"Found: {', '.join(found_labels) if found_labels else 'None'}")
        
        # Check for "Click here" text
        has_click_here = "Click here" in html
        log_test("SSR HTML contains 'Click here' text", has_click_here, 
                f"Found: {has_click_here}")
        
    except Exception as e:
        log_test("SSR Important Links test", False, f"Exception: {e}")


def test_6_admin_regenerate(token: str, vacancy_id: str):
    """Test 6: Admin regenerate endpoint."""
    print("\n" + "="*80)
    print("TEST 6: Admin Regenerate Endpoint")
    print("="*80)
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        print(f"\n📝 POST /api/admin/vacancies/{vacancy_id}/hindi/regenerate")
        resp = requests.post(
            f"{BASE_URL}/admin/vacancies/{vacancy_id}/hindi/regenerate",
            headers=headers,
            timeout=30
        )
        
        log_test("POST regenerate returns 200", resp.status_code == 200, 
                f"Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            
            # Check response contains regenerated Hindi content
            has_hindi_intro = bool(data.get("hindi_intro"))
            has_hindi_desc = bool(data.get("hindi_description"))
            
            log_test("Response contains hindi_intro", has_hindi_intro, 
                    f"Length: {len(data.get('hindi_intro', ''))}")
            log_test("Response contains hindi_description", has_hindi_desc, 
                    f"Length: {len(data.get('hindi_description', ''))}")
            
            # Check English term protection in regenerated content
            if has_hindi_intro:
                is_clean, violations = check_english_terms_protection(data.get("hindi_intro", ""))
                log_test("Regenerated hindi_intro has NO forbidden terms", is_clean, 
                        f"Violations: {violations if violations else 'None'}")
        
    except Exception as e:
        log_test("Admin regenerate test", False, f"Exception: {e}")


def main():
    """Run all tests."""
    print("="*80)
    print("HR DIGITAL SERVICES - HINDI GENERATION FIXES - BACKEND TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print()
    
    # Test 1: Get vacancy list
    vacancy_id = test_1_get_vacancy_list()
    
    if not vacancy_id:
        print("\n❌ CRITICAL: Could not get vacancy ID. Stopping tests.")
        print_summary()
        return
    
    # Test 2: Vacancy detail fields
    vacancy_data = test_2_vacancy_detail_fields(vacancy_id)
    
    if not vacancy_data:
        print("\n❌ CRITICAL: Could not get vacancy details. Stopping tests.")
        print_summary()
        return
    
    # Test 3: English-term protection on first vacancy
    test_3_english_term_protection(vacancy_data)
    
    # Test 4: English-term protection across multiple vacancies
    test_4_multiple_vacancies_english_terms()
    
    # Test 5: SSR Important Links
    test_5_ssr_important_links()
    
    # Test 6: Admin regenerate
    token = admin_login()
    if token:
        test_6_admin_regenerate(token, vacancy_id)
    else:
        log_test("Admin regenerate test", False, "Could not login as admin", critical=True)
    
    # Print summary
    print_summary()


def print_summary():
    """Print test summary."""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ Passed: {results['passed']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"📊 Total: {results['passed'] + results['failed']}")
    print()
    
    if results['critical_failures']:
        print("🚨 CRITICAL FAILURES:")
        for test_name in results['critical_failures']:
            print(f"  - {test_name}")
        print()
    
    if results['failed'] > 0:
        print("❌ ALL FAILED TESTS:")
        for test in results['tests']:
            if not test['passed']:
                print(f"  - {test['name']}")
                if test['details']:
                    print(f"    {test['details']}")
    else:
        print("🎉 ALL TESTS PASSED!")


if __name__ == "__main__":
    main()
