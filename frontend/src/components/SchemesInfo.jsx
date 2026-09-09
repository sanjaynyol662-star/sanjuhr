import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";
import {
  FaSolarPanel, FaMoneyBillWave, FaBolt, FaLeaf, FaHome, FaCheckCircle,
  FaHandshake, FaShieldAlt, FaInfoCircle, FaExternalLinkAlt, FaChevronRight,
} from "react-icons/fa";

const SOLAR_BENEFITS = [
  { icon: FaBolt,    hi: "बिजली बिल में संभावित कमी", en: "Potential reduction in electricity bills" },
  { icon: FaHome,    hi: "अपनी छत पर सौर बिजली का उत्पादन", en: "Generate your own solar power at home" },
  { icon: FaLeaf,    hi: "स्वच्छ एवं पर्यावरण-अनुकूल ऊर्जा", en: "Clean & eco-friendly energy" },
  { icon: FaHandshake, hi: "सरकारी योजनाओं की सामान्य जानकारी", en: "General information on Govt. schemes" },
  { icon: FaShieldAlt, hi: "अनुभवी वेंडर द्वारा इंस्टॉलेशन सहायता", en: "Installation assistance by experienced vendor" },
];

const FINANCE_INFO = [
  { icon: FaCheckCircle, hi: "विभिन्न ऋणदाताओं की योजनाओं की सामान्य जानकारी", en: "General information on schemes from various lenders" },
  { icon: FaInfoCircle, hi: "पात्रता, ब्याज दर एवं शर्तें ऋणदाता की वर्तमान नीति के अधीन", en: "Eligibility, interest rate & terms subject to lender's current policy" },
  { icon: FaShieldAlt, hi: "हम कोई ऋण मंज़ूरी की गारंटी नहीं देते", en: "We do not guarantee any loan approval" },
];

