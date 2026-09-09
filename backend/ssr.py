"""Dynamic Rendering (SSR-for-bots) engine.

Renders full, crawlable HTML for search-engine crawlers and social-media
scrapers, backed by *live* data from MongoDB. Regular users keep getting the
normal React SPA — only crawlers (and only in production) are served this HTML.

Design goals (see requirements):
  • Bot list covers major search + social crawlers (OG previews on WhatsApp etc.)
  • Rendered HTML carries: full content, unique <title>/description, canonical,
    OG + Twitter tags, and JobPosting/Article JSON-LD where relevant.
  • TTL cache (default 45 min) so crawler storms never hammer the DB / scraper.
  • Never raises to the caller — on any failure the caller falls back to the SPA.
"""
from __future__ import annotations

import html
import re
import time
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple

from bson import ObjectId

from scrapers import parse_last_date, is_expired

log = logging.getLogger("haryana.ssr")

# ───────────────────────── Bot detection ─────────────────────────
# Search engines + social-media link-preview crawlers. WhatsApp/Telegram/Slack
# fetch the page to build a link preview, so OG tags must be in the HTML.
_BOT_PATTERNS = [
    r"googlebot", r"google-inspectiontool", r"storebot-google", r"google-site-verification",
    r"bingbot", r"bingpreview", r"adidxbot",
    r"duckduckbot", r"duckduckgo",
    r"yandex",  # yandexbot, yandeximages, ...
    r"baiduspider",
    r"applebot",
    r"facebookexternalhit", r"facebookcatalog", r"facebot", r"meta-externalagent",
    r"twitterbot",
    r"linkedinbot",
    r"whatsapp",
    r"telegrambot", r"telegram",
    r"slackbot", r"slack-imgproxy",
    r"discordbot",
    r"pinterest",
    r"redditbot",
    r"embedly",
    r"skypeuripreview",
    r"vkshare",
    r"w3c_validator",
]
_BOT_RE = re.compile("|".join(_BOT_PATTERNS), re.IGNORECASE)


def is_bot(user_agent: Optional[str]) -> bool:
    if not user_agent:
        return False
    return bool(_BOT_RE.search(user_agent))


# ───────────────────────── TTL cache ─────────────────────────
_CACHE: dict[str, Tuple[str, float]] = {}
_TTL_SECONDS = 45 * 60  # 45 min (vacancies refresh hourly → always fresh enough)


def _cache_get(key: str) -> Optional[str]:
    hit = _CACHE.get(key)
    if not hit:
        return None
    html_str, expiry = hit
    if time.time() > expiry:
        _CACHE.pop(key, None)
        return None
    return html_str


def _cache_set(key: str, value: str, ttl: int = _TTL_SECONDS) -> None:
    _CACHE[key] = (value, time.time() + ttl)


def clear_cache() -> None:
    """Called after a vacancy refresh / admin edit so crawlers see fresh data."""
    _CACHE.clear()


# ───────────────────────── HTML helpers ─────────────────────────
def _e(text) -> str:
    """HTML-escape any value for safe text/attribute output."""
    return html.escape(str(text if text is not None else ""), quote=True)


def _strip_html(raw: Optional[str], limit: int = 300) -> str:
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", " ", str(raw))
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        text = text[: limit - 1].rsplit(" ", 1)[0] + "…"
    return text


def _inline_md(text: str) -> str:
    """Escape text then apply inline markdown (links + bold)."""
    s = _e(text)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^\s)]+)\)",
              r'<a href="\2" target="_blank" rel="noopener nofollow">\1</a>', s)
    s = re.sub(r"\*\*([^*]+?)\*\*", r"<strong>\1</strong>", s)
    # Auto-link bare URLs not already inside an anchor
    s = re.sub(r"(?<!\")(?<!>)\b((?:https?://|www\.)[^\s<]+)",
              lambda m: f'<a href="{m.group(1) if m.group(1).startswith("http") else "https://"+m.group(1)}" target="_blank" rel="noopener nofollow">{m.group(1)}</a>', s)
    return s


