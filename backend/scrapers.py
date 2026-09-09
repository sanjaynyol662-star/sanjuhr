"""FreeJobAlert.com scraper — fetches latest vacancy notifications.

Table structure on freejobalert.com "latest-notifications" & "upcoming-sarkari-naukri":
  td0: Post Date
  td1: Organization (e.g., PNB, UPSC, SSC)
  td2: Post Name / vacancy count (e.g., "Local Bank Officer – 545 Posts")
  td3: Qualification
  td4: Advt No
  td5: Last Date
  td6: "Get Details" anchor -> article URL

We combine td1 + td2 into a meaningful title and use td6's href as the URL.
"""
import logging
import re
from datetime import datetime, timezone
from typing import List, Dict
import httpx
from bs4 import BeautifulSoup

log = logging.getLogger("scraper")

# ─────────── Brand replacement ───────────
# Any user-facing text scraped from the source may mention "FreeJobAlert"
# (and its spelling variants). We swap every such mention for our own brand so
# no third-party branding ever leaks onto the site.
SITE_BRAND = "HR Digital Services"
_BRAND_RE = re.compile(r"free\s*job\s*alert(?:\s*\.\s*com)?", re.I)


def apply_brand(text):
    """Replace 'FreeJobAlert' / 'Free Job Alert' / 'freejobalert.com' mentions in
    plain text with our own brand name. Safe on None."""
    if not text:
        return text
    return _BRAND_RE.sub(SITE_BRAND, text)


def brand_html(html: str) -> str:
    """Replace brand mentions inside the *text nodes* of an HTML string without
    corrupting element attributes / URLs (e.g. an allowed .pdf href)."""
    if not html:
        return html
    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception:
        return apply_brand(html)
    from bs4 import NavigableString
    for node in soup.find_all(string=True):
        if _BRAND_RE.search(node):
            node.replace_with(NavigableString(_BRAND_RE.sub(SITE_BRAND, str(node))))
    return str(soup)


