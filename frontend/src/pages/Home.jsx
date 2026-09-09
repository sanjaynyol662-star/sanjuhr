import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";
import { S } from "@/lib/strings";
import api from "@/lib/api";
import Marquee from "react-fast-marquee";
import SolarCalculator from "@/components/SolarCalculator";
import SchemesInfo from "@/components/SchemesInfo";
import SEO from "@/components/SEO";
import { useContentKey } from "@/lib/siteContent";
import {
  FaSolarPanel, FaMoneyBillWave, FaFileSignature, FaSearchLocation, FaTools,
  FaCheckCircle, FaChevronRight,
  FaShieldAlt, FaBullhorn, FaFingerprint,
  FaBolt, FaHome, FaAward, FaHeadset, FaBriefcase,
  FaSun, FaHandshake, FaSeedling, FaWhatsapp, FaStar
} from "react-icons/fa";
import { FaIdCard } from "react-icons/fa";

const flowSteps = [
  { icon: FaSearchLocation, hi: "पूछताछ", en: "Enquiry" },
  { icon: FaHome, hi: "साइट सर्वे", en: "Site Survey" },
  { icon: FaFileSignature, hi: "सब्सिडी", en: "Subsidy Apply" },
  { icon: FaTools, hi: "इंस्टॉलेशन", en: "Installation" },
  { icon: FaShieldAlt, hi: "टेस्टिंग", en: "Testing" },
  { icon: FaHandshake, hi: "हैंडओवर", en: "Handover" },
  { icon: FaSun, hi: "बचत", en: "Savings" },
];

const services = [
  { icon: FaSearchLocation, hi: "सोलर परामर्श", en: "Solar Consultation", desc_hi: "आवश्यकता के अनुसार सही सिस्टम की जानकारी", desc_en: "Guidance to pick the right system for your needs", to: "/enquiry?service=Solar%20Consultation", accent: "emerald" },
  { icon: FaHome, hi: "साइट असेसमेंट", en: "Site Assessment", desc_hi: "छत की जगह, दिशा और छाया का मूल्यांकन", desc_en: "Roof space, orientation & shading evaluation", to: "/enquiry?service=Site%20Assessment", accent: "amber" },
  { icon: FaTools, hi: "सिस्टम प्लानिंग", en: "Solar System Planning", desc_hi: "क्षमता, लेआउट और उपकरण योजना", desc_en: "Capacity, layout & equipment planning", to: "/enquiry?service=Solar%20System%20Planning", accent: "emerald" },
  { icon: FaHandshake, hi: "इंस्टॉलेशन सहायता", en: "Installation Assistance", desc_hi: "अनुभवी टीम द्वारा सुरक्षित इंस्टॉलेशन", desc_en: "Safe installation by experienced team", to: "/enquiry?service=Installation%20Assistance", accent: "amber" },
  { icon: FaSolarPanel, hi: "सोलर योजना जानकारी", en: "Solar Scheme Information", desc_hi: "सरकारी योजनाओं की सामान्य जानकारी", desc_en: "General information about govt. solar schemes", to: "/enquiry?service=Solar%20Scheme%20Information", accent: "emerald" },
  { icon: FaHeadset, hi: "आफ्टर-सेल्स सहायता", en: "After-Sales Support", desc_hi: "इंस्टॉलेशन के बाद निरंतर सहायता", desc_en: "Continued support after installation", to: "/enquiry?service=After-Sales%20Support", accent: "amber" },
];

