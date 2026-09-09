"""Hindi content generation for job vacancies (Hybrid: templates + LLM).

Descriptive fields (intro, description, how-to-apply, selection-process) are
produced in Hindi. Structured facts (title, organization, dates, qualification,
total posts) stay in English and are simply embedded into the Hindi sentences.

Strategy:
  • Template engine (deterministic, always available) builds all four fields
    from the vacancy's structured data — this is the guaranteed fallback.
  • The raw English `description` is additionally rewritten into natural Hindi
    by Gemini Flash (via emergentintegrations + EMERGENT_LLM_KEY). If the LLM
    call fails / is unavailable, the template description is used instead so the
    page is never blank.
"""
from __future__ import annotations

import os
import re
import logging
from datetime import datetime, timezone

log = logging.getLogger("haryana.hindi")

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
HINDI_MODEL = ("gemini", "gemini-2.5-flash")


# ───────────────────────── helpers ─────────────────────────
def _strip_html(raw, limit: int = 6000) -> str:
    """Convert content HTML to a text form the LLM can rewrite while PRESERVING
    links (as markdown `[label](url)`) and table/line structure so the rewritten
    Hindi keeps working links and tabular data."""
    if not raw:
        return ""
    text = str(raw)
    # Preserve anchors as markdown links BEFORE stripping tags (else URLs are lost).
    text = re.sub(
        r'<a\b[^>]*?href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
        lambda m: f'[{re.sub(r"<[^>]+>", " ", m.group(2)).strip() or "Link"}]({m.group(1)})',
        text, flags=re.I | re.S,
    )
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</(p|div|li|tr|h[1-6])>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]*\n[ \t]*\n+", "\n\n", text)
    return text.strip()[:limit]


def _f(v, *keys, default=""):
    """First non-empty value among v[key] / v['structured'][key]."""
    s = v.get("structured") or {}
    for k in keys:
        val = v.get(k) or s.get(k)
        if val:
            return str(val).strip()
    return default


def _clean_posts(v: dict) -> str:
    """Return a clean numeric post count, or '' if the field looks like junk
    (some scraped rows store a reference/notification no. in total_posts)."""
    raw = _f(v, "total_posts")
    if not raw:
        return ""
    # Reference numbers (e.g. "PER/0106/2026-2027/3") contain slashes → reject.
    if "/" in raw:
        return ""
    low = raw.lower()
    num_rx = r"(\d{1,3}(?:,\d{3})+|\d{1,6})"
    # Whole field is just a number, optionally with a "posts/vacancies/seats/पद" word.
    m = re.match(rf"^\s*(?:total\s+)?{num_rx}\s*(?:posts?|vacancies|vacancy|seats?|pad|पद)?\s*$", low)
    if m:
        return m.group(1)
    # Or an explicit "<n> posts" phrase embedded in a longer string.
    m2 = re.search(rf"\b{num_rx}\s*(?:posts?|vacancies|seats?)\b", low)
    if m2:
        return m2.group(1)
    return ""


# ───────────────────────── template engine ─────────────────────────
_INTRO_VARIANTS = [
    "{org} द्वारा {post} के पदों पर नई सरकारी भर्ती की घोषणा की गई है। {posts_line}"
    "योग्य एवं इच्छुक उम्मीदवार आवेदन करने से पहले नीचे दी गई पात्रता, आवेदन प्रक्रिया और "
    "चयन प्रक्रिया की पूरी जानकारी ध्यान से पढ़ें।",

    "सरकारी नौकरी की तलाश कर रहे उम्मीदवारों के लिए {org} ने {post} के लिए भर्ती निकाली है। "
    "{posts_line}इस पेज पर हमने इस भर्ती से जुड़ी सभी ज़रूरी बातें सरल हिंदी में समझाई हैं।",

    "{post} के इच्छुक अभ्यर्थियों के लिए {org} की ओर से एक शानदार अवसर सामने आया है। "
    "{posts_line}आवेदन करने से पहले अंतिम तिथि और योग्यता संबंधी शर्तें अवश्य जाँच लें।",

    "{org} में {post} के पद के लिए आवेदन आमंत्रित किए गए हैं। {posts_line}"
    "इच्छुक उम्मीदवार आधिकारिक अधिसूचना के अनुसार समय रहते आवेदन प्रक्रिया पूरी करें।",
]


def _intro(v: dict) -> str:
    post = _f(v, "post_name", "title", default="इस भर्ती")
    org = _f(v, "organization", default="संबंधित विभाग")
    posts = _clean_posts(v)
    posts_line = f"इस भर्ती में कुल {posts} पद उपलब्ध हैं। " if posts else ""
    # Deterministic but varied per vacancy id so each page reads uniquely.
    seed = abs(hash(str(v.get("_id") or v.get("id") or post))) % len(_INTRO_VARIANTS)
    return _INTRO_VARIANTS[seed].format(post=post, org=org, posts_line=posts_line)


