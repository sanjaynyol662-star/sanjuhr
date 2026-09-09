import React from "react";
import { useI18n } from "@/context/I18nContext";

const About = () => {
  const { t, lang } = useI18n();
  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="about-page">
      <div className="section-eyebrow">About</div>
      <h1 className="section-title !text-3xl">{t({ hi: "हमारे बारे में", en: "About Us" })}</h1>
      <div className="grid md:grid-cols-2 gap-8 mt-8 items-center">
        <div>
          <img src="https://images.unsplash.com/photo-1609252509027-3928a66302fd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwyfHxydXJhbCUyMGluZGlhJTIwZmFybWVyJTIwd29ya2luZ3xlbnwwfHx8fDE3ODUzODc0NDV8MA&ixlib=rb-4.1.0&q=85" alt="Rural India" className="rounded-2xl w-full border border-white/10" />
        </div>
        <div className="glass p-6 space-y-3 text-slate-300 leading-relaxed text-sm">
          <p className="font-display font-semibold text-emerald-400 text-lg">
            {t({ hi: "एचआर डिजिटल सर्विसेज – कागदाना, सिरसा", en: "HR Digital Services – Kagdana, Sirsa" })}
          </p>
          <p>{t({ hi: "हम सिरसा जिले की एक निजी, विश्वसनीय संस्था हैं जो सरकार अनुमोदित रूफटॉप सोलर वेंडर के रूप में परामर्श, साइट सर्वे और इंस्टॉलेशन सहायता प्रदान करती है।", en: "We are a private, trusted business in Sirsa district — a Govt-approved rooftop solar vendor providing consultation, site survey and installation assistance." })}</p>
          <p>{t({ hi: "हमारा उद्देश्य हर घर तक स्वच्छ सौर ऊर्जा की पहुँच आसान बनाना और पारदर्शी सेवा देना है।", en: "Our mission is to make clean solar energy accessible to every home and to deliver transparent service." })}</p>
          <ul className="mt-3 space-y-1.5">
            {[
              { hi: "सरकार अनुमोदित रूफटॉप सोलर वेंडर", en: "Govt. approved rooftop solar vendor" },
              { hi: "500+ सफल इंस्टॉलेशन", en: "500+ successful installations" },
              { hi: "5+ वर्षों का अनुभव", en: "5+ years of experience" },
              { hi: "पारदर्शी कोटेशन · कोई एडवांस नहीं", en: "Transparent quotation · No advance" },
            ].map((b, i) => (
              <li key={i} className="flex items-center gap-2 text-slate-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {lang === "hi" ? b.hi : b.en}</li>
            ))}
          </ul>

          <div className="mt-4 p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed" data-testid="about-disclaimer">
            <b>{lang === "hi" ? "अस्वीकरण: " : "Disclaimer: "}</b>
            {lang === "hi"
              ? "एचआर डिजिटल सर्विसेज एक निजी संस्था है, कोई सरकारी पोर्टल नहीं। सरकारी योजनाओं की जानकारी केवल सामान्य मार्गदर्शन के लिए है — कृपया आधिकारिक स्रोतों से सत्यापन करें।"
              : "HR Digital Services is a private business, not a government portal. Government scheme information is provided for general guidance only — please verify with official sources."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