const HeroBrandCard = () => {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const highlights = [
    { hi: "सरकार अनुमोदित रूफटॉप सोलर वेंडर", en: "Govt. approved rooftop solar vendor" },
    { hi: "500+ सफल इंस्टॉलेशन", en: "500+ successful installations" },
    { hi: "पारदर्शी कोटेशन · कोई एडवांस नहीं", en: "Transparent quotation · No advance" },
    { hi: "अनुभवी आफ्टर-सेल्स सहायता", en: "Experienced after-sales support" },
  ];
  return (
    <div className="signin-card" data-testid="hero-brand-card">
      <div className="flex items-center justify-between mb-2">
        <span className="signin-pill">{hi ? "प्रमाणित वेंडर" : "Verified Vendor"}</span>
        <span className="text-[10px] text-blue-400 uppercase tracking-widest">Est. 2019</span>
      </div>
      <div className="signin-badge"><FaAward /></div>
      <h3 className="font-display text-2xl font-bold text-white mb-1">
        {hi ? "मुफ्त छत सर्वे बुक करें" : "Book a Free Rooftop Survey"}
      </h3>
      <p className="text-xs text-slate-400 mb-5">
        {hi ? "हमारी टीम 24 घंटे में आपसे संपर्क करेगी और पारदर्शी कोटेशन देगी।" : "Our team calls you within 24 hours with a transparent quotation."}
      </p>

      <ul className="space-y-2 mb-5">
        {highlights.map((h, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-300" data-testid={`hero-highlight-${i}`}>
            <FaCheckCircle className="text-blue-400 shrink-0" />
            <span>{hi ? h.hi : h.en}</span>
          </li>
        ))}
      </ul>

      <Link to="/enquiry" className="btn-mint w-full" data-testid="hero-enquiry-btn">
        <FaFileSignature /> {hi ? "सोलर पूछताछ" : "Solar Enquiry"} <FaChevronRight />
      </Link>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <a href="tel:8168762016" className="btn-outline-mint text-xs !py-2" data-testid="hero-call-btn">
          <FaHeadset /> {hi ? "कॉल करें" : "Call"}
        </a>
        <a href="https://wa.me/918168762016" target="_blank" rel="noreferrer" className="btn-outline-mint text-xs !py-2" data-testid="hero-whatsapp-btn">
          <FaWhatsapp /> WhatsApp
        </a>
      </div>

      <p className="text-[11px] text-slate-500 text-center mt-4 flex items-center justify-center gap-1">
        <FaShieldAlt className="text-blue-500" /> {hi ? "कोई एडवांस नहीं · पारदर्शी कोटेशन" : "No advance payment · Transparent quote"}
      </p>
    </div>
  );
};