def _template_description(v: dict) -> str:
    post = _f(v, "post_name", "title", default="—")
    org = _f(v, "organization", default="—")
    posts = _clean_posts(v) or "अधिसूचना देखें"
    qual = _f(v, "qualification", default="अधिसूचना के अनुसार")
    last = _f(v, "last_date_text", default="जल्द घोषित")
    return (
        "इस भर्ती से जुड़ी मुख्य जानकारी संक्षेप में इस प्रकार है:\n"
        f"• पद का नाम: {post}\n"
        f"• भर्ती संस्था: {org}\n"
        f"• कुल पद: {posts}\n"
        f"• शैक्षणिक योग्यता: {qual}\n"
        f"• आवेदन की अंतिम तिथि: {last}\n"
        "विस्तृत जानकारी, आयु सीमा, आरक्षण और वेतनमान के लिए उम्मीदवार आधिकारिक "
        "अधिसूचना अवश्य पढ़ें।"
    )


def _how_to_apply(v: dict) -> str:
    last = _f(v, "last_date_text", default="निर्धारित अंतिम तिथि")
    mode = (v.get("application_mode") or "").lower()
    if mode == "offline":
        return (
            "आवेदन कैसे करें (ऑफ़लाइन):\n"
            "1. सबसे पहले आधिकारिक अधिसूचना ध्यान से पढ़ें और निर्धारित आवेदन प्रपत्र प्राप्त करें।\n"
            "2. प्रपत्र में मांगी गई सभी जानकारी सही-सही भरें।\n"
            "3. आवश्यक दस्तावेज़ों की स्व-सत्यापित प्रतियाँ संलग्न करें।\n"
            f"4. भरा हुआ आवेदन निर्धारित पते पर अंतिम तिथि {last} से पहले भेज/जमा कर दें।\n"
            "5. भविष्य के संदर्भ के लिए आवेदन की एक प्रति अपने पास सुरक्षित रखें।"
        )
    return (
        "आवेदन कैसे करें (ऑनलाइन):\n"
        "1. आधिकारिक वेबसाइट पर जाकर अधिसूचना ध्यान से पढ़ें।\n"
        "2. 'Apply Online' लिंक पर क्लिक करके नया पंजीकरण करें।\n"
        "3. व्यक्तिगत, शैक्षणिक और अन्य आवश्यक जानकारी भरें।\n"
        "4. फोटो, हस्ताक्षर एवं ज़रूरी दस्तावेज़ अपलोड करें और आवेदन शुल्क का भुगतान करें।\n"
        f"5. फॉर्म सबमिट करें और अंतिम तिथि {last} से पहले उसका प्रिंट सुरक्षित रख लें।"
    )


def _selection_process(v: dict) -> str:
    return (
        "चयन प्रक्रिया:\n"
        "उम्मीदवारों का चयन सामान्यतः निम्न चरणों के आधार पर किया जाता है — लिखित परीक्षा, "
        "कौशल/शारीरिक परीक्षा (यदि लागू हो), दस्तावेज़ सत्यापन और अंतिम मेरिट सूची। "
        "सटीक चयन चरण संबंधित विभाग की आधिकारिक अधिसूचना पर निर्भर करते हैं, इसलिए "
        "उम्मीदवार अधिसूचना में दिए गए चयन नियम अवश्य पढ़ें।"
    )


def build_templates(v: dict) -> dict:
    return {
        "hindi_intro": _intro(v),
        "hindi_description": _template_description(v),
        "hindi_how_to_apply": _how_to_apply(v),
        "hindi_selection_process": _selection_process(v),
    }


# ───────────────────────── LLM rewrite ─────────────────────────
_SYSTEM = (
    "You are a professional Hindi content writer for an Indian government-jobs "
    "(Sarkari Naukri) website. Rewrite the given English job description into "
    "clear, natural, simple Hindi (Devanagari) in your own words — do NOT translate "
    "word-for-word. Keep proper nouns, organisation names, exam names, dates, "
    "numbers, fees and website/URL text exactly as in the source (do not translate "
    "those). IMPORTANT: keep every markdown link EXACTLY in the form [text](url) — "
    "do not drop the (url) part, and translate only the visible text label. Present "
    "tabular data (like vacancy counts, important dates, branch-wise posts) as a "
    "clean GitHub-style markdown table with a header row and a `| --- | --- |` "
    "separator row. Use short paragraphs, '## ' for section headings and '* ' for "
    "bullet points. Output ONLY the Hindi content — no preamble, no English "
    "explanation."
)


async def rewrite_description_hindi(raw_text: str) -> str | None:
    """Rewrite an English description into Hindi via Gemini Flash. Returns None on failure."""
    text = _strip_html(raw_text)
    if not EMERGENT_KEY or len(text) < 30:
        return None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id="hindi-rewrite",
            system_message=_SYSTEM,
        ).with_model(*HINDI_MODEL)
        msg = UserMessage(text=f"Rewrite this government job description into natural Hindi:\n\n{text}")
        resp = await chat.send_message(msg)
        out = (resp if isinstance(resp, str) else getattr(resp, "content", "") or str(resp)).strip()
        return out or None
    except Exception as e:
        log.warning(f"Hindi LLM rewrite failed: {e}")
        return None


async def generate_hindi_content(v: dict) -> dict:
    """Hybrid generator: templates for structure + LLM for the description.
    Always returns all four Hindi fields plus metadata (never raises)."""
    fields = build_templates(v)
    source = "template"
    raw = v.get("content_html") or (v.get("structured") or {}).get("description") or v.get("description")
    llm_hindi = await rewrite_description_hindi(raw)
    if llm_hindi:
        fields["hindi_description"] = llm_hindi
        source = "llm"
    fields["hindi_source"] = source
    fields["hindi_generated_at"] = datetime.now(timezone.utc)
    return fields
