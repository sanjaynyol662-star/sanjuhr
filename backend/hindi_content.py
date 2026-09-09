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

# Bump this whenever the generation logic/prompt changes so cached (non-edited)
# auto-generated content is regenerated once on next view.
HINDI_CONTENT_VER = 2


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
    "अच्छी खबर! {org} ने {post} के पदों पर नई सरकारी भर्ती निकाली है। {posts_line}"
    "अगर आप सरकारी नौकरी का इंतज़ार कर रहे थे, तो आवेदन करने से पहले नीचे दी गई पात्रता, "
    "आवेदन प्रक्रिया और चयन प्रक्रिया एक बार ज़रूर पढ़ लें।",

    "सरकारी नौकरी की तलाश कर रहे उम्मीदवारों के लिए {org} की तरफ़ से {post} के लिए भर्ती आई है। "
    "{posts_line}इस पेज पर हमने इस भर्ती से जुड़ी सभी ज़रूरी बातें आसान हिंदी में समझा दी हैं, "
    "ताकि आपको कहीं और भटकना न पड़े।",

    "{post} के इच्छुक उम्मीदवारों के लिए {org} लेकर आया है एक शानदार मौका। "
    "{posts_line}ध्यान देने वाली बात यह है कि आवेदन करने से पहले Last Date और योग्यता की शर्तें "
    "एक बार ज़रूर जाँच लें।",

    "इस भर्ती में {org} ने {post} के पद के लिए आवेदन मांगे हैं। {posts_line}"
    "अगर आपने अभी तक आवेदन नहीं किया है तो देर न करें — आधिकारिक अधिसूचना के अनुसार समय रहते "
    "आवेदन प्रक्रिया पूरी कर लें।",
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


# ───────────────────────── English template engine (Fix 4) ─────────────────────────
# Plain English versions of the descriptive fields, used by the "Read in English"
# toggle on the job detail page. Structured facts stay identical; only the
# explanatory sentences are in English.
_EN_INTRO_VARIANTS = [
    "Good news! {org} has announced a new government recruitment for the post of {post}. "
    "{posts_line}If you have been waiting for a sarkari job, make sure to read the "
    "eligibility, application process and selection process carefully before you apply.",

    "{org} has released a recruitment for {post} for candidates looking for a government job. "
    "{posts_line}On this page we have explained everything important about this vacancy in "
    "simple language so you don't have to look anywhere else.",

    "{org} has brought a great opportunity for candidates interested in {post}. "
    "{posts_line}One important thing to note — do check the Last Date and eligibility "
    "conditions once before you apply.",

    "{org} has invited applications for the post of {post}. {posts_line}"
    "If you haven't applied yet, don't delay — complete the application process on time as "
    "per the official notification.",
]


def _en_intro(v: dict) -> str:
    post = _f(v, "post_name", "title", default="this recruitment")
    org = _f(v, "organization", default="the concerned department")
    posts = _clean_posts(v)
    posts_line = f"A total of {posts} posts are available in this recruitment. " if posts else ""
    seed = abs(hash(str(v.get("_id") or v.get("id") or post))) % len(_EN_INTRO_VARIANTS)
    return _EN_INTRO_VARIANTS[seed].format(post=post, org=org, posts_line=posts_line)


def _en_description(v: dict) -> str:
    post = _f(v, "post_name", "title", default="—")
    org = _f(v, "organization", default="—")
    posts = _clean_posts(v) or "See notification"
    qual = _f(v, "qualification", default="As per notification")
    last = _f(v, "last_date_text", default="To be announced")
    return (
        "Here are the key details of this recruitment at a glance:\n"
        f"• Post Name: {post}\n"
        f"• Recruiting Body: {org}\n"
        f"• Total Posts: {posts}\n"
        f"• Qualification: {qual}\n"
        f"• Last Date: {last}\n"
        "For detailed information about age limit, reservation and pay scale, candidates "
        "should read the Official Notification PDF."
    )


