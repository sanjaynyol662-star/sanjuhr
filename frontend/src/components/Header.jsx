import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { S } from "@/lib/strings";
import Logo from "@/components/Logo";
import {
  FaSolarPanel, FaBars, FaTimes,
  FaFileDownload, FaHeadset, FaHome, FaInfoCircle,
  FaCogs, FaBullhorn, FaQuestionCircle, FaChevronDown,
  FaAdjust, FaLanguage, FaBriefcase, FaNewspaper, FaWhatsapp
} from "react-icons/fa";
import { WHATSAPP_CHANNEL_URL } from "@/lib/whatsapp";

const Header = () => {
  const { lang, toggle, t } = useI18n();
  const { toggleLightDark, isLight, locked: themeLocked } = useTheme();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const [fontSize, setFontSize] = useState(localStorage.getItem("fontSize") || "normal");

  useEffect(() => {
    document.body.classList.remove("font-large", "font-small");
    if (fontSize === "large") document.body.classList.add("font-large");
    if (fontSize === "small") document.body.classList.add("font-small");
    localStorage.setItem("fontSize", fontSize);
  }, [fontSize]);

  const primaryLinks = [
    { to: "/", label: t(S.nav.vacancies), icon: FaBriefcase },
    { to: "/solar", label: t(S.nav.solar_services), icon: FaSolarPanel },
    { to: "/blogs", label: t(S.nav.blogs), icon: FaNewspaper },
    { to: "/services", label: t(S.nav.services), icon: FaCogs },
    { to: "/enquiry", label: t(S.nav.enquiry), icon: FaHeadset },
    { to: "/contact", label: t(S.nav.contact), icon: FaHeadset },
  ];
  const moreLinks = [
    { to: "/about", label: t(S.nav.about), icon: FaInfoCircle },
    { to: "/notices", label: t(S.nav.notices), icon: FaBullhorn },
    { to: "/downloads", label: t(S.nav.downloads), icon: FaFileDownload },
    { to: "/faq", label: t(S.nav.faq), icon: FaQuestionCircle },
  ];

  return (
    <header className="sticky top-0 z-50" data-testid="site-header">
      {/* ─────────── Top Strip ─────────── */}
      <div className="top-strip" data-testid="top-strip">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 shrink-0" data-testid="brand-link">
            <div className="brand-emblem !p-0 overflow-hidden">
              <Logo size={44} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-xl font-extrabold text-white tracking-tight">
                {lang === "hi" ? "एचआर डिजिटल सर्विसेज" : "HR Digital Services"}
              </div>
              <div className="text-[10px] font-semibold text-emerald-400/80 tracking-[0.2em] uppercase mt-0.5">
                {lang === "hi" ? "सरकारी नौकरी · सोलर सेवाएँ" : "Govt Jobs & Solar Services"}
              </div>
            </div>
          </Link>

          {/* Right controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <a href="tel:8168762016" className="status-pill hover:!bg-emerald-500/20 transition-colors" data-testid="header-call-pill">
              <span className="status-dot"></span>
              {lang === "hi" ? "कॉल करें" : "Call"} · 8168762016
            </a>

            {/* Font size */}
            <div className="a11y-group" data-testid="font-size-group">
              <button className={`a11y-btn ${fontSize === "small" ? "active" : ""}`} onClick={() => setFontSize("small")} data-testid="font-small-btn" aria-label="Small">A-</button>
              <button className={`a11y-btn ${fontSize === "normal" ? "active" : ""}`} onClick={() => setFontSize("normal")} data-testid="font-normal-btn" aria-label="Normal">A</button>
              <button className={`a11y-btn ${fontSize === "large" ? "active" : ""}`} onClick={() => setFontSize("large")} data-testid="font-large-btn" aria-label="Large">A+</button>
            </div>

            <button className="a11y-btn" onClick={toggle} data-testid="lang-toggle-btn" title="Language" aria-label="Language">
              <FaLanguage className="mr-1" /> {lang === "hi" ? "EN" : "हिं"}
            </button>
            {!themeLocked && (
              <button className="a11y-btn" onClick={toggleLightDark} data-testid="theme-toggle-btn" title="Light / Dark" aria-label="Light or Dark">
                <FaAdjust />
              </button>
            )}
            <ThemeSwitcher />

            <button className="lg:hidden a11y-btn" onClick={() => setOpen(v => !v)} data-testid="mobile-menu-toggle" aria-label="Menu">
              {open ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>
      </div>

      {/* ─────────── Sub Nav ─────────── */}
      <nav className="subnav hidden lg:block" data-testid="main-nav">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2">
          {primaryLinks.map(l => {
            const Icon = l.icon;
            return (
              <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({ isActive }) => `subnav-link ${isActive ? "active" : ""}`} data-testid={`nav-${l.to.replace(/\//g, "-") || "home"}`}>
                <Icon /> {l.label}
              </NavLink>
            );
          })}

          {/* More dropdown */}
          <div className="relative">
            <button className="subnav-link" onClick={() => setMoreOpen(v => !v)} onBlur={() => setTimeout(() => setMoreOpen(false), 150)} data-testid="nav-more">
              <FaBars /> More <FaChevronDown className={`text-xs transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen && (
              <div className="absolute left-0 top-full mt-1 glass-strong p-2 min-w-[220px] z-50" data-testid="nav-more-menu">
                {moreLinks.map(l => {
                  const Icon = l.icon;
                  return (
                    <NavLink key={l.to} to={l.to} onClick={() => setMoreOpen(false)} className={({ isActive }) => `subnav-link !w-full ${isActive ? "active" : ""}`} data-testid={`nav-more-${l.to.replace(/\//g, "-")}`}>
                      <Icon /> {l.label}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1"></div>

          <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold !py-2 !px-4 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white transition" data-testid="header-join-whatsapp-button">
            <FaWhatsapp /> {lang === "hi" ? "WhatsApp चैनल" : "WhatsApp Channel"}
          </a>
          <a href={`https://wa.me/918168762016?text=${encodeURIComponent(lang === "hi" ? "नमस्ते, मुझे फ्री रूफटॉप सोलर सर्वे बुक करना है। कृपया संपर्क करें।" : "Hello, I want to book a free rooftop solar survey. Please contact me.")}`} target="_blank" rel="noreferrer" className="btn-mint text-sm !py-2 !px-4" data-testid="topbar-contact-btn">
            <FaHeadset /> {lang === "hi" ? "फ्री सर्वे बुक करें" : "Book Free Survey"}
          </a>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden glass-strong mx-4 mt-2 p-3" data-testid="mobile-menu">
          {[...primaryLinks, ...moreLinks].map(l => {
            const Icon = l.icon;
            return (
              <NavLink key={l.to} to={l.to} end={l.to === "/"} onClick={() => setOpen(false)} className={({ isActive }) => `subnav-link !w-full ${isActive ? "active" : ""}`} data-testid={`mobile-nav-${l.to.replace(/\//g, "-") || "home"}`}>
                <Icon /> {l.label}
              </NavLink>
            );
          })}
          <div className="border-t border-white/10 my-2 pt-2 flex gap-2">
            <a href="tel:8168762016" onClick={() => setOpen(false)} className="btn-mint text-sm flex-1"><FaHeadset /> {lang === "hi" ? "कॉल करें" : "Call Now"}</a>
            <a href="https://wa.me/918168762016" target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="btn-ghost text-sm flex-1">WhatsApp</a>
          </div>
          <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="mt-1 inline-flex items-center justify-center gap-2 w-full rounded-full bg-[#25D366] text-white text-sm font-bold py-2.5" data-testid="mobile-join-whatsapp-button">
            <FaWhatsapp /> {lang === "hi" ? "WhatsApp चैनल Join करें" : "Join WhatsApp Channel"}
          </a>
        </div>
      )}
    </header>
  );
};

export default Header;