const SchemesInfo = () => {
  const { lang } = useI18n();
  const hi = lang === "hi";

  return (
    <section className="max-w-7xl mx-auto px-4 py-14" data-testid="schemes-info-section">
      <div className="mb-8">
        <div className="section-eyebrow">{hi ? "जानकारी" : "Information"}</div>
        <h2 className="section-title" data-testid="schemes-info-title">
          {hi
            ? <>सरकारी सोलर योजना <span className="text-amber-400">जानकारी</span></>
            : <>Government Solar Scheme <span className="text-amber-400">Information</span></>}
        </h2>
        <p className="text-slate-400 mt-3 max-w-3xl text-sm leading-relaxed">
          {hi
            ? "एचआर डिजिटल सर्विसेज रूफटॉप सोलर और लागू सरकारी योजनाओं के संबंध में सामान्य जानकारी एवं सहायता प्रदान करता है। ग्राहक कृपया वर्तमान पात्रता, सब्सिडी नियम और आवेदन प्रक्रिया संबंधित आधिकारिक प्राधिकरण के माध्यम से सत्यापित करें।"
            : "HR Digital Services provides general information and assistance regarding rooftop solar and applicable government schemes. Customers should verify current eligibility, subsidy rules and application procedures through the relevant official authority."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─────── Solar Scheme Info ─────── */}
        <div className="glass p-6 md:p-7 relative overflow-hidden" data-testid="solar-info-card">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xl">
                <FaSolarPanel />
              </div>
              <div>
                <div className="text-[10px] uppercase text-amber-400 font-semibold tracking-widest">
                  {hi ? "सामान्य जानकारी" : "General Information"}
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white">
                  {hi ? "रूफटॉप सोलर एवं सरकारी योजनाएँ" : "Rooftop Solar & Govt. Schemes"}
                </h3>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-5">
              {hi
                ? "पात्र घरेलू उपभोक्ता अपनी छत पर रूफटॉप सोलर लगाकर सरकार द्वारा घोषित योजनाओं के अंतर्गत उपलब्ध लाभों की जानकारी ले सकते हैं। हम आपको प्रक्रिया, आवश्यक दस्तावेज़ और सामान्य पात्रता के बारे में मार्गदर्शन प्रदान करते हैं।"
                : "Eligible households installing rooftop solar can learn about the benefits available under Government-announced schemes. We provide guidance on the process, required documents and general eligibility."}
            </p>

            {/* Benefits */}
            <div className="mb-5">
              <div className="text-xs uppercase font-semibold text-slate-400 tracking-widest mb-2">
                {hi ? "संभावित लाभ" : "Potential Benefits"}
              </div>
              <ul className="space-y-1.5">
                {SOLAR_BENEFITS.map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <Icon className="text-blue-400 mt-0.5 shrink-0 text-[13px]" />
                      <span>{hi ? b.hi : b.en}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Compliance note */}
            <div className="p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/30 text-[11px] text-amber-200 mb-5 leading-relaxed" data-testid="solar-info-disclaimer">
              <b>{hi ? "अस्वीकरण: " : "Disclaimer: "}</b>
              {hi
                ? "यह जानकारी केवल सामान्य मार्गदर्शन के लिए है। लागू पात्रता, सब्सिडी राशि, नियम एवं आवेदन प्रक्रिया समय-समय पर बदल सकते हैं। कृपया आधिकारिक स्रोतों से सत्यापन करें।"
                : "This information is for general guidance only. Applicable eligibility, subsidy amount, rules and application procedures may change from time to time. Please verify with the official sources."}
            </div>

            {/* Official links */}
            <div className="mb-5">
              <div className="text-xs uppercase font-semibold text-slate-400 tracking-widest mb-2">
                {hi ? "आधिकारिक स्रोत" : "Official Sources"}
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="https://pmsuryaghar.gov.in" target="_blank" rel="noreferrer" className="btn-outline-mint text-xs !py-2" data-testid="official-pmsg-link">
                  pmsuryaghar.gov.in <FaExternalLinkAlt className="text-[10px]" />
                </a>
                <a href="https://mnre.gov.in" target="_blank" rel="noreferrer" className="btn-outline-mint text-xs !py-2" data-testid="official-mnre-link">
                  mnre.gov.in <FaExternalLinkAlt className="text-[10px]" />
                </a>
              </div>
            </div>

            {/* Enquiry CTA */}
            <Link to="/enquiry?service=Solar%20Scheme%20Information" className="btn-mint w-full md:w-auto justify-center" data-testid="solar-info-enquiry-cta">
              <FaSolarPanel /> {hi ? "जानकारी के लिए पूछताछ" : "Enquire for Information"} <FaChevronRight className="text-xs" />
            </Link>
          </div>
        </div>

        {/* ─────── Financing Information ─────── */}
        <div className="glass p-6 md:p-7 relative overflow-hidden" data-testid="loan-info-card">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-400 flex items-center justify-center text-xl">
                <FaMoneyBillWave />
              </div>
              <div>
                <div className="text-[10px] uppercase text-blue-400 font-semibold tracking-widest">
                  {hi ? "जानकारी" : "Information"}
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white">
                  {hi ? "सोलर वित्तीय जानकारी" : "Solar Financing Information"}
                </h3>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-5">
              {hi
                ? "रूफटॉप सोलर के लिए बाज़ार में विभिन्न ऋणदाताओं द्वारा वित्तीय योजनाएँ उपलब्ध हो सकती हैं। हम आपको उपलब्ध विकल्पों के बारे में सामान्य जानकारी प्रदान करते हैं।"
                : "Various lenders may offer financing schemes for rooftop solar. We provide general information about the available options."}
            </p>

            {/* Info list */}
            <div className="mb-5">
              <div className="text-xs uppercase font-semibold text-slate-400 tracking-widest mb-2">
                {hi ? "मुख्य बिंदु" : "Key Points"}
              </div>
              <ul className="space-y-1.5">
                {FINANCE_INFO.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <Icon className="text-blue-400 mt-0.5 shrink-0 text-[13px]" />
                      <span>{hi ? f.hi : f.en}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Compliance note */}
            <div className="p-3 rounded-lg bg-blue-500/[0.08] border border-blue-500/30 text-[11px] text-blue-200 mb-5 leading-relaxed" data-testid="loan-info-disclaimer">
              <b>{hi ? "अस्वीकरण: " : "Disclaimer: "}</b>
              {hi
                ? "वित्तीय सुविधा की उपलब्धता, ब्याज दर, पात्रता एवं शर्तें संबंधित ऋणदाता की वर्तमान नीति और अनुमोदन के अधीन हैं। एचआर डिजिटल सर्विसेज कोई ऋण मंज़ूरी की गारंटी नहीं देता।"
                : "Financing availability, interest rates, eligibility and terms are subject to the respective lender's current policies and approval. HR Digital Services does not guarantee any loan approval."}
            </div>

            {/* Enquiry CTA */}
            <Link to="/enquiry?service=Solar%20Financing%20Information" className="btn-mint w-full md:w-auto justify-center" data-testid="loan-info-enquiry-cta">
              <FaMoneyBillWave /> {hi ? "वित्त जानकारी के लिए पूछताछ" : "Enquire About Financing"} <FaChevronRight className="text-xs" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SchemesInfo;