def _en_how_to_apply(v: dict) -> str:
    last = _f(v, "last_date_text", default="the specified Last Date")
    mode = (v.get("application_mode") or "").lower()
    if mode == "offline":
        return (
            "How to Apply (Offline):\n"
            "1. First read the official notification carefully and get the prescribed application form.\n"
            "2. Fill in all the required details correctly in the form.\n"
            "3. Attach self-attested copies of the necessary documents.\n"
            f"4. Send/submit the completed application to the given address before the Last Date {last}.\n"
            "5. Keep a copy of the application safe for future reference."
        )
    return (
        "How to Apply (Online):\n"
        "1. Visit the Official Website and read the notification carefully.\n"
        "2. Click on the Apply Online / Registration Link to register.\n"
        "3. Fill in your personal, educational and other required details.\n"
        "4. Upload your photo, signature and required documents, and pay the application fee.\n"
        f"5. Submit the Online Form and keep a printout safe before the Last Date {last}."
    )


def _en_selection_process(v: dict) -> str:
    return (
        "Selection Process:\n"
        "Candidates are usually selected based on the following stages — written exam, "
        "skill/physical test (if applicable), document verification and the final merit list. "
        "The exact selection stages depend on the department's official notification, so "
        "candidates must read the selection rules given in the notification."
    )


def build_english_templates(v: dict) -> dict:
    return {
        "english_intro": _en_intro(v),
        "english_description": _en_description(v),
        "english_how_to_apply": _en_how_to_apply(v),
        "english_selection_process": _en_selection_process(v),
    }



# ───────────────────────── English-word protection (Fix 2) ─────────────────────────
# These technical/official terms must ALWAYS stay in English — never Hindi
# transliteration. We give the LLM the rule in the prompt AND, as a safety net,
# run a post-processing pass that converts common Devanagari transliterations
# back to their English form.
KEEP_ENGLISH_TERMS = [
    "PDF", "Apply Online", "Apply Link", "Official Notification PDF",
    "Official Website", "Registration Link", "Online Form", "Admit Card",
    "Answer Key", "Result", "Syllabus", "Last Date", "Start Date",
]

# (regex-of-transliteration, correct-English) — case-insensitive on the English side.
_TERM_FIXES = [
    (r"पी\s*[.\-]?\s*डी\s*[.\-]?\s*एफ", "PDF"),
    (r"रजिस्ट्रेशन\s*लिंक", "Registration Link"),
    (r"रजिस्ट्रेशन", "Registration"),
    (r"अप्लाई\s*ऑनलाइन", "Apply Online"),
    (r"अप्लाई\s*लिंक", "Apply Link"),
    (r"ऑनलाइन\s*फ़?ॉर्म", "Online Form"),
    (r"ऑफ़?िशियल\s*वेबसाइट", "Official Website"),
    (r"ऑफ़?िशियल\s*नोटिफ़?िकेशन\s*पी\s*डी\s*एफ", "Official Notification PDF"),
    (r"नोटिफ़?िकेशन", "Notification"),
    (r"एडमिट\s*कार्ड", "Admit Card"),
    (r"आंसर\s*की\b", "Answer Key"),
    (r"उत्तर\s*कुंजी", "Answer Key"),
    (r"सिल[ेै]बस", "Syllabus"),
    (r"रिज़?ल्ट", "Result"),
    (r"लास्ट\s*डेट", "Last Date"),
    (r"स्टार्ट\s*डेट", "Start Date"),
]
_TERM_FIXES = [(re.compile(rx), repl) for rx, repl in _TERM_FIXES]


def fix_english_terms(text: str) -> str:
    """Convert accidental Hindi transliterations of technical/official terms
    back to their canonical English form."""
    if not text:
        return text
    for rx, repl in _TERM_FIXES:
        text = rx.sub(repl, text)
    return text