def _md_to_html(text: str) -> str:
    """Convert markdown-ish text (headings, bullets, tables, links, bold) to HTML.
    Mirrors the frontend so bots + JobPosting schema match the visible page."""
    if not text:
        return ""
    lines = str(text).split("\n")
    out, li_buf, tbl_buf = [], [], []

    def flush_list():
        if li_buf:
            out.append("<ul>" + "".join(f"<li>{_inline_md(x)}</li>" for x in li_buf) + "</ul>")
            li_buf.clear()

    def split_row(line):
        return [c.strip() for c in re.sub(r"^\s*\|", "", re.sub(r"\|\s*$", "", line)).split("|")]

    def is_sep(cells):
        return bool(cells) and all(re.fullmatch(r":?-{2,}:?", c.replace(" ", "")) for c in cells)

    def flush_table():
        if not tbl_buf:
            return
        rows = [split_row(l) for l in tbl_buf]
        tbl_buf.clear()
        if len(rows) < 2:
            for r in rows:
                out.append(f"<p>{_inline_md(' '.join(r))}</p>")
            return
        header = rows[0]
        body = [r for r in rows[1:] if not is_sep(r)]
        h = '<div class="table-wrap"><table><thead><tr>' + "".join(f"<th>{_inline_md(c)}</th>" for c in header) + "</tr></thead><tbody>"
        for r in body:
            h += "<tr>" + "".join(f"<td>{_inline_md(c)}</td>" for c in r) + "</tr>"
        out.append(h + "</tbody></table></div>")

    for raw in lines:
        line = raw.strip()
        if line.count("|") >= 2:
            flush_list(); tbl_buf.append(line); continue
        flush_table()
        if not line:
            flush_list(); continue
        mh = re.match(r"^(#{1,4})\s+(.*)$", line)
        if mh:
            flush_list()
            lvl = min(len(mh.group(1)) + 1, 4)
            out.append(f"<h{lvl}>{_inline_md(mh.group(2))}</h{lvl}>")
            continue
        mb = re.match(r"^(?:[*\-•·]|\d+[.)])\s+(.*)$", line)
        if mb:
            li_buf.append(mb.group(1)); continue
        flush_list()
        out.append(f"<p>{_inline_md(line)}</p>")
    flush_list()
    flush_table()
    return "".join(out)


NAV_LINKS = [
    ("/", "Vacancies"),
    ("/services", "Services"),
    ("/solar", "Solar"),
    ("/blogs", "Blogs"),
    ("/notices", "Notices"),
    ("/faq", "FAQ"),
    ("/contact", "Contact"),
    ("/about", "About"),
]


def _header(site_url: str) -> str:
    links = "".join(
        f'<a href="{_e(site_url)}{_e(path)}">{_e(label)}</a>' for path, label in NAV_LINKS
    )
    return (
        '<header class="ssr-header"><a class="ssr-brand" href="' + _e(site_url) + '">'
        '<strong>HR Digital Services</strong><span>Govt Jobs &amp; Solar Services</span></a>'
        f'<nav class="ssr-nav">{links}</nav></header>'
    )


def _footer(site_url: str, contact: dict) -> str:
    phone = _e(contact.get("phone", "+91-9812345678"))
    email = _e(contact.get("email", "info@hrdigitalservices.in"))
    addr = _e(contact.get("address_en", "Main Market, Haryana"))
    return (
        '<footer class="ssr-footer">'
        '<p><strong>HR Digital Services</strong> — Govt-approved rooftop solar vendor &amp; '
        'latest Sarkari Naukri / job-vacancy alerts across India.</p>'
        f'<p>Phone: {phone} · Email: {email} · {addr}</p>'
        f'<p><a href="{_e(site_url)}/api/sitemap.xml">Sitemap</a></p>'
        '</footer>'
    )


