import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import JobAlertSubscribe from "@/components/JobAlertSubscribe";
import OrgAvatar from "@/components/OrgAvatar";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import HeroCarousel from "@/components/HeroCarousel";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import { FaSearch, FaExternalLinkAlt, FaSync, FaCalendarAlt, FaBriefcase, FaClock, FaChevronRight, FaGraduationCap, FaBuilding, FaFileAlt, FaGlobe, FaShareAlt, FaBookmark, FaRegBookmark, FaMapMarkerAlt, FaWhatsapp, FaUsers, FaArrowRight, FaTimes } from "react-icons/fa";
import { WHATSAPP_CHANNEL_URL } from "@/lib/whatsapp";
import ShareModal from "@/components/poster/ShareModal";
import SEO from "@/components/SEO";

const extractPostsFromText = (str) =>
  str && String(str).match(/(\d[\d,]*)\s*(post|vacan|seat)/i)?.[1];

const toPosterVacancy = (v) => {
  const s = v.structured || {};
  const highlights = [];
  if (v.post_name) highlights.push(`Post: ${v.post_name}`);
  if (v.qualification) highlights.push(v.qualification);
  if (s.application_fee) highlights.push(`Fee: ${s.application_fee}`);
  if (s.salary) highlights.push(`Salary: ${s.salary}`);
  highlights.push("For More Details Read Official Notification");
  const totalPosts =
    (s.total_posts && String(s.total_posts).match(/\d[\d,]*/)?.[0]) ||
    extractPostsFromText(v.post_name) ||
    extractPostsFromText(v.title) ||
    s.total_posts ||
    "As per notification";
  return {
    id: v.id,
    jobTitle: v.post_name || v.title || "Government Vacancy",
    organization: v.organization || v.title || "—",
    totalPosts,
    qualification: v.qualification || "As per notification",
    lastDate: v.last_date_text || s.apply_end || "As per notification",
    lastDateNote: "",
    jobType: v.application_mode === "offline" ? "Offline Form Job"
           : v.application_mode === "online" ? "Online Form Job"
           : "Government Job",
    location: s.location || "As per notification",
    selectionProcess: s.selection_process || "As per official notification",
    highlights: highlights.slice(0, 5),
  };
};

const numPosts = (v) => {
  const raw = v.structured?.total_posts_num || v.structured?.total_posts ||
    (String(v.post_name || v.title || "").match(/(\d[\d,]*)\s*(?:posts?|vacanc|seat)/i)?.[1]);
  return raw ? (parseInt(String(raw).replace(/[^\d]/g, ""), 10) || 0) : 0;
};
const isHaryana = (v) => v.state === "haryana" ||
  /haryana|हरियाणा/i.test(`${v.title || ""} ${v.post_name || ""} ${v.organization || ""}`);

const CAT_LABELS = {
  all: { hi: "सभी", en: "All" },
  admit_card: { hi: "एडमिट कार्ड", en: "Admit Card" },
  result: { hi: "रिज़ल्ट", en: "Result" },
  ssc: { hi: "SSC", en: "SSC" },
  railway: { hi: "रेलवे", en: "Railway" },
  bank: { hi: "बैंक", en: "Bank" },
  police: { hi: "पुलिस", en: "Police" },
  upsc: { hi: "UPSC", en: "UPSC" },
  defence: { hi: "रक्षा", en: "Defence" },
  teaching: { hi: "शिक्षक", en: "Teacher" },
  medical: { hi: "मेडिकल", en: "Medical" },
  psu: { hi: "PSU", en: "PSU" },
  haryana: { hi: "हरियाणा", en: "Haryana" },
  other: { hi: "अन्य", en: "Other" },
};

const QUALIFICATIONS = [
  { key: "all", hi: "सभी योग्यता", en: "All Qualifications" },
  { key: "10th", hi: "10वीं", en: "10th" },
  { key: "12th", hi: "12वीं", en: "12th" },
  { key: "iti", hi: "ITI", en: "ITI" },
  { key: "diploma", hi: "डिप्लोमा", en: "Diploma" },
  { key: "graduate", hi: "स्नातक", en: "Graduate" },
  { key: "engineer", hi: "इंजीनियरिंग", en: "B.Tech/B.E" },
  { key: "post", hi: "पोस्ट ग्रेजुएट", en: "Post Graduate" },
];