const NewsMarquee = () => {
  const { lang } = useI18n();
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/notices").then(r => setItems(r.data)).catch(() => {}); }, []);
  if (!items.length) return null;
  return (
    <div className="news-strip" data-testid="notice-ticker">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">
        <span className="news-tag"><FaBullhorn /> {lang === "hi" ? "ताज़ा अपडेट" : "Latest Updates"}</span>
        <div className="flex-1 overflow-hidden">
          <Marquee pauseOnHover gradient={false} speed={45}>
            {items.map((n, i) => (
              <span key={n.id || i} className="news-item font-hindi">
                {lang === "hi" ? n.title_hi : n.title_en}
                {n.type === "important" && <span className="new-badge">NEW</span>}
                <span className="mx-4 text-blue-500/40">•</span>
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </div>
  );
};

// ─────────────────── Vacancies Preview (for students) ───────────────────
const VacanciesPreview = () => {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/vacancies?limit=6")
      .then(r => setItems(Array.isArray(r.data) ? r.data : (r.data.items || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 py-14" data-testid="vacancies-preview-section">
      <div className="glass-strong p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative">
          <div className="flex items-start md:items-end justify-between flex-wrap gap-4 mb-6">
            <div>
              <span className="category-pill mb-2 !bg-amber-500/15 !border-amber-500/40 !text-amber-300">
                <FaBullhorn className="mr-1" /> {hi ? "छात्रों के लिए" : "For Students"}
              </span>
              <h2 className="section-title !text-3xl md:!text-4xl mb-1" data-testid="vacancies-preview-title">
                {hi ? (<>ताज़ा <span className="text-amber-400">भर्तियाँ</span> · Job Alerts</>) : (<>Latest <span className="text-amber-400">Vacancies</span> · Job Alerts</>)}
              </h2>
              <p className="text-slate-300 mt-2 text-sm max-w-2xl">
                {hi
                  ? "सरकारी नौकरियों की ताज़ा जानकारी — पात्रता, अंतिम तिथि, आवेदन शुल्क और वेतन के साथ। छात्रों के लिए मुफ्त।"
                  : "Fresh government job updates — with eligibility, last date, fee & salary details. Free for students."}
              </p>
            </div>
            <Link to="/" className="btn-amber shrink-0" data-testid="vacancies-preview-view-all">
              <FaBriefcase /> {hi ? "सभी भर्तियाँ देखें" : "View All Vacancies"} <FaChevronRight />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass p-5 animate-pulse h-40" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="glass p-8 text-center text-slate-400" data-testid="vacancies-preview-empty">
              {hi ? "अभी कोई सक्रिय वेकेंसी नहीं। जल्द ही अपडेट होगी।" : "No active vacancies right now. Please check back soon."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.slice(0, 6).map((v, i) => (
                <Link
                  key={v.id || v.url || i}
                  to={`/vacancies/${v.id || v._id || ""}`}
                  className="glass p-5 hover:border-amber-500/50 transition-colors group flex flex-col"
                  data-testid={`vacancy-preview-card-${i}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                      <FaBriefcase />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase text-amber-400 font-semibold tracking-widest truncate">
                        {v.organization || v.org || "Govt. Job"}
                      </div>
                      <div className="font-display font-semibold text-white text-sm mt-0.5 line-clamp-2 group-hover:text-amber-300">
                        {v.post_name || v.title || v.heading || "Vacancy"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto text-[11px]">
                    {v.post_date_text && (
                      <div className="px-2 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300 truncate">
                        <b>Posted:</b> {v.post_date_text}
                      </div>
                    )}
                    {v.last_date_text && (
                      <div className="px-2 py-1.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 truncate">
                        <b>Last Date:</b> {v.last_date_text}
                      </div>
                    )}
                    {(v.qualification || v.qual) && (
                      <div className="px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-slate-300 truncate col-span-2">
                        <b>Qual:</b> {v.qualification || v.qual}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5 text-amber-400 text-xs font-semibold inline-flex items-center gap-1">
                    {hi ? "पूरी जानकारी देखें" : "View full details"} <FaChevronRight className="text-[10px]" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Bottom callout */}
          <div className="mt-6 p-4 rounded-xl bg-blue-500/[0.06] border border-blue-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-3" data-testid="vacancies-preview-alert-cta">
            <div className="flex items-center gap-3 text-sm text-blue-200">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0"><FaBullhorn /></div>
              <div>
                {hi
                  ? "नई भर्तियों की सूचना सीधे अपने ईमेल पर पाएँ।"
                  : "Get new vacancy alerts directly to your inbox."}
              </div>
            </div>
            <Link to="/vacancies" className="btn-outline-mint text-sm shrink-0" data-testid="vacancies-preview-subscribe-cta">
              {hi ? "जॉब अलर्ट सब्सक्राइब करें" : "Subscribe for Job Alerts"} <FaChevronRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const Home = () => {
  const { t, lang } = useI18n();
  const hero = useContentKey("content:hero");
  const heroBg = "https://images.unsplash.com/photo-1655300256335-beef51a914fe?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHw0fHxyb29mdG9wJTIwc29sYXIlMjBwYW5lbHMlMjBob21lfGVufDB8fHx8MTc4NTM4NzQzNHww&ixlib=rb-4.1.0&q=85";

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "HR Digital Services",
    image: "https://hrdigitalservices.in/og-cover.png",
    "@id": "https://hrdigitalservices.in/#localbusiness",
    url: "https://hrdigitalservices.in/",
    telephone: "+91-8168762016",
    priceRange: "₹₹",
    description:
      "Government-approved rooftop solar vendor in Kagdana, Sirsa. Consultation, site assessment, installation assistance and general information on government solar schemes. Also publishes latest government job vacancies for students.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "200 Mtr From Bus Stand, Begu-Bhadra Road, Kagdana",
      addressLocality: "Sirsa",
      addressRegion: "Haryana",
      postalCode: "125055",
      addressCountry: "IN",
    },
    areaServed: [
      { "@type": "State", name: "Haryana" },
      { "@type": "AdministrativeArea", name: "Sirsa District" },
    ],
    sameAs: [
      "https://wa.me/918168762016",
    ],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "19:00",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Rooftop Solar Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Solar Consultation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Site Assessment" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Solar System Planning" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Installation Assistance" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "After-Sales Support" } },
      ],
    },
  };

  return (
    <div id="main-content" data-testid="home-page">
      <SEO
        seoKey="seo:solar"
        path="/solar"
        jsonLd={localBusinessJsonLd}
      />
      {/* ─────────── HERO ─────────── */}
      <section className="hero-wrap" data-testid="hero-section">
        <div className="hero-bg" style={{ backgroundImage: `url(${heroBg})` }}></div>
        <div className="hero-overlay"></div>
        <div className="hero-vignette"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: title + flow */}
          <div className="lg:col-span-8 flex flex-col justify-center">
            <span className="category-pill mb-4" data-testid="hero-category-pill">
              {lang === "hi" ? "सरकार अनुमोदित रूफटॉप सोलर वेंडर" : "Govt. Approved Rooftop Solar Vendor"}
            </span>
            <h1 className="hero-title mb-4" data-testid="hero-heading">
              {(lang === "hi" ? hero.heading_hi : hero.heading_en)
                ? (lang === "hi" ? hero.heading_hi : hero.heading_en)
                : (lang === "hi" ? (<>
                    <span className="accent">रूफटॉप सोलर</span> के लिए एक विश्वसनीय भागीदार
                  </>) : (<>
                    A trusted partner for <span className="accent">rooftop solar</span>
                  </>))}
            </h1>
            <p className="text-lg text-slate-300/90 max-w-2xl mb-8" data-testid="hero-tagline">
              {(lang === "hi" ? hero.tagline_hi : hero.tagline_en)
                ? (lang === "hi" ? hero.tagline_hi : hero.tagline_en)
                : (lang === "hi"
                    ? "रूफटॉप सोलर परामर्श, इंस्टॉलेशन और सोलर समाधानों के लिए पेशेवर सहायता — कागदाना, सिरसा से।"
                    : "Professional assistance for rooftop solar consultation, installation and solar solutions — from Kagdana, Sirsa.")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Link to="/enquiry" className="btn-mint" data-testid="hero-cta-enquiry">
                <FaHeadset /> {lang === "hi" ? "सोलर पूछताछ" : "Solar Enquiry"} <FaChevronRight />
              </Link>
              <Link to="/services" className="btn-outline-mint" data-testid="hero-cta-services">
                <FaSun /> {lang === "hi" ? "सोलर सेवाएँ देखें" : "Explore Solar Services"} <FaChevronRight />
              </Link>
            </div>

            {/* Flow */}
            <div className="flow-panel" data-testid="flow-panel">
              <div className="flow-panel-label">{lang === "hi" ? "सेवा प्रक्रिया" : "Our Service Process"}</div>
              <div className="flow-steps">
                {flowSteps.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <React.Fragment key={i}>
                      <div className="flow-step" data-testid={`flow-step-${i}`}>
                        <div className="flow-step-icon"><Icon /></div>
                        <span>{lang === "hi" ? s.hi : s.en}</span>
                      </div>
                      {i < flowSteps.length - 1 && <FaChevronRight className="flow-arrow" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Quick access cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
              <Link to="/enquiry?service=Solar%20Consultation" className="app-card" data-testid="app-card-consultation">
                <div className="app-card-icon"><FaSolarPanel /></div>
                <div>
                  <div className="app-card-title">{lang === "hi" ? "सोलर परामर्श" : "Solar Consultation"}</div>
                  <div className="app-card-sub">{lang === "hi" ? "मुफ्त परामर्श" : "Free consultation"}</div>
                </div>
              </Link>
              <Link to="/enquiry?service=Site%20Assessment" className="app-card" data-testid="app-card-survey">
                <div className="app-card-icon"><FaSearchLocation /></div>
                <div>
                  <div className="app-card-title">{lang === "hi" ? "साइट सर्वे" : "Site Assessment"}</div>
                  <div className="app-card-sub">{lang === "hi" ? "छत की जाँच" : "Rooftop check"}</div>
                </div>
              </Link>
              <Link to="/vacancies" className="app-card" data-testid="app-card-vacancies">
                <div className="app-card-icon"><FaFingerprint /></div>
                <div>
                  <div className="app-card-title">{lang === "hi" ? "भर्तियाँ" : "Job Alerts"}</div>
                  <div className="app-card-sub">{lang === "hi" ? "छात्रों के लिए" : "For students"}</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Right: brand card */}
          <div className="lg:col-span-4 flex items-center justify-center">
            <div className="w-full max-w-md">
              <HeroBrandCard />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── News marquee ─────────── */}
      <div className="mt-10">
        <NewsMarquee />
      </div>

      {/* ─────────── Solar Savings Calculator ─────────── */}
      <SolarCalculator />

      {/* ─────────── Schemes Info: PM Surya Ghar + Loan Details ─────────── */}
      <SchemesInfo />

      {/* ─────────── Services ─────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14" data-testid="services-section">
        <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="section-eyebrow">Rooftop Solar Services</div>
            <h2 className="section-title">{lang === "hi" ? "हमारी सोलर सेवाएँ" : "Rooftop Solar Services Include"}</h2>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm">
              {lang === "hi" ? "परामर्श से लेकर आफ्टर-सेल्स सहायता तक — रूफटॉप सोलर के लिए संपूर्ण सहायता।" : "From consultation to after-sales support — end-to-end assistance for rooftop solar."}
            </p>
          </div>
          <Link to="/services" className="btn-outline-mint text-sm" data-testid="view-all-services-btn">
            {lang === "hi" ? "सभी सेवाएँ" : "View all"} <FaChevronRight />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <Link key={i} to={s.to} className="svc-card" data-aos="fade-up" data-aos-delay={i * 80} data-testid={`svc-card-${i}`}>
                <div className="svc-icon"><Icon /></div>
                <div className="font-display font-semibold text-lg text-white mb-1">{lang === "hi" ? s.hi : s.en}</div>
                <div className="text-xs text-slate-400 mb-3">{lang === "hi" ? s.desc_hi : s.desc_en}</div>
                <div className="text-blue-400 text-xs font-semibold inline-flex items-center gap-1">
                  {lang === "hi" ? "पूछताछ करें" : "Enquire"} <FaChevronRight className="text-[10px]" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─────────── Vacancies Preview (For Students) ─────────── */}
      <VacanciesPreview />

      {/* ─────────── Stats ─────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-14" data-testid="stats-section">
        <div className="glass p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: "500+", l_hi: "इंस्टॉलेशन", l_en: "Installations" },
            { n: "25 yr", l_hi: "पैनल वारंटी", l_en: "Panel Warranty" },
            { n: "5+", l_hi: "वर्षों का अनुभव", l_en: "Years of Experience" },
            { n: "24 hr", l_hi: "प्रतिक्रिया समय", l_en: "Response Time" },
          ].map((s, i) => (
            <div key={i} data-testid={`stat-${i}`}>
              <div className="font-display text-4xl md:text-5xl font-extrabold text-amber-400">{s.n}</div>
              <div className="text-xs md:text-sm text-slate-400 mt-1.5 uppercase tracking-widest">{lang === "hi" ? s.l_hi : s.l_en}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── Why + Testimonials ─────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-14 grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="why-testimonials-section">
        {/* Why */}
        <div className="lg:col-span-1">
          <div className="section-eyebrow">Why Us</div>
          <h2 className="section-title mb-4">{lang === "hi" ? "एचआर डिजिटल सर्विसेज को क्यों चुनें?" : "Why Choose HR Digital Services?"}</h2>
          <div className="space-y-3">
            {[
              { icon: FaAward, hi: "सरकार अनुमोदित रूफटॉप सोलर वेंडर", en: "Govt. approved rooftop solar vendor" },
              { icon: FaBolt, hi: "अनुभवी इंस्टॉलेशन टीम", en: "Experienced installation team" },
              { icon: FaShieldAlt, hi: "25 वर्ष पैनल वारंटी उपलब्ध", en: "25-year panel warranty available" },
              { icon: FaHeadset, hi: "समर्पित लोकल आफ्टर-सेल्स सहायता", en: "Dedicated local after-sales support" },
              { icon: FaHome, hi: "साइट सर्वे व पारदर्शी कोटेशन", en: "Site survey & transparent quotation" },
              { icon: FaHandshake, hi: "योजनाओं की सामान्य जानकारी", en: "General guidance on schemes" },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="glass p-4 flex items-start gap-3" data-testid={`why-${i}`}>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0"><Icon /></div>
                  <div>
                    <div className="font-semibold text-white text-sm">{lang === "hi" ? c.hi : c.en}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Testimonials */}
        <div className="lg:col-span-2">
          <div className="section-eyebrow">Voices from customers</div>
          <h2 className="section-title mb-4">{lang === "hi" ? "ग्राहकों की प्रतिक्रिया" : "What customers say"}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { n: "राजेश कुमार", p: "Sirsa", hi: "3kW रूफटॉप सोलर लगवाया — टीम पेशेवर और मददगार रही।", en: "Got a 3kW rooftop solar installed — the team was professional and helpful." },
              { n: "सुनीता देवी", p: "Kagdana", hi: "साइट सर्वे और कोटेशन बिल्कुल पारदर्शी था।", en: "Site survey and quotation were completely transparent." },
              { n: "Vikram Singh", p: "Bhadra Road", hi: "इंस्टॉलेशन के बाद भी सपोर्ट अच्छा मिल रहा है।", en: "Good after-installation support and follow-up." },
              { n: "Aarti Sharma", p: "Sirsa Rural", hi: "सोलर स्कीम्स की सामान्य जानकारी अच्छे से समझाई।", en: "Explained general information about solar schemes very well." },
            ].map((tm, i) => (
              <div key={i} className="glass p-5" data-testid={`testimonial-${i}`}>
                <div className="flex text-amber-400 text-sm mb-2">
                  {[...Array(5)].map((_, s) => <FaStar key={s} />)}
                </div>
                <p className="text-sm text-slate-300 italic mb-3 font-hindi">"{lang === "hi" ? tm.hi : tm.en}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-amber-500 flex items-center justify-center font-bold text-slate-900 text-sm">{tm.n[0]}</div>
                  <div>
                    <div className="text-sm font-semibold text-white">{tm.n}</div>
                    <div className="text-xs text-slate-500">{tm.p}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CTA ─────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-14" data-testid="cta-section">
        <div className="glass-strong p-8 md:p-10 relative overflow-hidden">
          <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute -left-24 -bottom-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="category-pill mb-3" data-testid="cta-pill">{lang === "hi" ? "मुफ्त परामर्श" : "Free consultation"}</span>
              <h3 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
                {lang === "hi" ? (<><span className="text-amber-400">रूफटॉप सोलर</span> के लिए हमसे बात करें</>) : (<>Let's talk about your <span className="text-amber-400">rooftop solar</span></>)}
              </h3>
              <p className="text-slate-400 max-w-xl">{lang === "hi" ? "हमारी टीम आपकी छत का सर्वे करेगी और पारदर्शी कोटेशन देगी। कोई एडवांस नहीं।" : "Our team will survey your rooftop and share a transparent quotation. No advance payment."}</p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link to="/enquiry" className="btn-mint" data-testid="cta-enquiry-btn">
                <FaFileSignature /> {lang === "hi" ? "सोलर पूछताछ" : "Solar Enquiry"}
              </Link>
              <a href="tel:8168762016" className="btn-amber" data-testid="cta-call-btn">
                <FaHeadset /> Call 8168762016
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