SOURCES = [
    ("latest", "https://www.freejobalert.com/latest-notifications/"),
    ("sarkari", "https://www.freejobalert.com/sarkari-naukri/"),
    ("offline", "https://www.freejobalert.com/new-updates/"),
    ("admit_card", "https://www.freejobalert.com/admit-card/"),
    ("result", "https://www.freejobalert.com/exam-results/"),
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

# Text that is NOT a valid job title (buttons/labels)
JUNK_TITLES = {"get details", "click here", "apply online", "apply", "details",
               "notification", "read more", "view more", "more", "view details"}


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _cat_from_title(title: str) -> str:
    t = title.lower()
    # Admit card / result take priority since they can mention other categories too
    if any(k in t for k in ["admit card", "hall ticket", "call letter", "e-admit", "interview letter"]): return "admit_card"
    if any(k in t for k in ["result", "cut off", "cut-off", "merit list", "final selection", "score card", "answer key"]): return "result"
    if any(k in t for k in ["ssc", "cgl", "chsl", "mts"]): return "ssc"
    if any(k in t for k in ["railway", "rrb", "ntpc"]): return "railway"
    if any(k in t for k in ["bank", "ibps", "sbi", "pnb", "iob", "nabfins", "rbi"]): return "bank"
    if any(k in t for k in ["police", "constable"]): return "police"
    if any(k in t for k in ["upsc", "ias", "ips"]): return "upsc"
    if any(k in t for k in ["army", "navy", "air force", "airforce", "defence", "bsf", "crpf", "cisf"]): return "defence"
    if any(k in t for k in ["teacher", "tet", "ctet", "htet", "professor", "kvs", "nvs"]): return "teaching"
    if any(k in t for k in ["haryana", "hssc", "hpsc", "hkrn", "dc rate", "dc-rate"]): return "haryana"
    if any(k in t for k in ["engineer", "psu", "ongc", "iocl", "hpcl", "gail", "bhel", "ntpc"]): return "psu"
    if any(k in t for k in ["nurse", "doctor", "medical", "aiims", "esic", "hospital"]): return "medical"
    return "other"


# ── State detection (Indian states/UTs) ─────────────────────────────────────
# Keyed to canonical state slugs (used by frontend dropdown).
# Includes state PSC / SSC / recruitment-board abbreviations so we can detect
# state-scoped jobs even when only the org name is available.
_STATE_KEYWORDS = {
    "haryana":          [r"\bharyana\b", r"\bhssc\b", r"\bhpsc\b", r"\bhkrn\b", r"\bhprb\b", r"\bhbse\b", r"\bpanchkula\b",
                         r"\bhisar\b", r"\bgurugram\b", r"\bgurgaon\b", r"\bambala\b", r"\bsirsa\b", r"\bfaridabad\b",
                         r"\bkarnal\b", r"\brohtak\b", r"\bpanipat\b", r"\bsonipat\b", r"\brewari\b", r"\bjind\b",
                         r"\bkaithal\b", r"\bkurukshetra\b", r"\byamunanagar\b", r"\bpalwal\b", r"\bjhajjar\b",
                         r"\bbhiwani\b", r"\bfatehabad\b", r"\bmahendragarh\b", r"\bnuh\b", r"\bcharkhi\s*dadri\b"],
    "delhi":            [r"\bdelhi\b", r"\bdsssb\b", r"\bdpsc\b"],
    "punjab":           [r"\bpunjab\b", r"\bpssb\b", r"\bpsssb\b", r"\bppsc\b", r"\bpstet\b"],
    "rajasthan":        [r"\brajasthan\b", r"\brpsc\b", r"\brsmssb\b", r"\brssb\b"],
    "uttar-pradesh":    [r"\buttar pradesh\b", r"\buppsc\b", r"\bupsssc\b", r"\bupssc\b"],
    "madhya-pradesh":   [r"\bmadhya pradesh\b", r"\bmppsc\b", r"\bmpesb\b", r"\bmppeb\b"],
    "himachal-pradesh": [r"\bhimachal\b", r"\bhppsc\b", r"\bhpssc\b", r"\bhpsssb\b"],
    "uttarakhand":      [r"\buttarakhand\b", r"\bukpsc\b", r"\bukssc\b", r"\bukpcs\b"],
    "bihar":            [r"\bbihar\b", r"\bbpsc\b", r"\bbssc\b"],
    "jharkhand":        [r"\bjharkhand\b", r"\bjpsc\b", r"\bjssc\b"],
    "gujarat":          [r"\bgujarat\b", r"\bgpsc\b", r"\bgsssb\b"],
    "maharashtra":      [r"\bmaharashtra\b", r"\bmpsc\b", r"\bmahatransco\b"],
    "karnataka":        [r"\bkarnataka\b", r"\bkpsc\b", r"\bkea\b"],
    "tamil-nadu":       [r"\btamil nadu\b", r"\btnpsc\b", r"\btnusrb\b"],
    "kerala":           [r"\bkerala\b"],
    "andhra-pradesh":   [r"\bandhra pradesh\b", r"\bappsc\b"],
    "telangana":        [r"\btelangana\b", r"\btspsc\b", r"\btsche\b"],
    "west-bengal":      [r"\bwest bengal\b", r"\bwbpsc\b", r"\bwbssc\b"],
    "odisha":           [r"\bodisha\b", r"\bopsc\b", r"\bossc\b"],
    "chhattisgarh":     [r"\bchhattisgarh\b", r"\bcgpsc\b", r"\bcgvyapam\b"],
    "assam":            [r"\bassam\b", r"\bapsc\b"],
    "chandigarh":       [r"\bchandigarh\b"],
    "jammu-kashmir":    [r"\bjammu\b", r"\bkashmir\b", r"\bjkssb\b", r"\bjkpsc\b"],
}
_STATE_COMPILED = {slug: re.compile("|".join(f"(?:{p})" for p in pats), re.I)
                   for slug, pats in _STATE_KEYWORDS.items()}


def state_from_text(*parts: str):
    """Return canonical state slug when detected in any of the provided texts."""
    blob = " ".join(p for p in parts if p)
    if not blob:
        return None
    for slug, rx in _STATE_COMPILED.items():
        if rx.search(blob):
            return slug
    return None



# ── Last-date parsing & expired detection ────────────────────────────────────
_MONTHS = {m.lower(): i for i, m in enumerate(
    ["", "January", "February", "March", "April", "May", "June",
     "July", "August", "September", "October", "November", "December"], 0)}
_MONTHS.update({m[:3].lower(): i for m, i in list(_MONTHS.items()) if m})


def parse_last_date(text: str | None) -> datetime | None:
    """Best-effort parse of a last-date string (dd/mm/yyyy, dd Month yyyy, dd-mm-yy)."""
    if not text:
        return None
    s = text.strip()
    # dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
    m = re.search(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})", s)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100:
            y += 2000
        try:
            return datetime(y, mo, d, tzinfo=timezone.utc)
        except ValueError:
            return None
    # "dd Month yyyy"
    m = re.search(r"(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})", s)
    if m:
        d = int(m.group(1)); mo = _MONTHS.get(m.group(2).lower())
        y = int(m.group(3))
        if y < 100: y += 2000
        if mo:
            try:
                return datetime(y, mo, d, tzinfo=timezone.utc)
            except ValueError:
                return None
    return None


