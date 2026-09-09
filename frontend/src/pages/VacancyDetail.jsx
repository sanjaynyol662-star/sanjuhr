import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { enhanceHtml, renderRichText } from "@/lib/htmlContent";
import { useI18n } from "@/context/I18nContext";
import {
  FaArrowLeft, FaCalendarAlt, FaBuilding, FaGraduationCap, FaClock,
  FaFilePdf, FaExternalLinkAlt, FaRegClock, FaBriefcase, FaShareAlt, FaCheckCircle,
  FaUsers, FaRupeeSign, FaMoneyBillWave, FaListUl, FaMapMarkerAlt, FaUserCheck,
  FaWhatsapp, FaGlobe, FaUserPlus, FaLanguage,
} from "react-icons/fa";
import SocialShare from "@/components/SocialShare";
import { toast } from "sonner";
import ShareModal from "@/components/poster/ShareModal";
import WhatsAppSummaryCard from "@/components/WhatsAppSummaryCard";
import SEO from "@/components/SEO";
import RawHead from "@/components/RawHead";
import Reviews from "@/components/Reviews";
import ChannelLinks from "@/components/ChannelLinks";

// Important-link labels stay in ENGLISH even on the Hindi page (Fix 2).
const KIND_META = {
  apply:        { hi: "Apply Online",             en: "Apply Online",             icon: FaCheckCircle,     cls: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15", iconCls: "text-emerald-400" },
  registration: { hi: "Registration",             en: "Registration",             icon: FaUserPlus,        cls: "", iconCls: "" },
  notification: { hi: "Official Notification",     en: "Official Notification",     icon: FaFilePdf,         cls: "", iconCls: "" },
  official:     { hi: "Official Website",          en: "Official Website",          icon: FaGlobe,           cls: "bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/15",           iconCls: "text-sky-400" },
};

const daysRemaining = (txt) => {
  if (!txt) return null;
  const m = txt.match(/(\d{1,2})[-./ ](\d{1,2})[-./ ](\d{2,4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const yyyy = y.length === 2 ? `20${y}` : y;
  const dt = new Date(`${yyyy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T23:59:59`);
  if (isNaN(dt.getTime())) return null;
  return Math.ceil((dt - new Date()) / (1000 * 60 * 60 * 24));
};

const VacancyDetail = () => {
  const { id } = useParams();
  const { lang: globalLang } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  // Per-page language toggle (Fix 4). URL `?lang=en` shows the English version;
  // default is Hindi. All labels below read this `lang` so the whole page flips.
  const [pageLang, setPageLang] = useState(
    searchParams.get("lang") === "en" ? "en" : (globalLang === "en" ? "en" : "hi")
  );
  const lang = pageLang;
  const [v, setV] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Keep the URL in sync so the choice is shareable / restorable, without reload.
  const switchLang = (next) => {
    setPageLang(next);
    const params = new URLSearchParams(searchParams);
    if (next === "en") params.set("lang", "en");
    else params.delete("lang");
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    const q = searchParams.get("lang");
    setPageLang(q === "en" ? "en" : "hi");
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/vacancies/${id}`)
      .then(({ data }) => alive && setV(data))
      .catch(() => alive && setError("not_found"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  const share = async () => {
    const shareData = {
      title: v?.title || "Government Vacancy",
      text: `${v?.post_name || v?.title} — ${v?.organization || ""}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(window.location.href); toast.success(lang === "hi" ? "लिंक कॉपी हुआ" : "Link copied"); }
    } catch {}
  };

  // Map our backend vacancy shape into the shape the ShareModal / Poster expects
  const posterVacancy = useMemo(() => {
    if (!v) return null;
    const s = v.structured || {};
    const highlights = [];
    if (v.post_name) highlights.push(`Post: ${v.post_name}`);
    if (v.qualification) highlights.push(v.qualification);
    if (s.application_fee) highlights.push(`Fee: ${s.application_fee}`);
    if (s.salary) highlights.push(`Salary: ${s.salary}`);
    highlights.push("For More Details Read Official Notification");
    return {
      id: v.id || id,
      jobTitle: v.post_name || v.title || "Government Vacancy",
      organization: v.organization || v.title || "—",
      totalPosts:
        (s.total_posts && String(s.total_posts).match(/\d[\d,]*/)?.[0]) ||
        (v.post_name && String(v.post_name).match(/(\d[\d,]*)\s*(post|vacan|seat)/i)?.[1]) ||
        (v.title && String(v.title).match(/(\d[\d,]*)\s*(post|vacan|seat)/i)?.[1]) ||
        s.total_posts ||
        "As per notification",
      qualification: v.qualification || "As per notification",
      lastDate: v.last_date_text || s.apply_end || "As per notification",
      lastDateNote: s.apply_end && s.apply_end !== v.last_date_text ? "Tentative" : "",
      jobType: v.application_mode === "offline"
        ? "Offline Form Job"
        : v.application_mode === "online"
          ? "Online Form Job"
          : "Government Job",
      location: s.location || "As per notification",
      selectionProcess: s.selection_process || "As per official notification",
      highlights: highlights.slice(0, 5),
    };
  }, [v, id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10" data-testid="vacancy-detail-loading">
        <div className="glass p-10 text-center text-slate-400">
          {lang === "hi" ? "विवरण लोड हो रहा है..." : "Loading vacancy details..."}
        </div>
      </div>
    );
  }

  if (error || !v) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10" data-testid="vacancy-detail-not-found">
        <Link to="/" className="link-mint inline-flex items-center gap-2 mb-4">
          <FaArrowLeft /> {lang === "hi" ? "सभी भर्तियाँ" : "All Vacancies"}
        </Link>
        <div className="glass p-10 text-center text-slate-400">
          <FaBriefcase className="text-4xl mx-auto mb-3 opacity-40" />
          {lang === "hi" ? "यह भर्ती नहीं मिली।" : "This vacancy was not found."}
        </div>
      </div>
    );
  }

  const days = daysRemaining(v.last_date_text);
  const urgent = days !== null && days >= 0 && days <= 3;
  const expired = days !== null && days < 0;

  // Parse posted / last date to ISO for JobPosting schema
  const toIso = (txt) => {
    if (!txt) return null;
    const m = txt.match(/(\d{1,2})[-./ ](\d{1,2})[-./ ](\d{2,4})/);
    if (!m) return null;
    const [, d, mo, y] = m;
    const yyyy = y.length === 2 ? `20${y}` : y;
    return `${yyyy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  };
  const hindiSchemaDesc = [v.hindi_intro, v.hindi_description, v.hindi_how_to_apply, v.hindi_selection_process]
    .filter(Boolean)
    .map((t) => String(t).split("\n").filter(Boolean).map((p) => `<p>${p}</p>`).join(""))
    .join("");
  const jobPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: v.post_name || v.title || "Government Vacancy",
    description: hindiSchemaDesc || ((v.title || v.post_name || "") + (v.qualification ? ` — Qualification: ${v.qualification}` : "")),
    identifier: {
      "@type": "PropertyValue",
      name: v.organization || "Government",
      value: v.id || id,
    },
    datePosted: toIso(v.post_date_text) || new Date().toISOString().slice(0, 10),
    validThrough: toIso(v.last_date_text) || undefined,
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: v.organization || "Government of India",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "IN",
      },
    },
    ...(v.qualification && {
      qualifications: v.qualification,
      educationRequirements: v.qualification,
    }),
    url: `https://hrdigitalservices.in/vacancies/${v.id || id}`,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10" data-testid="vacancy-detail-page">
      <SEO
        title={v.seo_title || `${v.post_name || v.title || "Vacancy"} — ${v.organization || "Govt Job"}`.slice(0, 90)}
        description={v.seo_description || `${v.post_name || v.title || "Government vacancy"}${v.organization ? ` at ${v.organization}` : ""}${v.last_date_text ? `. Last date: ${v.last_date_text}` : ""}${v.qualification ? `. Qualification: ${v.qualification}` : ""}.`.slice(0, 280)}
        keywords={v.focus_keyword || undefined}
        path={`/vacancies/${v.id || id}`}
        type="article"
        noindex={lang === "en"}
        jsonLd={jobPostingJsonLd}
      />
      {v.custom_head && <RawHead html={v.custom_head} />}
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Link to="/" className="link-mint inline-flex items-center gap-2 text-sm" data-testid="back-to-vacancies">
          <FaArrowLeft /> {lang === "hi" ? "सभी भर्तियाँ" : "All Vacancies"}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="chip hover:!bg-emerald-500/15 hover:scale-105 transition-transform"
            data-testid="share-vacancy"
            title={lang === "hi" ? "पोस्टर बनाएँ और शेयर करें" : "Generate poster & share"}
          >
            <FaShareAlt className="text-[11px]" />
            {lang === "hi" ? "पोस्टर शेयर" : "SHARE POSTER"}
          </button>
          <button onClick={share} className="chip hover:!bg-sky-500/10 hover:!text-sky-300" data-testid="share-link" title={lang === "hi" ? "लिंक कॉपी" : "Copy link"}>
            <FaWhatsapp className="inline mr-1" /> {lang === "hi" ? "लिंक" : "Link"}
          </button>
        </div>
      </div>

      <SocialShare title={v.post_name || v.title} text={v.organization || ""} lang={lang} className="mb-4" />

      {/* Bright Last-Date Reminder / Expired banner — first thing users see */}
      {expired ? (
        <div className="mb-5 rounded-xl border-2 border-red-500/60 bg-gradient-to-r from-red-950/50 to-red-900/40 p-4 flex items-center gap-3" data-testid="vacancy-expired-banner">
          <div className="w-11 h-11 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 flex items-center justify-center text-xl shrink-0">
            <FaClock />
          </div>
          <div className="flex-1">
            <div className="text-red-300 font-extrabold text-lg tracking-wide">
              {lang === "hi" ? "आवेदन की अंतिम तिथि समाप्त" : "APPLICATION DEADLINE EXPIRED"}
            </div>
            <div className="text-red-200/80 text-xs mt-0.5">
              {lang === "hi"
                ? `अंतिम तिथि ${v.last_date_text || "—"} थी। अब आवेदन स्वीकार नहीं हो सकता।`
                : `Last date was ${v.last_date_text || "—"}. Applications are no longer accepted.`}
            </div>
          </div>
        </div>
      ) : urgent && v.last_date_text ? (
        <div className="mb-5 rounded-xl border-2 border-red-500/60 bg-gradient-to-r from-red-500/15 via-orange-500/15 to-red-500/15 p-4 flex items-center gap-3 shadow-lg shadow-red-500/20 animate-pulse-slow" data-testid="vacancy-urgent-banner">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center text-xl shrink-0 shadow-lg shadow-red-500/40">
            <FaClock />
          </div>
          <div className="flex-1">
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-orange-300 font-extrabold text-lg tracking-wide uppercase">
              {days === 0
                ? (lang === "hi" ? "आज अंतिम दिन!" : "LAST DAY TO APPLY!")
                : days === 1
                  ? (lang === "hi" ? "कल अंतिम तिथि!" : "TOMORROW IS THE LAST DATE!")
                  : (lang === "hi" ? `केवल ${days} दिन बाकी` : `ONLY ${days} DAYS LEFT`)}
            </div>
            <div className="text-orange-200/90 text-xs mt-0.5">
              {lang === "hi"
                ? `अंतिम तिथि: ${v.last_date_text}। जल्दी आवेदन करें।`
                : `Last date: ${v.last_date_text}. Apply as soon as possible.`}
            </div>
          </div>
        </div>
      ) : days !== null && days > 3 && v.last_date_text ? (
        <div className="mb-5 rounded-xl border border-red-400/50 bg-red-500/[0.08] p-3 flex items-center gap-3" data-testid="vacancy-deadline-banner">
          <div className="w-9 h-9 rounded-full bg-red-500/20 border border-red-500/50 text-red-500 flex items-center justify-center shrink-0">
            <FaClock />
          </div>
          <div className="text-sm text-red-700 dark:text-red-200 font-semibold">
            <b className="font-bold">{lang === "hi" ? "अंतिम तिथि" : "Last Date"}: </b>
            <span className="text-red-800 dark:text-red-100">{v.last_date_text}</span>
            <span className="ml-2 text-red-500 dark:text-red-300 font-bold">
              ({lang === "hi" ? `${days} दिन बाकी` : `${days} days left`})
            </span>
          </div>
        </div>
      ) : null}

      {/* Header card */}
      <div className="glass p-6 mb-6" data-testid="vacancy-detail-header">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="chip uppercase !text-[10px]">{v.category || "Job"}</span>
          {v.organization && (
            <span className="chip !bg-sky-500/10 !text-sky-300 !border-sky-500/30">
              <FaBuilding className="inline mr-1" />{v.organization}
            </span>
          )}
          {urgent && !expired && (
            <span className="chip !bg-red-500/15 !text-red-300 !border-red-500/40 animate-pulse">
              {lang === "hi" ? "अंतिम मौका" : "Last Chance"}
            </span>
          )}
          {expired && (
            <span className="chip !bg-slate-500/15 !text-slate-400 !border-slate-500/30">
              {lang === "hi" ? "समाप्त" : "Closed"}
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-3" data-testid="vacancy-title">
          {v.heading || v.title}
        </h1>

        {/* Language toggle (Fix 4) — read this job in Hindi or English */}
        <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 p-1 mb-4" data-testid="lang-toggle">
          <FaLanguage className="text-slate-400 mx-2 shrink-0" />
          <button
            type="button"
            onClick={() => switchLang("hi")}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${lang === "hi" ? "bg-emerald-500 text-white shadow" : "text-slate-300 hover:text-white"}`}
            data-testid="lang-toggle-hi"
          >
            हिंदी में पढ़ें
          </button>
          <button
            type="button"
            onClick={() => switchLang("en")}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${lang === "en" ? "bg-emerald-500 text-white shadow" : "text-slate-300 hover:text-white"}`}
            data-testid="lang-toggle-en"
          >
            Read in English
          </button>
        </div>

        {(v.hindi_intro || v.english_intro || v.description) && (
          <div
            className="text-slate-300 text-sm md:text-base leading-relaxed mb-4 vacancy-article"
            data-testid="vacancy-description"
            dangerouslySetInnerHTML={{
              __html: lang === "en"
                ? (v.english_intro ? renderRichText(v.english_intro) : enhanceHtml(v.description))
                : (v.hindi_intro ? renderRichText(v.hindi_intro) : enhanceHtml(v.description)),
            }}
          />
        )}
      </div>

      {/* WhatsApp Smart Engine — auto summary + channel join */}
      <WhatsAppSummaryCard summary={v.whatsapp_summary} vacancy={v} lang={lang} />

      {/* Hero stat cards — the "at-a-glance" facts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" data-testid="vacancy-stats">
        {/* Total posts — hero */}
        <div className="stat-card stat-emerald md:col-span-1">
          <div className="stat-icon"><FaUsers /></div>
          <div className="stat-label">{lang === "hi" ? "कुल पद" : "Total Posts"}</div>
          <div className="stat-value">{v.structured?.total_posts_num ?? v.structured?.total_posts ?? "—"}</div>
        </div>
        {/* Apply start */}
        <div className="stat-card stat-sky">
          <div className="stat-icon"><FaRegClock /></div>
          <div className="stat-label">{lang === "hi" ? "आवेदन शुरू" : "Apply Start"}</div>
          <div className="stat-value stat-value-sm">
            {v.structured?.apply_start || v.post_date_text || "—"}
          </div>
        </div>
        {/* Last date */}
        <div className={`stat-card ${urgent ? "stat-red-glow" : "stat-amber"}`}>
          <div className="stat-icon"><FaCalendarAlt /></div>
          <div className="stat-label">{lang === "hi" ? "अंतिम तिथि" : "Last Date"}</div>
          <div className="stat-value stat-value-sm">
            {v.structured?.apply_end || v.last_date_text || "—"}
          </div>
          {days !== null && days >= 0 && !expired && (
            <div className={`stat-sub ${urgent ? "text-red-200" : "text-amber-200"}`}>
              {days === 0 ? (lang === "hi" ? "आज अंतिम" : "Today") : lang === "hi" ? `${days} दिन बाकी` : `${days}d left`}
            </div>
          )}
          {expired && <div className="stat-sub text-slate-400">{lang === "hi" ? "समाप्त" : "Closed"}</div>}
        </div>
        {/* Application Fee */}
        <div className="stat-card stat-violet">
          <div className="stat-icon"><FaRupeeSign /></div>
          <div className="stat-label">{lang === "hi" ? "आवेदन शुल्क" : "Application Fee"}</div>
          <div className="stat-value stat-value-xs">
            {v.structured?.application_fee ? v.structured.application_fee.split(" · ")[0] : "—"}
          </div>
          {v.structured?.application_fee?.includes(" · ") && (
            <div className="stat-sub">{lang === "hi" ? "और वर्ग" : "+ more"}</div>
          )}
        </div>
      </div>

      {/* Secondary details grid */}
      {(v.structured?.salary || v.structured?.age_limit || v.qualification || v.structured?.selection || v.structured?.job_location) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6" data-testid="vacancy-secondary">
          {v.structured?.salary && (
            <div className="detail-row">
              <div className="detail-icon bg-emerald-500/10 text-emerald-400"><FaMoneyBillWave /></div>
              <div className="flex-1 min-w-0">
                <div className="detail-label">{lang === "hi" ? "वेतन / पे स्केल" : "Salary / Pay Scale"}</div>
                <div className="detail-val">{v.structured.salary}</div>
              </div>
            </div>
          )}
          {v.qualification && (
            <div className="detail-row">
              <div className="detail-icon bg-sky-500/10 text-sky-400"><FaGraduationCap /></div>
              <div className="flex-1 min-w-0">
                <div className="detail-label">{lang === "hi" ? "शैक्षणिक योग्यता" : "Qualification"}</div>
                <div className="detail-val">{v.qualification}</div>
              </div>
            </div>
          )}
          {v.structured?.age_limit && (
            <div className="detail-row">
              <div className="detail-icon bg-amber-500/10 text-amber-400"><FaUserCheck /></div>
              <div className="flex-1 min-w-0">
                <div className="detail-label">{lang === "hi" ? "आयु सीमा" : "Age Limit"}</div>
                <div className="detail-val">{v.structured.age_limit}</div>
              </div>
            </div>
          )}
          {v.structured?.selection && (
            <div className="detail-row">
              <div className="detail-icon bg-violet-500/10 text-violet-400"><FaListUl /></div>
              <div className="flex-1 min-w-0">
                <div className="detail-label">{lang === "hi" ? "चयन प्रक्रिया" : "Selection Process"}</div>
                <div className="detail-val">{v.structured.selection}</div>
              </div>
            </div>
          )}
          {v.structured?.job_location && (
            <div className="detail-row">
              <div className="detail-icon bg-pink-500/10 text-pink-400"><FaMapMarkerAlt /></div>
              <div className="flex-1 min-w-0">
                <div className="detail-label">{lang === "hi" ? "नौकरी स्थान" : "Job Location"}</div>
                <div className="detail-val">{v.structured.job_location}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Application fee full breakdown (if multi-tier) */}
      {v.structured?.application_fee?.includes(" · ") && (
        <div className="glass p-5 mb-6" data-testid="fee-breakdown">
          <div className="section-eyebrow mb-3 flex items-center gap-2">
            <FaRupeeSign className="text-emerald-400" />{lang === "hi" ? "श्रेणीवार शुल्क" : "Fee Breakdown"}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2" data-testid="fee-breakdown-list">
            {v.structured.application_fee.split(" · ").map((f, i) => (
              <div key={i} className="fee-row px-3 py-2 rounded-lg text-xs flex items-start gap-2">
                <FaRupeeSign className="fee-row-icon mt-0.5 shrink-0" />
                <span className="fee-row-text">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual "Apply Now" button — surfaced when admin provided an apply_url
          (auto-scraped vacancies embed this inside important_links instead). */}
      {v.apply_url && v.source === "manual" && (
        <div className="glass p-5 mb-6" data-testid="vacancy-manual-apply">
          <div className="section-eyebrow mb-3">{lang === "hi" ? "आवेदन करें" : "Apply Now"}</div>
          <a
            href={v.apply_url}
            target="_blank"
            rel="noreferrer nofollow"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/30"
            data-testid="vacancy-manual-apply-btn"
          >
            {lang === "hi" ? "अभी आवेदन करें" : "Apply Now"}
            <FaExternalLinkAlt className="text-xs" />
          </a>
        </div>
      )}

      {/* Important action links */}
      {Array.isArray(v.important_links) && v.important_links.length > 0 && (
        <div className="glass p-5 mb-6" data-testid="vacancy-links">
          <div className="section-eyebrow mb-3">{lang === "hi" ? "महत्वपूर्ण लिंक" : "Important Links"}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {v.important_links.map((l, i) => {
              const href = l.href || l.url;
              const isPdf = l.type === "pdf" || (href || "").toLowerCase().split("?")[0].endsWith(".pdf");
              const meta = KIND_META[l.kind] || (isPdf ? KIND_META.notification : KIND_META.official);
              const label = meta.en;
              return (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="block w-full text-center px-6 py-4 rounded-2xl border border-slate-300 bg-white text-emerald-700 font-bold text-base md:text-lg transition hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5"
                  data-testid={`imp-link-${l.kind || l.type || "link"}-${i}`}
                >
                  {label}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Tags */}
      {Array.isArray(v.tags) && v.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6" data-testid="vacancy-tags">
          {v.tags.map((t, i) => (
            <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">#{t}</span>
          ))}
        </div>
      )}

      {/* Descriptive content (auto-generated: templates + AI rewrite) — flips with the toggle */}
      {lang === "hi"
        ? (v.hindi_description || v.hindi_how_to_apply || v.hindi_selection_process) && (
          <div className="glass p-6 mb-6" data-testid="vacancy-hindi">
            <div className="section-eyebrow mb-3">विवरण (हिंदी में)</div>
            {v.hindi_description && (
              <div className="mb-5" data-testid="hindi-description">
                <h3 className="font-display text-lg font-bold text-emerald-300 mb-2">पूरा विवरण</h3>
                <div className="vacancy-article text-sm" dangerouslySetInnerHTML={{ __html: renderRichText(v.hindi_description) }} />
              </div>
            )}
            {v.hindi_how_to_apply && (
              <div className="mb-5" data-testid="hindi-how-to-apply">
                <h3 className="font-display text-lg font-bold text-emerald-300 mb-2">आवेदन कैसे करें</h3>
                <div className="vacancy-article text-sm" dangerouslySetInnerHTML={{ __html: renderRichText(v.hindi_how_to_apply) }} />
              </div>
            )}
            {v.hindi_selection_process && (
              <div data-testid="hindi-selection-process">
                <h3 className="font-display text-lg font-bold text-emerald-300 mb-2">चयन प्रक्रिया</h3>
                <div className="vacancy-article text-sm" dangerouslySetInnerHTML={{ __html: renderRichText(v.hindi_selection_process) }} />
              </div>
            )}
          </div>
        )
        : (v.content_html || v.english_description || v.english_how_to_apply || v.english_selection_process || v.description) && (
          <div className="glass p-6 mb-6" data-testid="vacancy-english">
            <div className="section-eyebrow mb-3">Details (in English)</div>
            {(v.content_html || v.english_description || v.description) && (
              <div className="mb-5" data-testid="english-description">
                <h3 className="font-display text-lg font-bold text-emerald-300 mb-2">Full Description</h3>
                <div
                  className="vacancy-article text-sm"
                  dangerouslySetInnerHTML={{
                    __html: v.content_html
                      ? enhanceHtml(v.content_html)
                      : (v.english_description ? renderRichText(v.english_description) : enhanceHtml(v.description)),
                  }}
                />
              </div>
            )}
            {v.english_how_to_apply && (
              <div className="mb-5" data-testid="english-how-to-apply">
                <h3 className="font-display text-lg font-bold text-emerald-300 mb-2">How to Apply</h3>
                <div className="vacancy-article text-sm" dangerouslySetInnerHTML={{ __html: renderRichText(v.english_how_to_apply) }} />
              </div>
            )}
            {v.english_selection_process && (
              <div data-testid="english-selection-process">
                <h3 className="font-display text-lg font-bold text-emerald-300 mb-2">Selection Process</h3>
                <div className="vacancy-article text-sm" dangerouslySetInnerHTML={{ __html: renderRichText(v.english_selection_process) }} />
              </div>
            )}
          </div>
        )}

      {/* Fallback summary only when there is no rich content at all */}
      {!v.content_html && !v.hindi_description && v.row_text ? (
        <div className="glass p-6 mb-6">
          <div className="section-eyebrow mb-3">{lang === "hi" ? "सारांश" : "Summary"}</div>
          <p className="text-sm text-slate-300 leading-relaxed">{v.row_text}</p>
        </div>
      ) : null}

      {/* Meta footer */}
      <div className="text-xs text-slate-500 text-center flex items-center justify-center gap-4 flex-wrap">
        {v.fetched_at && (
          <span><FaClock className="inline mr-1" /> {lang === "hi" ? "अंतिम अपडेट" : "Last updated"}: {new Date(v.fetched_at).toLocaleString()}</span>
        )}
      </div>

      <Reviews targetType="vacancy" targetId={v.id || id} hi={lang === "hi"} />
      <ChannelLinks hi={lang === "hi"} />

      {/* Share poster modal */}
      {shareOpen && posterVacancy && (
        <ShareModal vacancy={posterVacancy} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
};

export default VacancyDetail;