def _shell(*, title: str, description: str, canonical: str, keywords: str,
           body: str, og_type: str = "website", og_image: str = "",
           jsonld: str = "", site_url: str = "") -> str:
    """Assemble a complete, valid HTML document for crawlers."""
    og_image = og_image or f"{site_url}/logo512.png"
    head = f"""<!doctype html>
<html lang="hi">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{_e(title)}</title>
<meta name="description" content="{_e(description)}"/>
<meta name="keywords" content="{_e(keywords)}"/>
<meta name="robots" content="index, follow, max-image-preview:large"/>
<link rel="canonical" href="{_e(canonical)}"/>
<meta property="og:site_name" content="HR Digital Services"/>
<meta property="og:type" content="{_e(og_type)}"/>
<meta property="og:title" content="{_e(title)}"/>
<meta property="og:description" content="{_e(description)}"/>
<meta property="og:url" content="{_e(canonical)}"/>
<meta property="og:image" content="{_e(og_image)}"/>
<meta property="og:locale" content="hi_IN"/>
<meta property="og:locale:alternate" content="en_IN"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{_e(title)}"/>
<meta name="twitter:description" content="{_e(description)}"/>
<meta name="twitter:image" content="{_e(og_image)}"/>
{jsonld}
<style>
body{{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;margin:0;color:#0f172a;background:#fff;line-height:1.6}}
.ssr-header{{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #e2e8f0}}
.ssr-brand{{text-decoration:none;color:#065f46;display:flex;flex-direction:column}}
.ssr-brand span{{font-size:12px;color:#475569}}
.ssr-nav a{{margin-left:14px;color:#0f766e;text-decoration:none;font-size:14px}}
main{{max-width:1000px;margin:0 auto;padding:24px}}
h1{{font-size:28px;margin:0 0 8px}} h2{{font-size:20px;margin:24px 0 8px}}
.job{{border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:12px 0}}
.job a{{color:#0f766e;text-decoration:none;font-weight:600}}
.meta{{color:#475569;font-size:14px}}
.ssr-footer{{border-top:1px solid #e2e8f0;padding:20px 24px;color:#475569;font-size:13px;margin-top:32px}}
.ssr-footer a{{color:#0f766e}}
.table-wrap{{overflow-x:auto;border:1px solid #e2e8f0;border-radius:12px;margin:12px 0}}
table{{border-collapse:collapse;width:100%;font-size:14px}}
th,td{{border:1px solid #e2e8f0;padding:8px 12px;text-align:left}}
th{{background:#ecfdf5;color:#065f46;font-weight:600}}
a{{color:#0f766e}}
</style>
</head>
<body>
{_header(site_url)}
<main>
{body}
</main>
"""
    return head


def _jsonld(obj_json: str) -> str:
    return f'<script type="application/ld+json">{obj_json}</script>'


# ───────────────────────── Data → content builders ─────────────────────────
async def _get_content(db, key: str, defaults: dict) -> dict:
    base = dict(defaults.get(key, {}))
    try:
        row = await db.site_content.find_one({"key": key})
        if row and row.get("value"):
            base.update(row["value"])
    except Exception:
        pass
    return base


async def _get_contact(db, defaults: dict) -> dict:
    return await _get_content(db, "content:contact", defaults)