def is_expired(last_date_text: str | None, now: datetime | None = None) -> bool:
    dt = parse_last_date(last_date_text)
    if not dt:
        return False
    now = now or datetime.now(timezone.utc)
    # Give one full extra day of grace (many portals accept until midnight IST)
    return dt.date() < now.date()


def _detect_application_mode(*texts: str) -> str | None:
    """Detect application_mode from any combination of title / row_text / URL slug.

    Signals in priority order:
      1. Explicit "offline form" / "online form" text
      2. URL slug hints ("apply-offline" / "apply-online")
      3. Words like "postal" / "hard copy" imply offline
    """
    hay = " ".join(t for t in texts if t).lower()
    if not hay:
        return None
    if re.search(r"offline\s*form|apply[-_ ]offline|by\s*post|postal\s*application|hard\s*copy", hay):
        return "offline"
    if re.search(r"online\s*form|apply[-_ ]online|online\s*application|online\s*registration", hay):
        return "online"
    return None


def _parse_row(cells) -> Dict | None:
    """Parse a single <tr> whose cells match freejobalert's 7-column layout."""
    if len(cells) < 6:
        return None

    texts = [_clean(c.get_text(" ", strip=True)) for c in cells]

    # Find the "Get Details" anchor (usually last cell). Fallback to any anchor in the row.
    href = None
    for c in reversed(cells):
        a = c.find("a", href=True)
        if a and a["href"].startswith("http"):
            href = a["href"]
            break
    if not href:
        return None

    # Heuristic mapping for the 7-column freejobalert table.
    # texts[0] = post date, [1] = org, [2] = post name, [3] = qualification, [5] = last date
    post_date = texts[0] if len(texts) > 0 else ""
    org = texts[1] if len(texts) > 1 else ""
    post_name = texts[2] if len(texts) > 2 else ""
    qualification = texts[3] if len(texts) > 3 else ""
    last_date_text = texts[5] if len(texts) > 5 else ""

    # Guard: sometimes a row has fewer cells (headers etc.)
    if not org and not post_name:
        return None

    if org.lower() in JUNK_TITLES:
        org = ""
    if post_name.lower() in JUNK_TITLES:
        post_name = ""

    # Build title
    if org and post_name:
        title = f"{org} — {post_name}"
    else:
        title = org or post_name

    if not title or title.lower() in JUNK_TITLES or len(title) < 3:
        return None

    row_text_val = " | ".join([t for t in texts if t])[:500]
    mode = _detect_application_mode(title, row_text_val, href)

    return {
        "title": title[:250],
        "url": href,
        "organization": org[:120],
        "post_name": post_name[:200],
        "qualification": qualification[:200],
        "post_date_text": post_date[:40],
        "last_date_text": last_date_text[:40] or None,
        "application_mode": mode,
        "category": _cat_from_title(title),
        "row_text": row_text_val,
    }


def _parse_update_row(cells) -> Dict | None:
    """Parse rows from `new-updates` page (3 columns: Date | Update Info | Get Details link)."""
    if len(cells) < 2:
        return None
    texts = [_clean(c.get_text(" ", strip=True)) for c in cells]

    href = None
    for c in reversed(cells):
        a = c.find("a", href=True)
        if a and a["href"].startswith("http"):
            href = a["href"]
            break
    if not href:
        return None

    post_date = texts[0]
    info = texts[1]

    # skip header row
    if info.lower() in ("update information", "update", "information"):
        return None
    if not info or len(info) < 4 or info.lower() in JUNK_TITLES:
        return None
    # skip rows where the info line IS the anchor text like "Get Details"
    if info.lower() in JUNK_TITLES:
        return None

    # Split "AIIMS Delhi Field Worker Online Form 2026" → org guess = first 1-2 words
    words = info.split()
    org = " ".join(words[:2]) if len(words) >= 2 else words[0] if words else ""
    post_name = info

    mode = _detect_application_mode(info, href)

    return {
        "title": info[:250],
        "url": href,
        "organization": org[:120],
        "post_name": post_name[:200],
        "qualification": "",
        "post_date_text": post_date[:40],
        "last_date_text": None,
        "application_mode": mode,
        "category": _cat_from_title(info),
        "row_text": " | ".join([t for t in texts if t])[:500],
    }


def _parse_grid_cell(cell, src_type: str) -> Dict | None:
    """Parse a single grid cell (each cell is an anchor with the full title).

    Used for admit-card / result pages where the layout is a grid of links.
    """
    a = cell.find("a", href=True)
    if not a:
        return None
    href = a["href"].strip()
    if not href.startswith("http"):
        return None
    title = _clean(a.get_text(" ", strip=True))
    if not title or title.lower() in JUNK_TITLES or len(title) < 5:
        return None
    # Try to infer organization from first 1-2 words
    words = title.split()
    org = " ".join(words[:2]) if len(words) >= 2 else words[0]
    return {
        "title": title[:250],
        "url": href,
        "organization": org[:120],
        "post_name": title[:200],
        "qualification": "",
        "post_date_text": "",
        "last_date_text": None,
        "application_mode": None,
        "category": src_type,  # admit_card or result
        "row_text": title[:500],
    }