# ───────────────────────── LLM rewrite (Fix 2 + Fix 3) ─────────────────────────
_SYSTEM = (
    "You are an experienced Hindi content writer for a popular Indian "
    "government-jobs (Sarkari Naukri) website. Rewrite the given English job "
    "notification into warm, conversational, everyday Hindi (Devanagari) — as if a "
    "helpful friend is explaining the vacancy to a candidate. Do NOT translate "
    "word-for-word and do NOT sound like a textbook or a robot.\n\n"
    "TONE & STYLE RULES:\n"
    "* Use simple, spoken-style Hindi that a common reader easily understands.\n"
    "* Vary your sentence patterns — never reuse the same template structure.\n"
    "* Use natural connecting phrases like 'इस भर्ती में...', 'अगर आपने अभी तक "
    "आवेदन नहीं किया है तो...', 'ध्यान देने वाली बात यह है कि...', 'सबसे पहले...'.\n"
    "* Avoid heavy, formal, Sanskritised words; keep it friendly and readable.\n"
    "* Use short paragraphs, '## ' for section headings and '* ' for bullet points.\n\n"
    "ENGLISH-TERM RULES (VERY IMPORTANT):\n"
    "* Keep these technical / official terms in ENGLISH exactly — never write their "
    "Hindi transliteration: PDF, Apply Online, Apply Link, Official Notification PDF, "
    "Official Website, Registration Link, Online Form, Admit Card, Answer Key, Result, "
    "Syllabus, Last Date, Start Date.\n"
    "* Keep all proper nouns, organisation names, exam names, dates, numbers and fees "
    "exactly as in the source.\n"
    "* Keep every markdown link EXACTLY as [text](url) — do not drop the (url) part.\n"
    "* Present tabular data (vacancy counts, important dates, branch-wise posts) as a "
    "clean GitHub-style markdown table with a header row and a `| --- | --- |` "
    "separator row.\n\n"
    "Output ONLY the Hindi content — no preamble, no English explanation."
)

# Few-shot examples of the desired human, conversational Hindi voice (Fix 3).
_FEWSHOT = (
    "यहाँ दो उदाहरण दिए गए हैं जो बताते हैं कि लिखावट कैसी होनी चाहिए:\n\n"
    "उदाहरण 1:\n"
    "इस भर्ती में रेलवे विभाग ने कई पदों पर युवाओं को मौका दिया है। अगर आप 10वीं पास हैं "
    "और सरकारी नौकरी का इंतज़ार कर रहे थे, तो यह आपके लिए अच्छा अवसर है। आवेदन Apply Online "
    "मोड से करना है, इसलिए Last Date निकलने से पहले फॉर्म भर दें।\n\n"
    "उदाहरण 2:\n"
    "ध्यान देने वाली बात यह है कि इस बार आवेदन की प्रक्रिया पूरी तरह ऑनलाइन रखी गई है। "
    "सबसे पहले Official Website पर जाकर Registration Link खोलें, फिर अपनी जानकारी भरकर फॉर्म "
    "सबमिट कर दें। ज़रूरी दस्तावेज़ और Official Notification PDF पहले से पढ़ लेना बेहतर रहेगा।\n\n"
    "अब नीचे दी गई भर्ती को इसी अंदाज़ में हिंदी में दोबारा लिखें:"
)


async def rewrite_description_hindi(raw_text: str) -> str | None:
    """Rewrite an English description into natural, human Hindi via Gemini Flash.
    Returns None on failure."""
    text = _strip_html(raw_text)
    if not EMERGENT_KEY or len(text) < 30:
        return None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = (
            LlmChat(
                api_key=EMERGENT_KEY,
                session_id="hindi-rewrite",
                system_message=_SYSTEM,
            )
            .with_model(*HINDI_MODEL)
            .with_params(temperature=0.7)
        )
        msg = UserMessage(text=f"{_FEWSHOT}\n\n{text}")
        resp = await chat.send_message(msg)
        out = (resp if isinstance(resp, str) else getattr(resp, "content", "") or str(resp)).strip()
        out = fix_english_terms(out)
        return out or None
    except Exception as e:
        log.warning(f"Hindi LLM rewrite failed: {e}")
        return None


async def generate_hindi_content(v: dict) -> dict:
    """Hybrid generator: templates for structure + LLM for the description.
    Always returns all four Hindi fields, the English fields (for the toggle),
    plus metadata (never raises)."""
    fields = build_templates(v)
    fields.update(build_english_templates(v))
    source = "template"
    raw = v.get("content_html") or (v.get("structured") or {}).get("description") or v.get("description")
    llm_hindi = await rewrite_description_hindi(raw)
    if llm_hindi:
        fields["hindi_description"] = llm_hindi
        source = "llm"
    # Safety net: keep protected technical terms in English across all Hindi fields.
    for k in ("hindi_intro", "hindi_description", "hindi_how_to_apply", "hindi_selection_process"):
        if fields.get(k):
            fields[k] = fix_english_terms(fields[k])
    fields["hindi_source"] = source
    fields["hindi_generated_at"] = datetime.now(timezone.utc)
    fields["hindi_ver"] = HINDI_CONTENT_VER
    return fields