async def _render_vacancies_list(db, site_url: str, canonical: str, defaults: dict) -> str:
    seo = await _get_content(db, "seo:vacancies", defaults)
    title = seo.get("title") or "Latest Sarkari Naukri 2026 — HR Digital Services"
    desc = seo.get("description") or "Latest government jobs, admit cards & results across India."
    keywords = seo.get("keywords", "")

    items = []
    try:
        cursor = db.vacancies.find(
            {}, sort=[("fetched_at", -1)]
        ).limit(120)
        async for v in cursor:
            if is_expired(v.get("last_date_text")):
                continue
            vid = str(v.get("_id"))
            name = v.get("post_name") or v.get("title") or "Government Vacancy"
            org = v.get("organization") or ""
            last = v.get("last_date_text") or "See notification"
            qual = v.get("qualification") or ""
            items.append(
                f'<div class="job"><a href="{_e(site_url)}/vacancies/{_e(vid)}">{_e(name)}</a>'
                f'<div class="meta">{_e(org)}</div>'
                f'<div class="meta">Qualification: {_e(qual)} · Last date: {_e(last)}</div></div>'
            )
            if len(items) >= 80:
                break
    except Exception as e:
        log.warning(f"ssr vacancies query failed: {e}")

    body = (
        f"<h1>{_e(title)}</h1><p>{_e(desc)}</p>"
        f"<h2>Latest Government Vacancies ({len(items)})</h2>"
        + ("".join(items) if items else "<p>New vacancies are being updated. Please check back shortly.</p>")
    )
    return _shell(title=title, description=desc, canonical=canonical, keywords=keywords,
                  body=body, og_type="website", site_url=site_url)


async def _render_vacancy_detail(db, site_url: str, canonical: str, vac_id: str, defaults: dict) -> Optional[str]:
    try:
        v = await db.vacancies.find_one({"_id": ObjectId(vac_id)})
    except Exception:
        return None
    if not v:
        return None

    name = v.get("post_name") or v.get("title") or "Government Vacancy"
    org = v.get("organization") or "Government of India"
    title = v.get("seo_title") or f"{name} — HR Digital Services"
    last = v.get("last_date_text") or ""
    qual = v.get("qualification") or ""
    posts = v.get("total_posts") or (v.get("structured") or {}).get("total_posts") or ""
    state = v.get("state") or "India"

    # Hindi descriptive content — use cached fields if present, else build
    # deterministic templates synchronously (no LLM call inside SSR path).
    import hindi_content as _hc
    h_intro = v.get("hindi_intro")
    h_desc = v.get("hindi_description")
    h_apply = v.get("hindi_how_to_apply")
    h_select = v.get("hindi_selection_process")
    if not (h_intro and h_desc and h_apply and h_select):
        t = _hc.build_templates(v)
        h_intro = h_intro or t["hindi_intro"]
        h_desc = h_desc or t["hindi_description"]
        h_apply = h_apply or t["hindi_how_to_apply"]
        h_select = h_select or t["hindi_selection_process"]

    def _para(text):
        return _md_to_html(text)

    # Meta description = Hindi intro/description (matches the visible page)
    desc = (v.get("seo_description") or _strip_html(h_intro) or _strip_html(h_desc))[:300]

    posted = v.get("fetched_at")
    if isinstance(posted, datetime):
        date_posted = posted.astimezone(timezone.utc).date().isoformat()
    else:
        date_posted = datetime.now(timezone.utc).date().isoformat()
    valid_through = None
    dt = parse_last_date(last)
    if dt:
        valid_through = dt.date().isoformat() + "T23:59:59+05:30"

    # JSON-LD description = the SAME Hindi content shown on the page (schema/content match)
    schema_desc_html = _para(h_intro) + _para(h_desc) + _para(h_apply) + _para(h_select)

    import json as _json
    jobposting = {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        "title": name,
        "description": schema_desc_html,
        "datePosted": date_posted,
        "employmentType": "FULL_TIME",
        "hiringOrganization": {"@type": "Organization", "name": org},
        "jobLocation": {
            "@type": "Place",
            "address": {"@type": "PostalAddress", "addressRegion": str(state).title(), "addressCountry": "IN"},
        },
        "identifier": {"@type": "PropertyValue", "name": org, "value": str(v.get("_id"))},
    }
    if valid_through:
        jobposting["validThrough"] = valid_through
    jsonld = _jsonld(_json.dumps(jobposting, ensure_ascii=False))

    meta_bits = []
    if org:
        meta_bits.append(f"Organization: {_e(org)}")
    if posts:
        meta_bits.append(f"Total posts: {_e(posts)}")
    if qual:
        meta_bits.append(f"Qualification: {_e(qual)}")
    if last:
        meta_bits.append(f"Last date: {_e(last)}")

    # Important Links (Fix 1) — always English labels, working URLs. Rendered in
    # the SSR/crawler HTML too so it matches the React page.
    _LINK_LABELS = {
        "apply": "Apply Online",
        "registration": "Registration Link",
        "notification": "Official Notification PDF",
        "official": "Official Website",
    }
    links_html = ""
    imp_links = v.get("important_links") or []
    if imp_links:
        rows = []
        for l in imp_links:
            href = l.get("href") or l.get("url")
            if not href:
                continue
            kind = l.get("kind")
            is_pdf = (l.get("type") == "pdf") or href.lower().split("?")[0].endswith(".pdf")
            label = _LINK_LABELS.get(kind) or ("Official Notification PDF" if is_pdf else "Official Website")
            rows.append(
                f'<li><strong>{_e(label)}:</strong> '
                f'<a href="{_e(href)}" target="_blank" rel="noreferrer nofollow">Click here</a></li>'
            )
        if rows:
            links_html = "<h2>Important Links</h2><ul>" + "".join(rows) + "</ul>"

    body = (
        f"<h1>{_e(name)}</h1>"
        f'<div class="meta">{" · ".join(meta_bits)}</div>'
        f"<div class='intro'>{_para(h_intro)}</div>"
        f"<h2>विवरण</h2><div>{_para(h_desc)}</div>"
        f"<h2>आवेदन कैसे करें</h2><div>{_para(h_apply)}</div>"
        f"<h2>चयन प्रक्रिया</h2><div>{_para(h_select)}</div>"
        + links_html
        + f'<p><a href="{_e(site_url)}/">← All latest vacancies</a></p>'
    )
    return _shell(title=title, description=desc, canonical=canonical,
                  keywords=f"{name}, sarkari naukri, govt job, {org}",
                  body=body, og_type="article", jsonld=jsonld, site_url=site_url)