async def fetch_freejobalert() -> List[Dict]:
    results: List[Dict] = []
    now = datetime.now(timezone.utc)
    async with httpx.AsyncClient(headers=HEADERS, timeout=25.0, follow_redirects=True) as http:
        for src_type, url in SOURCES:
            try:
                r = await http.get(url)
                if r.status_code != 200:
                    log.warning(f"FreeJobAlert {src_type}: HTTP {r.status_code}")
                    continue
                soup = BeautifulSoup(r.text, "html.parser")
                # Admit-card / result pages: iterate all article anchors directly
                # (many tables have irregular cell structure; grid parsing missed 90% of items)
                if src_type in ("admit_card", "result"):
                    seen_urls = set()
                    for a in soup.find_all("a", href=True):
                        href = a["href"].strip()
                        if "freejobalert.com/articles" not in href:
                            continue
                        if href in seen_urls:
                            continue
                        title = _clean(a.get_text(" ", strip=True))
                        if not title or title.lower() in JUNK_TITLES or len(title) < 8:
                            continue
                        seen_urls.add(href)
                        words = title.split()
                        org = " ".join(words[:2]) if len(words) >= 2 else words[0]
                        # Trust the title to decide whether this anchor is really an
                        # admit-card / result / other kind of listing. The exam-results
                        # page includes many cross-links, so blindly tagging by src_type
                        # would leak (e.g. admit-card links appearing as "result").
                        derived_cat = _cat_from_title(title)
                        cat = derived_cat if derived_cat in ("admit_card", "result") else src_type
                        # Skip items that clearly do not match the current page's purpose
                        if src_type == "result" and derived_cat != "result":
                            continue
                        if src_type == "admit_card" and derived_cat != "admit_card":
                            continue
                        parsed = {
                            "title": title[:250],
                            "url": href,
                            "organization": org[:120],
                            "post_name": title[:200],
                            "qualification": "",
                            "post_date_text": "",
                            "last_date_text": None,
                            "application_mode": _detect_application_mode(title, href),
                            "category": cat,
                            "row_text": title[:500],
                            "source": "freejobalert",
                            "source_type": src_type,
                            "fetched_at": now,
                        }
                        results.append(parsed)
                    continue  # skip regular tabular parser below

                for table in soup.find_all("table"):
                    for row in table.find_all("tr"):
                        cells = row.find_all("td")
                        parsed = None
                        if len(cells) >= 6:
                            parsed = _parse_row(cells)
                        elif src_type in ("offline", "admit_card", "result") and 2 <= len(cells) <= 4:
                            # new-updates / admit-card / result pages — 3-column layout
                            parsed = _parse_update_row(cells)
                        if not parsed:
                            continue
                        # Ensure application_mode is populated using all signals available
                        if not parsed.get("application_mode"):
                            parsed["application_mode"] = _detect_application_mode(
                                parsed.get("title", ""),
                                parsed.get("row_text", ""),
                                parsed.get("url", ""),
                            )
                        parsed.update({
                            "source": "freejobalert",
                            "source_type": src_type,
                            "fetched_at": now,
                        })
                        # If we scraped from a dedicated Admit Card / Result page,
                        # override category to that (title alone may not contain the word)
                        if src_type in ("admit_card", "result"):
                            parsed["category"] = src_type
                        results.append(parsed)
            except Exception as e:
                log.error(f"FreeJobAlert {src_type} error: {e}")

    # De-dupe by URL, but merge useful signal (application_mode, missing fields) across duplicates.
    # We scrape in order: latest → sarkari → offline. Offline pass adds application_mode="offline"
    # for the same article URLs; without merging, this info would be lost.
    by_url: Dict[str, Dict] = {}
    for v in results:
        u = v["url"]
        if u not in by_url:
            by_url[u] = v
            continue
        existing = by_url[u]
        # Prefer non-None application_mode
        if not existing.get("application_mode") and v.get("application_mode"):
            existing["application_mode"] = v["application_mode"]
        # Prefer admit_card/result category when merging (dedicated pages carry stronger signal)
        if v.get("category") in ("admit_card", "result") and existing.get("category") not in ("admit_card", "result"):
            existing["category"] = v["category"]
        # Backfill missing fields from later scrapes
        for k in ("qualification", "post_date_text", "last_date_text"):
            if not existing.get(k) and v.get(k):
                existing[k] = v[k]
    out = list(by_url.values())
    # Populate `state` field (canonical slug) for each vacancy
    for v in out:
        v["state"] = state_from_text(
            v.get("title", ""),
            v.get("organization", ""),
            v.get("post_name", ""),
            v.get("row_text", ""),
        )
    # Cap kept generous so late sources (result, admit-card) are never truncated.
    return out[:1500]


