import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";
import {
  FaSearchLocation, FaHome, FaTools, FaHandshake, FaSolarPanel, FaHeadset,
  FaChevronRight, FaCheckCircle, FaShieldAlt,
} from "react-icons/fa";
import SEO from "@/components/SEO";

const cards = [
  {
    icon: FaSearchLocation,
    hi: "सोलर परामर्श",
    en: "Solar Consultation",
    desc_hi: "आपकी बिजली खपत, बजट और आवश्यकताओं के अनुसार सही सिस्टम की जानकारी।",
    desc_en: "Guidance on the right system based on your electricity consumption, budget and needs.",
    to: "/enquiry?service=Solar%20Consultation",
  },
  {
    icon: FaHome,
    hi: "साइट असेसमेंट",
    en: "Site Assessment",
    desc_hi: "छत की उपलब्ध जगह, दिशा, छाया और संरचना का मूल्यांकन।",
    desc_en: "Evaluation of roof space, orientation, shading and structure.",
    to: "/enquiry?service=Site%20Assessment",
  },
  {
    icon: FaTools,
    hi: "सोलर सिस्टम प्लानिंग",
    en: "Solar System Planning",
    desc_hi: "क्षमता (kW), लेआउट और उपयुक्त उपकरणों की योजना।",
    desc_en: "Capacity (kW), layout and equipment planning suited to your site.",
    to: "/enquiry?service=Solar%20System%20Planning",
  },
  {
    icon: FaHandshake,
    hi: "इंस्टॉलेशन सहायता",
    en: "Installation Assistance",
    desc_hi: "अनुभवी टीम द्वारा सुरक्षित और गुणवत्तापूर्ण इंस्टॉलेशन।",
    desc_en: "Safe and quality installation by an experienced team.",
    to: "/enquiry?service=Installation%20Assistance",
  },
  {
    icon: FaSolarPanel,
    hi: "सोलर सिस्टम जानकारी",
    en: "Solar System Information",
    desc_hi: "पैनल, इन्वर्टर, नेट-मीटरिंग और सरकारी योजनाओं की सामान्य जानकारी।",
    desc_en: "General information on panels, inverters, net-metering and government schemes.",
    to: "/enquiry?service=Solar%20System%20Information",
  },
  {
    icon: FaHeadset,
    hi: "आफ्टर-सेल्स सहायता",
    en: "After-Sales Support",
    desc_hi: "इंस्टॉलेशन के बाद निरंतर सहायता और सामान्य रखरखाव मार्गदर्शन।",
    desc_en: "Continued support and general maintenance guidance after installation.",
    to: "/enquiry?service=After-Sales%20Support",
  },
];

const Services = () => {
  const { lang } = useI18n();
  const hi = lang === "hi";

  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="services-page">
      <SEO seoKey="seo:services" path="/services" />
      <div className="section-eyebrow">{hi ? "हमारी सेवाएँ" : "Our Services"}</div>
      <h1 className="section-title !text-3xl" data-testid="services-title">
        {hi ? "रूफटॉप सोलर सेवाएँ" : "Rooftop Solar Services"}
      </h1>
      <p className="text-slate-400 mt-2 text-sm max-w-3xl">
        {hi
          ? "एचआर डिजिटल सर्विसेज परामर्श से लेकर आफ्टर-सेल्स सहायता तक — रूफटॉप सोलर के लिए संपूर्ण पेशेवर सहायता प्रदान करता है।"
          : "HR Digital Services offers end-to-end professional assistance for rooftop solar — from consultation to after-sales support."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link key={i} to={c.to} className="svc-card" data-testid={`service-card-${i}`}>
              <div className="svc-icon"><Icon /></div>
              <div className="font-display font-semibold text-white text-lg mb-1">{hi ? c.hi : c.en}</div>
              <div className="text-xs text-slate-400 mb-3">{hi ? c.desc_hi : c.desc_en}</div>
              <div className="text-emerald-400 text-xs font-semibold inline-flex items-center gap-1">
                {hi ? "पूछताछ करें" : "Enquire"} <FaChevronRight className="text-[10px]" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Compliance Note */}
      <div className="mt-10 glass p-5 flex items-start gap-3 text-sm text-slate-300 leading-relaxed" data-testid="services-compliance-note">
        <FaShieldAlt className="text-emerald-400 mt-1 shrink-0" />
        <div>
          <div className="font-semibold text-white mb-1">{hi ? "पारदर्शी सेवा प्रतिबद्धता" : "Transparent Service Commitment"}</div>
          <ul className="space-y-1.5">
            {[
              { hi: "हम आधार, PAN, बैंक विवरण, OTP या पासवर्ड कभी नहीं माँगते।", en: "We never ask for Aadhaar, PAN, bank details, OTP or passwords." },
              { hi: "पूछताछ के बाद पारदर्शी कोटेशन दिया जाता है — कोई एडवांस भुगतान नहीं।", en: "A transparent quotation is shared after enquiry — no advance payment required." },
              { hi: "सरकारी योजनाओं की जानकारी केवल सामान्य मार्गदर्शन के लिए है, कृपया आधिकारिक स्रोतों से सत्यापन करें।", en: "Government scheme information is for general guidance only — please verify with official sources." },
            ].map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-400 text-xs"><FaCheckCircle className="text-emerald-400 mt-0.5 shrink-0" /> <span>{hi ? n.hi : n.en}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/enquiry" className="btn-mint" data-testid="services-enquiry-cta">
          {hi ? "सोलर पूछताछ" : "Solar Enquiry"} <FaChevronRight />
        </Link>
        <a href="tel:8168762016" className="btn-outline-mint" data-testid="services-call-cta">
          <FaHeadset /> {hi ? "कॉल करें" : "Call"} · 8168762016
        </a>
      </div>
    </div>
  );
};

export default Services;