async def _render_blogs_list(db, site_url: str, canonical: str, defaults: dict) -> str:
    seo = await _get_content(db, "seo:blogs", defaults)
    title = seo.get("title") or "Blogs — HR Digital Services"
    desc = seo.get("description") or "Career guidance and sarkari naukri articles."
    items = []
    try:
        async for b in db.blogs.find({"status": "published"}).sort("created_at", -1).limit(60):
            slug = b.get("slug") or ""
            btitle = b.get("title") or "Blog post"
            excerpt = b.get("excerpt") or _strip_html(b.get("content") or b.get("body") or "", 160)
            items.append(
                f'<div class="job"><a href="{_e(site_url)}/blogs/{_e(slug)}">{_e(btitle)}</a>'
                f'<div class="meta">{_e(excerpt)}</div></div>'
            )
    except Exception as e:
        log.warning(f"ssr blogs query failed: {e}")
    body = f"<h1>{_e(title)}</h1><p>{_e(desc)}</p>" + (
        "".join(items) if items else "<p>New articles coming soon.</p>"
    )
    return _shell(title=title, description=desc, canonical=canonical,
                  keywords=seo.get("keywords", ""), body=body, site_url=site_url)


async def _render_blog_detail(db, site_url: str, canonical: str, slug: str, defaults: dict) -> Optional[str]:
    try:
        b = await db.blogs.find_one({"slug": slug})
    except Exception:
        return None
    if not b:
        return None
    btitle = b.get("title") or "Blog post"
    content = b.get("content") or b.get("body") or ""
    desc = b.get("excerpt") or _strip_html(content)
    title = f"{btitle} — HR Digital Services"

    import json as _json
    posted = b.get("created_at")
    date_pub = posted.astimezone(timezone.utc).date().isoformat() if isinstance(posted, datetime) else datetime.now(timezone.utc).date().isoformat()
    article = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": btitle,
        "description": desc,
        "datePublished": date_pub,
        "author": {"@type": "Organization", "name": "HR Digital Services"},
        "publisher": {"@type": "Organization", "name": "HR Digital Services"},
        "mainEntityOfPage": canonical,
    }
    jsonld = _jsonld(_json.dumps(article, ensure_ascii=False))
    body = f"<h1>{_e(btitle)}</h1>" + (f"<div>{content}</div>" if content else f"<p>{_e(desc)}</p>")
    return _shell(title=title, description=desc, canonical=canonical,
                  keywords="haryana jobs blog, sarkari naukri news",
                  body=body, og_type="article", jsonld=jsonld, site_url=site_url)