async def refresh_vacancies_into_db(db) -> int:
    """Refresh vacancies from FreeJobAlert only.

    Duplicate protection:
      1. Same URL            -> update existing doc (never a new post)
      2. Same normalized title (different URL) -> merge into the
         existing doc instead of creating a duplicate post (dedupe_key match)
    """
    fja = await fetch_freejobalert()
    vacs = fja
    if not vacs:
        return 0
    added = 0
    merged = 0
    for v in vacs:
        v["dedupe_key"] = _dedupe_key(v.get("title", ""))
        # Strip source branding from user-facing text before storing
        for f in ("title", "post_name", "organization", "row_text"):
            if v.get(f):
                v[f] = apply_brand(v[f])
        # Haryana-state jobs belong in the "haryana" category, not "other"
        if v.get("state") == "haryana" and v.get("category") == "other":
            v["category"] = "haryana"
        try:
            by_url = await db.vacancies.find_one({"url": v["url"]}, {"_id": 1, "source": 1})
            if by_url:
                # Never override a manually-edited / locked post. Once an admin
                # edits a post it becomes "manual" and is owned by the admin —
                # the auto-refresh must leave it untouched (only manual delete removes it).
                if by_url.get("source") == "manual":
                    continue
                await db.vacancies.update_one({"_id": by_url["_id"]}, {"$set": v})
                continue
            if v["dedupe_key"]:
                dupe = await db.vacancies.find_one(
                    {"dedupe_key": v["dedupe_key"], "source": {"$ne": "manual"}},
                    {"_id": 1},
                )
                if dupe:
                    await db.vacancies.update_one(
                        {"_id": dupe["_id"]},
                        {"$set": v, "$addToSet": {"alt_urls": v["url"]}},
                    )
                    merged += 1
                    continue
            v["created_at"] = datetime.now(timezone.utc)
            await db.vacancies.insert_one(v)
            added += 1
        except Exception as e:
            log.warning(f"upsert vacancy failed: {e}")
    log.info(f"Vacancies refresh: total={len(vacs)}, new={added}, cross-source-merged={merged}")
    return added


def _dedupe_key(title: str) -> str:
    """Normalized alphanumeric title used for cross-source duplicate detection."""
    return re.sub(r"[^a-z0-9]+", "", (title or "").lower())[:120]


# ─────────── Haryana DC Rate / HKRN Jobs (2nd source) ───────────
# The official HKRN portal (hkrnl.itiharyana.gov.in) blocks non-India traffic,
# so DC Rate / HKRN listings are mirrored from jobpulse.in category pages.
DCRATE_SOURCES = [
    ("dc_rate", "https://jobpulse.in/dc-rate-jobs/"),
    ("hkrn", "https://jobpulse.in/hkrn/"),
]


async def fetch_haryana_dcrate() -> List[Dict]:
    results: List[Dict] = []
    now = datetime.now(timezone.utc)
    async with httpx.AsyncClient(headers=HEADERS, timeout=25.0, follow_redirects=True) as http:
        for src_type, url in DCRATE_SOURCES:
            try:
                r = await http.get(url)
                if r.status_code != 200:
                    log.warning(f"DCRate {src_type}: HTTP {r.status_code}")
                    continue
                soup = BeautifulSoup(r.text, "html.parser")
                content = soup.select_one(".entry-content") or soup
                seen = set()
                for a in content.select("ul.lcp_catlist li a[href], article a[href]"):
                    href = (a.get("href") or "").strip()
                    title = _clean(a.get_text(" ", strip=True))
                    if not href.startswith("https://jobpulse.in/") or href in seen:
                        continue
                    if any(x in href for x in ("/category/", "/dc-rate-jobs", "/hkrn/", "#", "/tag/", "/page/")):
                        continue
                    if not title or title.lower() in JUNK_TITLES or len(title) < 12:
                        continue
                    seen.add(href)
                    words = title.split()
                    org = "HKRN / DC Rate" if re.search(r"\bhkrn\b|dc\s*rate", title, re.I) else " ".join(words[:2])
                    results.append({
                        "title": title[:250],
                        "url": href,
                        "organization": org[:120],
                        "post_name": title[:200],
                        "qualification": "",
                        "post_date_text": "",
                        "last_date_text": None,
                        "application_mode": _detect_application_mode(title, href),
                        "category": _cat_from_title(title),
                        "row_text": title[:500],
                        "source": "haryana_dcrate",
                        "source_type": src_type,
                        "fetched_at": now,
                    })
            except Exception as e:
                log.error(f"DCRate {src_type} error: {e}")
    by_url: Dict[str, Dict] = {}
    for v in results:
        by_url.setdefault(v["url"], v)
    out = list(by_url.values())
    for v in out:
        # DC Rate is a Haryana-specific scheme — default state to haryana
        v["state"] = state_from_text(v.get("title", ""), v.get("organization", ""), v.get("row_text", "")) or "haryana"
    log.info(f"DCRate scrape: {len(out)} items")
    return out


