import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CSC_CATEGORIES } from "@/lib/cscServices";
import { useI18n } from "@/context/I18nContext";
import { FaSearch, FaChevronRight, FaShieldAlt, FaClock, FaMobileAlt } from "react-icons/fa";

const CSCServices = () => {
  const { lang } = useI18n();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");

  const q = query.trim().toLowerCase();
  const catsFiltered = useMemo(() => {
    return CSC_CATEGORIES
      .filter(cat => activeCat === "all" || cat.id === activeCat)
      .map(cat => ({
        ...cat,
        services: cat.services.filter(s => {
          if (!q) return true;
          return (s.hi + " " + s.en + " " + s.id).toLowerCase().includes(q);
        }),
      }))
      .filter(cat => cat.services.length > 0);
  }, [q, activeCat]);

  const totalCount = CSC_CATEGORIES.reduce((n, c) => n + c.services.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" data-testid="csc-page">
      {/* Header */}
      <div className="mb-8">
        <div className="section-eyebrow">Common Service Centre</div>
        <h1 className="section-title !text-3xl md:!text-4xl">
          {lang === "hi" ? (<>CSC <span className="text-amber-400">डिजिटल सेवा</span> केंद्र</>) : (<>CSC <span className="text-amber-400">Digital Seva</span> Kendra</>)}
        </h1>
        <p className="text-slate-400 mt-2 max-w-2xl text-sm">
          {lang === "hi"
            ? `${totalCount}+ सरकारी सेवाएँ + नई भर्ती फॉर्म एक ही जगह — आधार, PAN, बीमा, बिजली बिल, SSC, रेलवे, HSSC आदि।`
            : `${totalCount}+ Government services + new vacancy forms — Aadhaar, PAN, insurance, bills, SSC, Railway, HSSC and more.`}
        </p>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6" data-testid="csc-trust-badges">
        <div className="glass p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center"><FaShieldAlt /></div>
          <div>
            <div className="text-sm font-semibold text-white">{lang === "hi" ? "अधिकृत CSC वेंडर" : "Authorised CSC Vendor"}</div>
            <div className="text-xs text-slate-400">{lang === "hi" ? "सरकार अनुमोदित" : "Government approved"}</div>
          </div>
        </div>
        <div className="glass p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center"><FaClock /></div>
          <div>
            <div className="text-sm font-semibold text-white">{lang === "hi" ? "24 घंटे में सेवा" : "Service in 24 hours"}</div>
            <div className="text-xs text-slate-400">{lang === "hi" ? "अधिकांश सेवाओं के लिए" : "For most services"}</div>
          </div>
        </div>
        <div className="glass p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center"><FaMobileAlt /></div>
          <div>
            <div className="text-sm font-semibold text-white">{lang === "hi" ? "WhatsApp पर अपडेट" : "WhatsApp Updates"}</div>
            <div className="text-xs text-slate-400">{lang === "hi" ? "स्थिति की सूचना" : "Status notifications"}</div>
          </div>
        </div>
      </div>

      {/* Search + Category filter */}
      <div className="glass p-4 mb-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center" data-testid="csc-filter-bar">
        <div className="input-icon-wrap flex-1">
          <FaSearch className="icon" />
          <input className="input" placeholder={lang === "hi" ? "सेवा खोजें… (जैसे आधार, PAN, बिजली)" : "Search services… (e.g. Aadhaar, PAN, electricity)"}
            value={query} onChange={(e) => setQuery(e.target.value)} data-testid="csc-search-input" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button onClick={() => setActiveCat("all")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${activeCat === "all" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-white/[0.03] text-slate-400 border border-white/10 hover:text-white"}`}
            data-testid="csc-cat-all">
            {lang === "hi" ? "सभी" : "All"} ({totalCount})
          </button>
          {CSC_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${activeCat === cat.id ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-white/[0.03] text-slate-400 border border-white/10 hover:text-white"}`}
              data-testid={`csc-cat-${cat.id}`}>
              {lang === "hi" ? cat.hi : cat.en}
            </button>
          ))}
        </div>
      </div>

      {/* Categories with service grids */}
      {catsFiltered.length === 0 ? (
        <div className="glass p-10 text-center text-slate-500" data-testid="csc-empty">
          <FaSearch className="text-4xl mx-auto mb-3 opacity-40" />
          <p>{lang === "hi" ? "कोई सेवा नहीं मिली। कीवर्ड बदलकर देखें।" : "No services found. Try a different keyword."}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {catsFiltered.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.id} data-testid={`csc-cat-block-${cat.id}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center"><Icon /></div>
                  <h2 className="font-display text-xl font-bold text-white">{lang === "hi" ? cat.hi : cat.en}</h2>
                  <span className="text-xs text-slate-500">{cat.services.length} {lang === "hi" ? "सेवाएँ" : "services"}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cat.services.map(s => (
                    <Link key={s.id} to={`/csc/apply?service=${s.id}`}
                      className="glass p-4 flex items-center justify-between hover:border-emerald-500/40 transition group"
                      data-testid={`csc-service-${s.id}`}>
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-semibold text-white text-sm truncate">{lang === "hi" ? s.hi : s.en}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {lang === "hi" ? "यहाँ क्लिक करके आवेदन करें →" : "Click to apply →"}
                        </div>
                      </div>
                      <FaChevronRight className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Callout at bottom */}
      <div className="mt-10 glass-strong p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="section-eyebrow">Not sure?</div>
          <h3 className="font-display text-2xl font-bold text-white">{lang === "hi" ? "कोई और सेवा चाहिए?" : "Need another service?"}</h3>
          <p className="text-slate-400 text-sm max-w-lg mt-1">
            {lang === "hi" ? "अगर आपकी ज़रूरत की सेवा ऊपर नहीं है, तो कॉल या WhatsApp करें — हम मदद करेंगे।" : "If the service you need isn't listed, call or WhatsApp us — we'll help."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a href="tel:8167862016" className="btn-mint" data-testid="csc-call-btn">📞 Call 8167862016</a>
          <a href="https://wa.me/918168762016" target="_blank" rel="noreferrer" className="btn-amber" data-testid="csc-wa-btn">💬 WhatsApp</a>
        </div>
      </div>
    </div>
  );
};

export default CSCServices;