const STATES = [
  { key: "all",              hi: "सभी राज्य",         en: "All States" },
  { key: "haryana",          hi: "हरियाणा",          en: "Haryana" },
  { key: "delhi",            hi: "दिल्ली",           en: "Delhi" },
  { key: "punjab",           hi: "पंजाब",            en: "Punjab" },
  { key: "rajasthan",        hi: "राजस्थान",         en: "Rajasthan" },
  { key: "chandigarh",       hi: "चंडीगढ़",          en: "Chandigarh" },
  { key: "himachal-pradesh", hi: "हिमाचल प्रदेश",     en: "Himachal Pradesh" },
  { key: "uttarakhand",      hi: "उत्तराखंड",        en: "Uttarakhand" },
  { key: "uttar-pradesh",    hi: "उत्तर प्रदेश",      en: "Uttar Pradesh" },
  { key: "madhya-pradesh",   hi: "मध्य प्रदेश",       en: "Madhya Pradesh" },
  { key: "bihar",            hi: "बिहार",            en: "Bihar" },
  { key: "jharkhand",        hi: "झारखंड",          en: "Jharkhand" },
  { key: "gujarat",          hi: "गुजरात",          en: "Gujarat" },
  { key: "maharashtra",      hi: "महाराष्ट्र",       en: "Maharashtra" },
  { key: "karnataka",        hi: "कर्नाटक",         en: "Karnataka" },
  { key: "tamil-nadu",       hi: "तमिलनाडु",        en: "Tamil Nadu" },
  { key: "kerala",           hi: "केरल",            en: "Kerala" },
  { key: "andhra-pradesh",   hi: "आंध्र प्रदेश",      en: "Andhra Pradesh" },
  { key: "telangana",        hi: "तेलंगाना",         en: "Telangana" },
  { key: "west-bengal",      hi: "पश्चिम बंगाल",      en: "West Bengal" },
  { key: "odisha",           hi: "ओडिशा",           en: "Odisha" },
  { key: "chhattisgarh",     hi: "छत्तीसगढ़",        en: "Chhattisgarh" },
  { key: "assam",            hi: "असम",             en: "Assam" },
  { key: "jammu-kashmir",    hi: "जम्मू-कश्मीर",     en: "Jammu & Kashmir" },
];

// Short state codes for FreeJobAlert-style pills
const STATE_CODES = {
  all: "ALL", haryana: "HR", delhi: "DL", punjab: "PB", rajasthan: "RJ", chandigarh: "CH",
  "himachal-pradesh": "HP", uttarakhand: "UK", "uttar-pradesh": "UP", "madhya-pradesh": "MP",
  bihar: "BR", jharkhand: "JH", gujarat: "GJ", maharashtra: "MH", karnataka: "KA",
  "tamil-nadu": "TN", kerala: "KL", "andhra-pradesh": "AP", telangana: "TS",
  "west-bengal": "WB", odisha: "OD", chhattisgarh: "CG", assam: "AS", "jammu-kashmir": "JK",
};

// Local bookmarks (saved vacancies) — stored in localStorage under this key.
const BOOKMARK_KEY = "he_saved_vacancies_v1";
const readBookmarks = () => {
  try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || "[]"); }
  catch { return []; }
};
const writeBookmarks = (ids) => {
  try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(ids)); } catch {}
};