async def backfill_application_mode(db) -> dict:
    """Scan all vacancies missing application_mode and infer it from title/row_text/url.

    Returns a dict summary of counts touched.
    """
    query = {"$or": [{"application_mode": None}, {"application_mode": {"$exists": False}}]}
    total = await db.vacancies.count_documents(query)
    online = offline = still_unknown = 0
    async for d in db.vacancies.find(query, {"title": 1, "row_text": 1, "url": 1}):
        mode = _detect_application_mode(d.get("title", ""), d.get("row_text", ""), d.get("url", ""))
        if mode == "online":
            online += 1
        elif mode == "offline":
            offline += 1
        else:
            still_unknown += 1
            continue
        await db.vacancies.update_one({"_id": d["_id"]}, {"$set": {"application_mode": mode}})
    log.info(f"backfill: total_scanned={total} online+={online} offline+={offline} still_unknown={still_unknown}")
    return {"scanned": total, "tagged_online": online, "tagged_offline": offline, "unknown": still_unknown}


# ─────────── Article Detail Scraper ───────────
UNWANTED_TEXT_MARKERS = (
    "register for job alerts", "download mobile app", "join now", "join our telegram",
    "follow us on", "subscribe", "also read", "related jobs", "you may also like",
)


def _is_junk_link(text: str, href: str) -> bool:
    t = (text or "").strip().lower()
    h = (href or "").lower()
    if not h:
        return True
    if "freejobalert.com/register" in h or "user.freejobalert.com" in h:
        return True
    if "t.me/" in h or "telegram" in h:
        return True
    if "whatsapp" in h or "facebook.com" in h or "twitter.com" in h or "instagram" in h:
        return True
    # FreeJobAlert self-promo channels / apps / cross-site promos
    if "arattai" in h or "arattai" in t:
        return True
    if "sarkariresult" in h or "sarkari-result" in h:
        return True
    if "play.google.com" in h or "apps.apple.com" in h or "youtube.com" in h or "youtu.be" in h:
        return True
    if t in ("join now", "subscribe", "register", "follow us", "download app",
             "sarkari result", "download mobile app", "mobile app",
             "join arattai channel", "join telegram channel", "join whatsapp channel",
             "click here to join"):
        return True
    if ("join" in t and "channel" in t) or ("download" in t and "app" in t):
        return True
    return False


# Promotional junk rows that FreeJobAlert injects into article bodies. Any block
# whose text matches these is removed from the cleaned content_html.
PROMO_PATTERNS = re.compile(
    r"(join\s+(arattai|telegram|whatsapp)\s+channel"
    r"|arattai\s+channel|whatsapp\s+channel|telegram\s+channel"
    r"|download\s+mobile\s+app|download\s+(our\s+)?app|mobile\s+app"
    r"|sarkari\s*result\s*:|click\s+here\s+to\s+join|register\s+for\s+job\s+alerts)",
    re.I,
)


def _is_promo_text(txt: str) -> bool:
    t = (txt or "").strip()
    return bool(t) and len(t) < 220 and bool(PROMO_PATTERNS.search(t))


def _extract_important_links(article) -> list[dict]:
    """Pull out the key action links (Apply Online, Notification PDF, Official Website)."""
    picked = []
    seen = set()
    for a in article.find_all("a", href=True):
        text = _clean(a.get_text(" ", strip=True))
        href = a["href"]
        if _is_junk_link(text, href):
            continue
        # Prefer PDFs, apply links, official portals; skip internal freejobalert article links
        low_text = text.lower()
        low_href = href.lower()
        if "freejobalert.com/articles" in low_href:
            continue
        if "freejobalert.com" in low_href and not low_href.endswith(".pdf"):
            continue
        kind = None
        if low_href.endswith(".pdf") or "notification" in low_text or "advertisement" in low_text:
            kind = "notification"
        elif "apply" in low_text or "apply" in low_href or "registration" in low_text:
            kind = "apply"
        elif "official" in low_text or "website" in low_text:
            kind = "official"
        if not kind:
            continue
        key = (kind, href)
        if key in seen:
            continue
        seen.add(key)
        picked.append({"kind": kind, "text": text[:120] or kind.title(), "href": href})
    # Order: apply > notification > official
    order = {"apply": 0, "notification": 1, "official": 2}
    picked.sort(key=lambda x: order.get(x["kind"], 9))
    return picked[:12]