async def _render_faq(db, site_url: str, canonical: str, defaults: dict) -> str:
    import json as _json
    faqs = []
    try:
        async for f in db.faqs.find({}).limit(50):
            q = f.get("question") or f.get("q") or ""
            a = f.get("answer") or f.get("a") or ""
            if q:
                faqs.append((q, a))
    except Exception:
        pass
    title = "FAQ — HR Digital Services"
    desc = "Frequently asked questions about government job alerts, solar services and applications."
    body_items = "".join(
        f"<div class='job'><strong>{_e(q)}</strong><div class='meta'>{_e(_strip_html(a, 500))}</div></div>"
        for q, a in faqs
    ) or "<p>FAQs coming soon.</p>"
    jsonld = ""
    if faqs:
        faq_ld = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": q,
                 "acceptedAnswer": {"@type": "Answer", "text": _strip_html(a, 500)}}
                for q, a in faqs
            ],
        }
        jsonld = _jsonld(_json.dumps(faq_ld, ensure_ascii=False))
    body = f"<h1>{_e(title)}</h1><p>{_e(desc)}</p>{body_items}"
    return _shell(title=title, description=desc, canonical=canonical,
                  keywords="faq, sarkari naukri help", body=body, jsonld=jsonld, site_url=site_url)


async def _render_static(db, site_url: str, canonical: str, seo_key: str, defaults: dict,
                         extra_body: str = "") -> str:
    seo = await _get_content(db, seo_key, defaults)
    contact = await _get_contact(db, defaults)
    about = await _get_content(db, "content:about", defaults)
    hero = await _get_content(db, "content:hero", defaults)
    title = seo.get("title") or "HR Digital Services"
    desc = seo.get("description") or ""
    heading = hero.get("heading_en") or "HR Digital Services"
    tagline = hero.get("tagline_en") or ""
    body = (
        f"<h1>{_e(heading)}</h1><p>{_e(tagline)}</p>"
        f"<p>{_e(about.get('text_en', ''))}</p>"
        + extra_body
        + f"<h2>Contact</h2><p>Phone: {_e(contact.get('phone',''))} · "
          f"WhatsApp: {_e(contact.get('whatsapp',''))} · Email: {_e(contact.get('email',''))}</p>"
    )
    return _shell(title=title, description=desc, canonical=canonical,
                  keywords=seo.get("keywords", ""), body=body, site_url=site_url)