// Compute days remaining from a "dd-mm-yyyy" style string
const daysRemaining = (txt) => {
  if (!txt) return null;
  const m = txt.match(/(\d{1,2})[-./ ](\d{1,2})[-./ ](\d{2,4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const yyyy = y.length === 2 ? `20${y}` : y;
  const dt = new Date(`${yyyy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T23:59:59`);
  if (isNaN(dt.getTime())) return null;
  const diff = Math.ceil((dt - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};

const Vacancies = () => {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [category, setCategory] = useState("all");
  const [qualification, setQualification] = useState("all");
  const [mode, setMode] = useState("all"); // all | online | offline
  const [state, setState] = useState("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState(() => readBookmarks());
  const [q, setQ] = useState("");
  const [dq, setDq] = useState(""); // debounced query actually sent to the server
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [shareVac, setShareVac] = useState(null);
  const [latestJobs, setLatestJobs] = useState([]);

  const scrollToList = () => {
    const el = document.getElementById("all-vacancies");
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.pageYOffset - 90; // clear the sticky header
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  const toggleBookmark = (id) => {
    setBookmarks(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      writeBookmarks(next);
      const isSaved = next.includes(id);
      toast.success(isSaved
        ? (lang === "hi" ? "भर्ती सहेजी गई" : "Vacancy saved")
        : (lang === "hi" ? "बुकमार्क हटाया गया" : "Bookmark removed"));
      return next;
    });
  };

  const activeFilters = [category !== "all", qualification !== "all", state !== "all", mode !== "all", !!q].filter(Boolean).length;
  const clearFilters = () => { setCategory("all"); setQualification("all"); setState("all"); setMode("all"); setQ(""); setPage(1); };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (qualification !== "all") params.set("qualification", qualification);
      if (mode !== "all") params.set("mode", mode);
      if (state !== "all") params.set("state", state);
      if (dq) params.set("q", dq);
      params.set("page", String(page));
      params.set("per_page", "20");
      const [r1, r2] = await Promise.all([
        api.get(`/vacancies?${params.toString()}`),
        api.get(`/vacancies/stats`),
      ]);
      const payload = r1.data;
      const list = Array.isArray(payload) ? payload : payload.items || [];
      setItems(list);
      setPages(Array.isArray(payload) ? 1 : payload.pages || 1);
      setTotal(Array.isArray(payload) ? list.length : payload.total ?? list.length);
      setStats(r2.data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category, qualification, mode, state, page, dq]);
  useEffect(() => { setPage(1); }, [category, qualification, mode, state, dq]);

  // Debounce the search box → server-side search across the FULL dataset
  // (not just the 20 already-loaded rows). Fixes "gds / india post / gramin dak"
  // not appearing when the match lives on a later page.
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  // Latest vacancies for the "New Updates" strip (always unfiltered)
  useEffect(() => {
    api.get("/vacancies", { params: { page: 1, per_page: 12 } })
      .then((r) => setLatestJobs(Array.isArray(r.data) ? r.data : r.data?.items || []))
      .catch(() => {});
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const { data } = await api.post("/admin/vacancies/refresh");
      toast.success(`${lang === "hi" ? "अपडेट हो गया" : "Refreshed"}: +${data.new_added} new · ${data.total} total`);
      await load();
    } catch (e) {
      toast.error(e.response?.status === 403 ? "Admin only" : "Refresh failed");
    } finally { setRefreshing(false); }
  };

  const filtered = useMemo(() => {
    // Dedupe by URL to guarantee no duplicate cards even if the DB has near-duplicates
    const seen = new Set();
    const list = [];
    for (const it of items) {
      const key = it.url || it.id;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(it);
    }
    // mode is filtered server-side; text search now also runs server-side (dq),
    // so we only apply saved-only + dedupe on the client.
    let base = list;
    if (savedOnly) {
      base = base.filter(i => bookmarks.includes(i.id));
    }
    return base;
  }, [items, savedOnly, bookmarks]);

  // Mode counts come from DB stats (full dataset) — matches category counter above.
  const modeCounts = useMemo(() => {
    const all = stats?.total ?? 0;
    const online = stats?.by_mode?.online ?? 0;
    const offline = stats?.by_mode?.offline ?? 0;
    const other = Math.max(0, all - online - offline);
    return { all, online, offline, other };
  }, [stats]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" data-testid="vacancies-page">
      <SEO seoKey="seo:vacancies" path="/" />
      <HeroCarousel />
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="section-eyebrow">Live Jobs Feed</div>
          <h1 className="section-title !text-3xl md:!text-4xl">
            {lang === "hi" ? (<>ताज़ा <span className="text-amber-400">सरकारी भर्तियाँ</span></>) : (<>Latest <span className="text-amber-400">Government Vacancies</span></>)}
          </h1>
          <p className="hidden text-slate-400 mt-2 text-sm">
            {lang === "hi" ? "हर 1 घंटे में automatic update।" : "Auto-updated every hour."}
            {stats?.last_updated && (
              <span className="ml-2 text-emerald-400"><FaClock className="inline mr-1" /> {new Date(stats.last_updated).toLocaleString()}</span>
            )}
          </p>
        </div>
      </div>

      {/* Job Alert Subscription (Free) */}
      <JobAlertSubscribe />

      {/* New Updates — latest vacancies quick list */}
      <div className="glass mb-6 overflow-hidden" data-testid="new-updates-section">
        <div className="px-5 pt-4 pb-1 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex items-center gap-3">
            <div>
              <h2 className="section-title !text-xl sm:!text-2xl leading-tight flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                {lang === "hi" ? (<>नई <span className="text-amber-400">अपडेट्स</span></>) : (<>New <span className="text-amber-400">Updates</span></>)}
              </h2>
              <p className="text-slate-400 text-[11px] sm:text-xs pl-[18px]">
                {lang === "hi" ? "आज की ताज़ा सरकारी भर्ती notifications — पूरे भारत से" : "Today's latest government job notifications across India"}
              </p>
            </div>
          </div>
          <PushSubscribeButton lang={lang} className="!bg-emerald-500/10 !border-emerald-500/30 text-emerald-400 hover:!bg-emerald-500/20" />
        </div>
        <div className="px-4 sm:px-5 py-4">
          {latestJobs.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[...Array(12)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)}
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...latestJobs]
                .sort((a, b) => (isHaryana(b) - isHaryana(a)) || (numPosts(b) - numPosts(a)))
                .slice(0, 12).map((v, i) => {
                const posts = v.structured?.total_posts_num || v.structured?.total_posts ||
                  (String(v.post_name || v.title || "").match(/(\d[\d,]*)\s*(?:posts?|vacanc|seat)/i)?.[1]);
                return (
                <li key={v.id || i}>
                  <Link
                    to={`/vacancies/${v.id}`}
                    className={`nu-card group nu-c${i % 6}`}
                    data-testid={`new-update-${i}`}
                  >
                    <div className="flex items-start gap-3">
                      <OrgAvatar name={v.organization || v.post_name || v.title} />
                      <div className="min-w-0 flex-1">
                        <div className="nu-title line-clamp-2">{v.post_name || v.title}</div>
                        <div className="nu-sub line-clamp-2 mt-1">
                          {v.organization || v.qualification || (lang === "hi" ? "सरकारी भर्ती नोटिफिकेशन" : "Government job notification")}
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5 min-w-0">
                        {posts && (
                          <span className="nu-pill"><FaUsers className="text-[10px]" /> {posts} Posts</span>
                        )}
                        {v.qualification && (
                          <span className="nu-pill nu-pill-info"><FaGraduationCap className="text-[10px] shrink-0" /> <span className="truncate max-w-[150px]">{v.qualification}</span></span>
                        )}
                        {v.last_date_text && (
                          <span className="nu-pill nu-pill-date"><FaCalendarAlt className="text-[10px] shrink-0" /> {v.last_date_text}</span>
                        )}
                        {!posts && !v.qualification && !v.last_date_text && (
                          <span className="nu-pill">{lang === "hi" ? "विवरण देखें" : "View details"}</span>
                        )}
                      </div>
                      <FaArrowRight className="nu-arrow text-sm shrink-0" />
                    </div>
                  </Link>
                </li>
                );
              })}
            </ul>
          )}
          <div className="text-center mt-4">
            <button
              onClick={scrollToList}
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-sm px-8 py-2.5 rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 transition-all duration-200"
              data-testid="new-updates-view-all"
            >
              {lang === "hi" ? "सभी भर्तियाँ देखें" : "View All Vacancies"}
              <FaChevronRight className="text-xs group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Channel banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] p-[1px]" data-testid="whatsapp-banner">
        <div className="wa-banner rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex items-center gap-3">
            <span className="wa-banner-icon w-12 h-12 rounded-full bg-white text-[#075E54] grid place-items-center text-2xl shrink-0"><FaWhatsapp /></span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-white font-extrabold text-sm sm:text-base">{lang === "hi" ? "हर नई भर्ती की Instant Alert" : "Instant Alerts for Every New Vacancy"}</div>
                <span className="wa-free-pill">{lang === "hi" ? "FREE" : "FREE"}</span>
              </div>
              <div className="text-white/80 text-xs">{lang === "hi" ? "WhatsApp चैनल join करें — summary सीधे आपके phone पर" : "Join our WhatsApp Channel — summaries straight to your phone"}</div>
            </div>
          </div>
          <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noreferrer" className="wa-pop shrink-0 inline-flex items-center gap-2 bg-white text-[#075E54] text-sm font-extrabold px-5 py-2.5 rounded-full hover:bg-emerald-50" data-testid="banner-join-whatsapp-button">
            <FaWhatsapp /> {lang === "hi" ? "WhatsApp Channel Join करें" : "Join WhatsApp Channel"}
          </a>
        </div>
      </div>

      {/* Search + Filters — premium panel with subtle gradient border */}
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-emerald-500/15 via-transparent to-emerald-500/10 mb-6" data-testid="vacancies-filter-panel">
        <div className="glass-strong rounded-2xl p-5 space-y-4 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-amber-500/8 blur-3xl pointer-events-none"></div>
          <div className="relative flex flex-col md:flex-row gap-3">
            <form onSubmit={(e) => { e.preventDefault(); if (page !== 1) setPage(1); else load(); }} className="input-icon-wrap flex-1">
              <FaSearch className="icon" />
              <input className="input" placeholder={lang === "hi" ? "खोजें… (SSC, PNB, teacher…)" : "Search… (SSC, PNB, teacher…)"}
                value={q} onChange={(e) => setQ(e.target.value)} data-testid="vacancies-search" />
            </form>
            <select
              value={qualification}
              onChange={(e) => { setQualification(e.target.value); setPage(1); }}
              className="input md:w-56"
              data-testid="vacancies-qualification-filter"
            >
              {QUALIFICATIONS.map(qOpt => (
                <option key={qOpt.key} value={qOpt.key}>{lang === "hi" ? qOpt.hi : qOpt.en}</option>
              ))}
            </select>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); scrollToList(); }}
              className="input md:w-48"
              data-testid="vacancies-category-filter"
            >
              {Object.entries(CAT_LABELS).filter(([k]) => k !== "haryana").map(([k, v]) => (
                <option key={k} value={k}>{lang === "hi" ? v.hi : v.en}</option>
              ))}
            </select>
            <select
              value={state}
              onChange={(e) => { setState(e.target.value); setPage(1); scrollToList(); }}
              className="input md:w-48"
              data-testid="vacancies-state-filter"
            >
              {STATES.map((s) => (
                <option key={s.key} value={s.key}>{lang === "hi" ? s.hi : s.en}</option>
              ))}
            </select>
          </div>
          {activeFilters > 0 && (
            <div className="relative flex items-center justify-between gap-3 flex-wrap text-xs" data-testid="vacancies-active-filters">
              <span className="text-slate-400">
                {lang === "hi" ? `${activeFilters} फ़िल्टर लागू` : `${activeFilters} filter${activeFilters > 1 ? "s" : ""} applied`}
                {!loading && <> · {lang === "hi" ? `${total} भर्तियाँ मिलीं` : `${total} vacancies found`}</>}
              </span>
              <button type="button" onClick={clearFilters} className="chip !mt-0 hover:!bg-red-500/10 hover:!text-red-400 hover:!border-red-500/30" data-testid="vacancies-clear-filters">
                <FaTimes className="text-[10px]" /> {lang === "hi" ? "सभी फ़िल्टर हटाएँ" : "Remove all filters"}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Anchor for scroll-to-list */}
      <div id="all-vacancies" className="scroll-mt-28 mb-2"></div>

      {/* Vacancy list */}
      {loading ? (
        <div className="glass p-10 text-center text-slate-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="glass p-10 text-center text-slate-500">
          <FaBriefcase className="text-4xl mx-auto mb-3 opacity-40" />
          {lang === "hi" ? "कोई भर्ती नहीं मिली।" : "No vacancies found."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="vacancies-list">
          {filtered.map((v, i) => {
            const days = daysRemaining(v.last_date_text);
            const urgent = days !== null && days >= 0 && days <= 3;
            const expired = (v.is_expired === true) || (days !== null && days < 0);
            return (
              <Link key={v.id || v.url + i} to={`/vacancies/${v.id}`}
                className={`glass p-4 hover:border-emerald-500/40 transition group block relative vac-accent vac-c${i % 6} ${expired ? "opacity-60" : ""} ${urgent ? "ring-2 ring-red-500/40" : ""}`}
                data-testid={`vacancy-${i}`}>
                {/* URGENT / EXPIRED banner — bright, top strip so it's the first thing users notice */}
                {expired && (
                  <div className="absolute -top-2 left-3 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[10px] font-bold uppercase tracking-widest shadow" data-testid={`vacancy-expired-${i}`}>
                    <FaClock className="text-[10px]" /> {lang === "hi" ? "समाप्त" : "Expired"}
                  </div>
                )}
                {urgent && !expired && (
                  <div className="absolute -top-2 left-3 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-lg shadow-red-500/40 animate-pulse" data-testid={`vacancy-urgent-${i}`}>
                    <FaClock className="text-[10px]" />
                    {days === 0
                      ? (lang === "hi" ? "आज अंतिम दिन!" : "LAST DAY!")
                      : (lang === "hi" ? `केवल ${days} दिन बाकी` : `Only ${days} day${days === 1 ? "" : "s"} left`)}
                  </div>
                )}
                {/* Share Poster floating button — pill style so users understand it's a poster share */}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShareVac(toPosterVacancy(v)); }}
                  className="chip absolute top-2 right-2 !text-[10px] !mt-0 !mr-0 z-10 hover:!bg-emerald-500/15 hover:scale-105 transition-transform"
                  data-testid={`vacancy-share-${i}`}
                  title={lang === "hi" ? "पोस्टर बनाएँ और शेयर करें" : "Generate poster & share"}
                  aria-label="Share vacancy poster"
                >
                  <FaShareAlt className="text-[10px]" />
                  <span className="tracking-wide">{lang === "hi" ? "पोस्टर" : "POSTER"}</span>
                </button>
                {/* Save / bookmark toggle — sits just under the share pill so it's still thumb-friendly */}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(v.id); }}
                  className={`absolute top-10 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full z-10 transition-all border shadow ${
                    bookmarks.includes(v.id)
                      ? "bg-amber-500 text-white border-amber-300 hover:bg-amber-600"
                      : "bg-white/90 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-600"
                  }`}
                  data-testid={`vacancy-save-${i}`}
                  aria-pressed={bookmarks.includes(v.id)}
                  title={bookmarks.includes(v.id)
                    ? (lang === "hi" ? "बुकमार्क हटाएँ" : "Remove bookmark")
                    : (lang === "hi" ? "बाद के लिए सहेजें" : "Save for later")}
                >
                  {bookmarks.includes(v.id) ? <FaBookmark className="text-[11px]" /> : <FaRegBookmark className="text-[11px]" />}
                </button>
                <div className="flex items-start justify-between gap-2 mb-2 pr-10">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="chip !text-[10px] uppercase">{CAT_LABELS[v.category]?.[lang] || v.category || "Job"}</span>
                    {v.state && (
                      <span className="chip !text-[10px] !bg-fuchsia-500/10 !text-fuchsia-700 !border-fuchsia-500/30" data-testid={`vacancy-state-${i}`}>
                        <FaMapMarkerAlt className="inline mr-1 text-[9px]" />
                        {STATES.find(s => s.key === v.state)?.[lang] || v.state}
                      </span>
                    )}
                    {v.organization && (
                      <span className="chip !text-[10px] !bg-sky-500/10 !text-sky-300 !border-sky-500/30">
                        <FaBuilding className="inline mr-1 text-[9px]" />{v.organization}
                      </span>
                    )}
                    {v.application_mode === "offline" && (
                      <span className="chip !text-[10px] !bg-amber-500/15 !text-amber-300 !border-amber-500/40" data-testid={`vacancy-mode-offline-${i}`}>
                        <FaFileAlt className="inline mr-1 text-[9px]" /> {lang === "hi" ? "ऑफलाइन फॉर्म" : "Offline Form"}
                      </span>
                    )}
                    {v.application_mode === "online" && (
                      <span className="chip !text-[10px] !bg-emerald-500/10 !text-emerald-300 !border-emerald-500/30" data-testid={`vacancy-mode-online-${i}`}>
                        <FaGlobe className="inline mr-1 text-[9px]" /> {lang === "hi" ? "ऑनलाइन फॉर्म" : "Online Form"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="font-semibold text-white text-sm mb-2 leading-snug line-clamp-3">
                  {v.post_name || v.title}
                </div>
                {v.qualification && (
                  <div className="text-[11px] text-slate-400 mb-2 line-clamp-1">
                    <FaGraduationCap className="inline mr-1 text-emerald-400" />{v.qualification}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  {v.last_date_text && (
                    <span className={urgent ? "text-red-400 font-semibold" : expired ? "text-slate-600 line-through" : ""}>
                      <FaCalendarAlt className="inline mr-1 text-amber-400" /> {v.last_date_text}
                      {days !== null && days >= 0 && !expired && (
                        <span className={`ml-1 ${urgent ? "text-red-400" : "text-emerald-400"}`}>
                          ({days === 0 ? (lang === "hi" ? "आज" : "today") : lang === "hi" ? `${days} दिन बाकी` : `${days}d left`})
                        </span>
                      )}
                      {expired && <span className="ml-1">({lang === "hi" ? "समाप्त" : "closed"})</span>}
                    </span>
                  )}
                  <span className="ml-auto text-emerald-400">{lang === "hi" ? "विवरण देखें" : "View Details"} <FaChevronRight className="inline text-[10px]" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination — 20 vacancies per page */}
      {pages > 1 && !loading && (
        <div className="mt-8 flex items-center justify-center gap-2 flex-wrap" data-testid="jobs-pagination">
          <button onClick={() => { setPage((p) => Math.max(1, p - 1)); scrollToList(); }} disabled={page <= 1} className="chip disabled:opacity-40" data-testid="jobs-pagination-previous-button">
            {lang === "hi" ? "← पिछला" : "← Prev"}
          </button>
          {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
            const start = Math.min(Math.max(1, page - 3), Math.max(1, pages - 6));
            const p = start + i;
            if (p > pages) return null;
            return (
              <button key={p} onClick={() => { setPage(p); scrollToList(); }} className={`chip ${p === page ? "!bg-emerald-500 !text-white !border-emerald-400" : ""}`} data-testid={`jobs-pagination-page-${p}`}>{p}</button>
            );
          })}
          <button onClick={() => { setPage((p) => Math.min(pages, p + 1)); scrollToList(); }} disabled={page >= pages} className="chip disabled:opacity-40" data-testid="jobs-pagination-next-button">
            {lang === "hi" ? "अगला →" : "Next →"}
          </button>
          <span className="text-xs text-slate-500 ml-2">{lang === "hi" ? `पेज ${page}/${pages} · कुल ${total}` : `Page ${page}/${pages} · ${total} total`}</span>
        </div>
      )}

      {shareVac && (
        <ShareModal vacancy={shareVac} onClose={() => setShareVac(null)} />
      )}
    </div>
  );
};

export default Vacancies;