def _clean_article_html(article) -> str:
    """Strip ads, self-promo, inline event handlers, javascript: hrefs and internal freejobalert nav."""
    # Remove obviously unwanted tags
    for tag in article.find_all(["script", "style", "iframe", "noscript", "form", "button", "object", "embed", "svg"]):
        tag.decompose()
    # Remove ad / share / related containers by class hints
    for el in article.find_all(True):
        cls = " ".join(el.get("class") or []).lower()
        idv = (el.get("id") or "").lower()
        if any(x in cls or x in idv for x in
               ["ads", "adsbygoogle", "share", "related", "newsletter", "telegram",
                "subscribe", "author", "post-tags", "sidebar", "sociable", "yarpp"]):
            el.decompose()
    # Remove paragraphs / list-items / table-rows with self-promo copy
    for p in article.find_all(["p", "div", "li", "tr"]):
        txt = p.get_text(" ", strip=True)
        low = txt.lower()
        if (any(m in low for m in UNWANTED_TEXT_MARKERS) and len(low) < 400) or _is_promo_text(txt):
            p.decompose()
    # Strip inline event handler attrs (onclick, onerror, onload, etc.) on ALL elements
    for el in article.find_all(True):
        for attr in list(el.attrs.keys()):
            if attr.lower().startswith("on"):
                del el.attrs[attr]
    # Strip freejobalert internal links (unwrap anchor, keep text)
    for a in article.find_all("a", href=True):
        href = (a.get("href") or "").strip()
        low_href = href.lower()
        # Block javascript:, data:, vbscript: URIs — potential XSS vectors
        if low_href.startswith(("javascript:", "data:", "vbscript:", "file:")):
            a.decompose()
            continue
        if _is_junk_link(a.get_text(strip=True), href):
            a.decompose()
            continue
        if "freejobalert.com" in low_href and not low_href.endswith(".pdf"):
            a.unwrap()
            continue
        # Only allow http(s) hrefs — anything else is suspicious
        if not low_href.startswith(("http://", "https://", "mailto:", "tel:")):
            a.unwrap()
            continue
        # Open remaining external links in new tab
        a["target"] = "_blank"
        a["rel"] = "noreferrer noopener nofollow"
        a["class"] = (a.get("class") or []) + ["ext-link"]
    # Strip javascript: from image src too
    for img in article.find_all("img", src=True):
        src = (img.get("src") or "").strip().lower()
        if src.startswith(("javascript:", "data:", "vbscript:")):
            img.decompose()
    # Remove empty tags left behind
    for el in article.find_all(True):
        if not el.get_text(strip=True) and not el.find("img"):
            el.decompose()
    return str(article)


def clean_promo_html(html: str) -> str:
    """Strip FreeJobAlert promo blocks (Join Telegram/WhatsApp/Arattai channel,
    Sarkari Result, Download Mobile App, etc.) from an already-stored HTML string."""
    if not html:
        return html
    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception:
        return html
    # drop promo anchors
    for a in soup.find_all("a", href=True):
        if _is_junk_link(a.get_text(" ", strip=True), a["href"]):
            a.decompose()
    # drop promo blocks
    for el in soup.find_all(["p", "div", "li", "tr", "ul", "ol", "table"]):
        if _is_promo_text(el.get_text(" ", strip=True)):
            el.decompose()
    # drop now-empty leftovers
    for el in soup.find_all(["p", "div", "li", "tr"]):
        if not el.get_text(strip=True) and not el.find("img"):
            el.decompose()
    return str(soup)


async def fetch_article_detail(url: str) -> Dict | None:
    """Scrape the freejobalert article page and return cleaned content."""
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=25.0, follow_redirects=True) as http:
            r = await http.get(url)
            if r.status_code != 200:
                log.warning(f"article {url} -> HTTP {r.status_code}")
                return None
            soup = BeautifulSoup(r.text, "html.parser")
            article = (soup.select_one(".entry-content") or
                       soup.select_one("article") or
                       soup.select_one(".post-content"))
            if not article:
                return None
            heading_el = soup.find("h1")
            heading = _clean(heading_el.get_text()) if heading_el else ""
            # Grab description (first 2-3 paragraphs of raw text)
            paragraphs = [_clean(p.get_text(" ", strip=True)) for p in article.find_all("p")]
            paragraphs = [p for p in paragraphs
                          if p and len(p) > 40 and
                          not any(m in p.lower() for m in UNWANTED_TEXT_MARKERS)]
            description = " ".join(paragraphs[:3])[:1200]
            important_links = _extract_important_links(article)
            structured = _extract_structured_facts(article)
            content_html = _clean_article_html(article)
            return {
                "heading": apply_brand(heading[:250]),
                "description": apply_brand(description),
                "important_links": important_links,
                "structured": structured,
                "content_html": brand_html(content_html[:60000]),
                "detail_fetched_at": datetime.now(timezone.utc),
            }
    except Exception as e:
        log.error(f"article scrape error {url}: {e}")
        return None