# ───────────────────────── Public entry point ─────────────────────────
async def render_path(db, path: str, site_url: str, defaults: dict) -> Optional[str]:
    """Return fully-rendered HTML for `path`, or None if the route is not
    SSR-supported (caller should then fall back to the SPA)."""
    site_url = (site_url or "").rstrip("/")
    # normalise
    clean = "/" + path.strip("/") if path.strip("/") else "/"
    clean = clean.split("?")[0].split("#")[0]
    canonical = f"{site_url}{'' if clean == '/' else clean}"

    cache_key = clean
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        html_out: Optional[str] = None

        if clean in ("/", "/vacancies"):
            html_out = await _render_vacancies_list(db, site_url, f"{site_url}/", defaults)
        elif clean.startswith("/vacancies/"):
            vac_id = clean.split("/vacancies/", 1)[1].strip("/")
            html_out = await _render_vacancy_detail(db, site_url, canonical, vac_id, defaults)
        elif clean == "/blogs":
            html_out = await _render_blogs_list(db, site_url, canonical, defaults)
        elif clean.startswith("/blogs/"):
            slug = clean.split("/blogs/", 1)[1].strip("/")
            html_out = await _render_blog_detail(db, site_url, canonical, slug, defaults)
        elif clean == "/faq":
            html_out = await _render_faq(db, site_url, canonical, defaults)
        elif clean in ("/solar",):
            html_out = await _render_static(db, site_url, canonical, "seo:solar", defaults)
        elif clean in ("/services",):
            html_out = await _render_static(db, site_url, canonical, "seo:services", defaults)
        elif clean in ("/about",):
            html_out = await _render_static(db, site_url, canonical, "seo:about", defaults)
        elif clean in ("/contact", "/enquiry"):
            html_out = await _render_static(db, site_url, canonical, "seo:contact", defaults)
        elif clean in ("/notices", "/downloads", "/gallery"):
            html_out = await _render_static(db, site_url, canonical, "seo:home", defaults)

        if html_out:
            contact = await _get_contact(db, defaults)
            html_out = html_out + _footer(site_url, contact) + "\n</body>\n</html>\n"
            # vacancy detail can change more often → shorter TTL
            ttl = 20 * 60 if clean.startswith("/vacancies/") else _TTL_SECONDS
            _cache_set(cache_key, html_out, ttl)
        return html_out
    except Exception as e:  # never bubble up — caller falls back to SPA
        log.warning(f"SSR render failed for {clean}: {e}")
        return None


# ───────────────────────── Dynamic sitemap ─────────────────────────
async def build_sitemap(db, site_url: str) -> str:
    """Dynamic sitemap: static pages + ACTIVE (non-expired) vacancies + blogs."""
    site_url = (site_url or "").rstrip("/")
    today = datetime.now(timezone.utc).date().isoformat()
    urls: list[str] = []

    def add(loc: str, changefreq: str, priority: str, lastmod: str = today):
        urls.append(
            f"  <url><loc>{_e(loc)}</loc><lastmod>{lastmod}</lastmod>"
            f"<changefreq>{changefreq}</changefreq><priority>{priority}</priority></url>"
        )

    # Static pages
    add(f"{site_url}/", "hourly", "1.0")
    add(f"{site_url}/services", "weekly", "0.9")
    add(f"{site_url}/solar", "weekly", "0.9")
    add(f"{site_url}/blogs", "daily", "0.7")
    add(f"{site_url}/notices", "weekly", "0.6")
    add(f"{site_url}/downloads", "monthly", "0.5")
    add(f"{site_url}/faq", "monthly", "0.6")
    add(f"{site_url}/about", "monthly", "0.6")
    add(f"{site_url}/contact", "monthly", "0.6")

    # Active vacancies only
    try:
        async for v in db.vacancies.find(
            {}, {"_id": 1, "fetched_at": 1, "last_date_text": 1}, sort=[("fetched_at", -1)]
        ).limit(2000):
            if is_expired(v.get("last_date_text")):
                continue
            fetched = v.get("fetched_at")
            lastmod = fetched.date().isoformat() if isinstance(fetched, datetime) else today
            add(f"{site_url}/vacancies/{str(v['_id'])}", "weekly", "0.8", lastmod)
    except Exception as e:
        log.warning(f"sitemap vacancies query failed: {e}")

    # Published blogs
    try:
        async for b in db.blogs.find({"status": "published"}, {"slug": 1, "created_at": 1}).limit(500):
            slug = b.get("slug")
            if not slug:
                continue
            created = b.get("created_at")
            lastmod = created.date().isoformat() if isinstance(created, datetime) else today
            add(f"{site_url}/blogs/{slug}", "monthly", "0.6", lastmod)
    except Exception as e:
        log.warning(f"sitemap blogs query failed: {e}")

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )
