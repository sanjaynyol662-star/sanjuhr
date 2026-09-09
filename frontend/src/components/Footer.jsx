import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { S } from "@/lib/strings";
import Logo from "@/components/Logo";
import { FaPhone, FaWhatsapp, FaEnvelope, FaMapMarkerAlt, FaFacebook, FaInstagram, FaYoutube, FaTwitter, FaClock, FaBell, FaLink } from "react-icons/fa";
import { WHATSAPP_CHANNEL_URL } from "@/lib/whatsapp";

const SOCIALS = [
  { k: "social_facebook", label: "Facebook", Icon: FaFacebook },
  { k: "social_twitter", label: "X (Twitter)", Icon: FaTwitter },
  { k: "social_instagram", label: "Instagram", Icon: FaInstagram },
  { k: "social_whatsapp", label: "WhatsApp", Icon: FaWhatsapp },
  { k: "social_youtube", label: "YouTube", Icon: FaYoutube },
];

const Footer = () => {
  const { t, lang } = useI18n();
  const [social, setSocial] = useState({});
  useEffect(() => { api.get("/site-settings").then((r) => setSocial(r.data || {})).catch(() => {}); }, []);
  return (
    <footer className="mt-16" data-testid="site-footer">
      {/* Info bar (like the deployed screenshot) */}
      <div className="info-bar">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="info-bar-item" data-testid="info-office-hours">
            <h5><FaClock className="text-emerald-400" /> {lang === "hi" ? "कार्यालय समय" : "Office Hours"}</h5>
            <p>{lang === "hi" ? "सोम–शनि · सुबह 9 – शाम 7" : "Mon–Sat · 9:00 AM – 7:00 PM"}</p>
          </div>
          <div className="info-bar-item" data-testid="info-helpline">
            <h5><FaPhone className="text-emerald-400" /> {lang === "hi" ? "हेल्पलाइन" : "Helpline"}</h5>
            <div className="flex flex-col gap-1">
              <div className="text-white text-sm font-semibold">Devender Saharan</div>
              <div className="flex flex-wrap items-center gap-1">
                <a href="tel:8168762016" className="chip" data-testid="helpline-1">8168762016</a>
                <a href="https://wa.me/918168762016" target="_blank" rel="noreferrer" className="chip chip-wa" data-testid="helpline-wa"><FaWhatsapp /> WhatsApp</a>
              </div>
            </div>
          </div>
          <div className="info-bar-item" data-testid="info-last-update">
            <h5><FaBell className="text-emerald-400" /> {lang === "hi" ? "अंतिम अपडेट" : "Last Update"}</h5>
            <p>30 Jul, 2026 · 07:00 IST</p>
          </div>
          <div className="info-bar-item" data-testid="info-social">
            <h5><FaLink className="text-emerald-400" /> {lang === "hi" ? "जुड़े रहें" : "Stay Connected"}</h5>
            <div className="flex gap-2 mt-1" data-testid="footer-social-links">
              {SOCIALS.map(({ k, label, Icon }) => {
                const href = (social[k] || "").trim();
                return href ? (
                  <a key={k} href={href} target="_blank" rel="noreferrer" className="social-icon" aria-label={label} title={label} data-testid={`footer-${k}`}><Icon /></a>
                ) : (
                  <Link key={k} to="/" className="social-icon" aria-label={label} title={label} data-testid={`footer-${k}`}><Icon /></Link>
                );
              })}
            </div>
            <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-bold px-4 py-2 transition" data-testid="footer-join-whatsapp-button">
              <FaWhatsapp /> {lang === "hi" ? "WhatsApp चैनल Join करें" : "Join WhatsApp Channel"}
            </a>
          </div>
          <div className="info-bar-item text-right" data-testid="info-version">
            <h5 className="justify-end"><span className="text-emerald-400">v</span> Version</h5>
            <p>2.5.1 · <span className="chip !bg-emerald-500/15 !border-emerald-500/40 !text-emerald-300">Stable</span></p>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="footer-main border-t">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="brand-emblem !p-0 overflow-hidden">
                <Logo size={44} />
              </div>
              <div>
                <div className="font-display text-lg font-bold text-white">{t(S.brand)}</div>
                <div className="text-[10px] text-emerald-400/80 tracking-widest uppercase font-semibold mt-0.5">{lang === "hi" ? "सरकारी नौकरी · सोलर सेवाएँ" : "Govt Jobs & Solar Services"}</div>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t({
                hi: "सिरसा जिले का सरकार अनुमोदित रूफटॉप सोलर वेंडर। परामर्श, साइट सर्वे और इंस्टॉलेशन सहायता।",
                en: "Sirsa's Govt-approved rooftop solar vendor. Consultation, site survey & installation assistance.",
              })}
            </p>
          </div>

          <div>
            <div className="section-eyebrow">Quick Links</div>
            <ul className="space-y-2 text-sm mt-2">
              <li><Link to="/" className="text-slate-300 hover:text-emerald-400" data-testid="footer-jobs-link">→ {t(S.nav.vacancies)}</Link></li>
              <li><Link to="/solar" className="text-slate-300 hover:text-emerald-400" data-testid="footer-solar-link">→ {t(S.nav.solar_services)}</Link></li>
              <li><Link to="/blogs" className="text-slate-300 hover:text-emerald-400" data-testid="footer-blogs-link">→ {t(S.nav.blogs)}</Link></li>
              <li><Link to="/downloads" className="text-slate-300 hover:text-emerald-400" data-testid="footer-cv-templates-link">→ {lang === "hi" ? "Resume / CV Templates" : "Resume / CV Templates"}</Link></li>
              <li><Link to="/contact" className="text-slate-300 hover:text-emerald-400">→ {t(S.nav.contact)}</Link></li>
            </ul>
          </div>

          <div>
            <div className="section-eyebrow">Resources</div>
            <ul className="space-y-2 text-sm mt-2">
              <li><Link to="/notices" className="text-slate-300 hover:text-emerald-400">→ {t(S.nav.notices)}</Link></li>
              <li><Link to="/downloads" className="text-slate-300 hover:text-emerald-400">→ {t(S.nav.downloads)}</Link></li>
              <li><Link to="/faq" className="text-slate-300 hover:text-emerald-400">→ {t(S.nav.faq)}</Link></li>
              <li><a href="https://pmsuryaghar.gov.in" target="_blank" rel="noreferrer" className="text-slate-300 hover:text-emerald-400">→ PM Surya Ghar (Official) ↗</a></li>
              <li><a href="https://mnre.gov.in" target="_blank" rel="noreferrer" className="text-slate-300 hover:text-emerald-400">→ MNRE Official ↗</a></li>
            </ul>
          </div>

          <div>
            <div className="section-eyebrow">Contact</div>
            <ul className="space-y-2.5 text-sm mt-2">
              <li className="flex items-start gap-2 text-slate-300"><FaMapMarkerAlt className="mt-1 text-amber-400 shrink-0" /> <span>200 Mtr From Bus Stand, Begu–Bhadra Road, Kagdana, Sirsa, Haryana</span></li>
              <li className="text-[10px] text-emerald-400 uppercase tracking-widest mt-2">Office</li>
              <li className="flex items-center gap-2 text-slate-300"><FaPhone className="text-amber-400" /> <a href="tel:8168762016" className="hover:text-emerald-400" data-testid="footer-office-phone">8168762016</a></li>
              <li className="flex items-start gap-2 text-slate-300"><FaEnvelope className="mt-1 text-amber-400 shrink-0" /> <a href="mailto:haryanaenterpriseskagdana@gmail.com" className="break-all hover:text-emerald-400" data-testid="footer-office-email">haryanaenterpriseskagdana@gmail.com</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom border-t">
          <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} {t(S.brand)}. {t({ hi: "सर्वाधिकार सुरक्षित।", en: "All rights reserved." })}</span>
            <span className="flex items-center gap-3">
              <span>Secure · Reliable · Scalable</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span>Visitors: 12,453</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