# ─────────── Structured Fact Extraction ───────────
FACT_LABELS = {
    "total_posts": [
        r"total\s+vacancies?", r"total\s+posts?", r"no\.?\s*of\s+vacancies?",
        r"no\.?\s*of\s+posts?", r"number\s+of\s+posts?", r"vacancy\s+details?",
    ],
    "apply_start": [
        r"(?:registration|application|apply(?:ing)?)\s+(?:opening|start(?:ing)?|commencement)\s+date",
        r"opening\s+date\s+for\s+online\s+registration",
        r"starting\s+date",
    ],
    "apply_end": [
        r"(?:registration|application|apply(?:ing)?)\s+(?:closing|last|end(?:ing)?)\s+date",
        r"closing\s+date\s+for\s+online\s+registration",
        r"last\s+date\s+(?:to\s+apply|of\s+application|for\s+apply(?:ing)?)",
        r"last\s+date",
    ],
    "salary": [
        r"pay\s+scale", r"salary(?:\s+and\s+perquisites)?", r"pay\s+level",
        r"monthly\s+salary", r"remuneration", r"basic\s+pay",
    ],
    "age_limit": [
        r"age\s+limit", r"age\s+criteria", r"age\s+eligibility",
        r"minimum\s+and\s+maximum\s+age",
    ],
    "selection": [
        r"selection\s+process", r"mode\s+of\s+selection", r"selection\s+procedure",
    ],
    "job_location": [
        r"job\s+location", r"place\s+of\s+posting", r"work\s+location",
    ],
}


def _find_value_after(lines: list[str], idx: int, prefer_numeric: bool = False, max_len: int = 200) -> str | None:
    """Return the first non-empty short line after idx that looks like a value.

    If prefer_numeric is True, prefer lines that contain digits/currency markers
    (falls back to first non-empty if none found in window).
    """
    window = []
    for j in range(idx + 1, min(idx + 6, len(lines))):
        cand = lines[j].strip()
        if not cand:
            continue
        window.append(cand)
    if not window:
        return None
    if prefer_numeric:
        for cand in window:
            if re.search(r"\d", cand) or "₹" in cand or "rs" in cand.lower():
                return cand[:max_len]
    return window[0][:max_len]


def _extract_structured_facts(article) -> dict:
    """Pull key labelled facts (total_posts, dates, fee, salary, age)."""
    text = article.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    out: dict = {}

    NUMERIC_FIELDS = {"total_posts", "apply_start", "apply_end", "salary", "age_limit"}

    for key, patterns in FACT_LABELS.items():
        for i, line in enumerate(lines):
            low = line.lower()
            if len(low) > 80:
                continue
            if any(re.search(p, low) for p in patterns):
                val = _find_value_after(lines, i, prefer_numeric=key in NUMERIC_FIELDS)
                if val and val.lower() != line.lower():
                    out[key] = val[:200]
                    break

    # Total posts numeric extraction
    if "total_posts" in out:
        m = re.search(r"(\d[\d,]*)", out["total_posts"])
        if m:
            out["total_posts_num"] = int(m.group(1).replace(",", ""))

    # Application fee — grab up to 6 lines after the "Application Fee" heading and pick fee amounts
    fee_lines = []
    fee_hits = 0
    capture = False
    for line in lines:
        low = line.lower()
        if not capture and re.search(r"application\s+fee|examination\s+fee|fee\s+details?", low) and len(low) < 80:
            capture = True
            continue
        if capture:
            # stop at next section heading
            if fee_hits > 10 or re.search(r"(selection\s+process|age\s+limit|educational\s+qualification|how\s+to\s+apply|important\s+dates|salary)", low):
                break
            # Skip pure column labels
            if low in ("category", "fee amount", "fee amount (per candidate)", "amount", "gender"):
                fee_hits += 1
                continue
            # Take reasonably short informative lines
            if len(line) < 120 and (
                "rs" in low or "₹" in line or "/-" in line or "no fee" in low or "nil" in low or
                re.search(r"\b(general|obc|sc|st|ews|female|male|pwd|physical)\b", low)
            ):
                fee_lines.append(line)
            fee_hits += 1
    if fee_lines:
        out["application_fee"] = " · ".join(fee_lines[:6])[:400]

    return out
