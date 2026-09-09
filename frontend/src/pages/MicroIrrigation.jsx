import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";
import { FaWater, FaSeedling, FaTint, FaTree, FaChevronRight, FaPhone, FaWhatsapp, FaLeaf, FaAward } from "react-icons/fa";

const schemes = [
  {
    id: "diggi", icon: FaWater,
    hi: "डिग्गी (Farm Pond)", en: "Diggi (Farm Pond)",
    desc_hi: "खेत में जलाशय बनवाएँ — पानी की बचत, पूरा साल सिंचाई।",
    desc_en: "Build an on-farm water reservoir — save water, irrigate year-round.",
    subsidy_hi: "70% – 85% सब्सिडी",
    subsidy_en: "70% – 85% subsidy",
    highlight: "70/85%",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwzfHxmYXJtJTIwaXJyaWdhdGlvbnxlbnwwfHx8fDE3ODUzODc0NDV8MA&ixlib=rb-4.1.0&q=85",
  },
  {
    id: "sprinkler", icon: FaSeedling,
    hi: "फव्वारा सिंचाई प्रणाली", en: "Sprinkler Irrigation",
    desc_hi: "नवीनतम स्प्रिंकलर सिस्टम — भारी सब्सिडी। कम पानी में ज़्यादा फसल।",
    desc_en: "Latest sprinkler system — heavy subsidy. Grow more with less water.",
    subsidy_hi: "85% तक सब्सिडी",
    subsidy_en: "Up to 85% subsidy",
    highlight: "85%",
    img: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwzfHxzcHJpbmtsZXIlMjBpcnJpZ2F0aW9ufGVufDB8fHx8MTc4NTM4NzQ0NXww&ixlib=rb-4.1.0&q=85",
  },
  {
    id: "drip", icon: FaTint,
    hi: "ड्रिप सिंचाई", en: "Drip Irrigation",
    desc_hi: "पौधों तक बूंद-बूंद पानी। बागवानी और सब्ज़ी फसलों के लिए बेहतरीन।",
    desc_en: "Drop-by-drop water to the plants. Ideal for orchards and vegetables.",
    subsidy_hi: "85% तक सब्सिडी",
    subsidy_en: "Up to 85% subsidy",
    highlight: "85%",
    img: "https://images.unsplash.com/photo-1560693225-ef8ab749b2ea?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwyfHxkcmlwJTIwaXJyaWdhdGlvbnxlbnwwfHx8fDE3ODUzODc0NDV8MA&ixlib=rb-4.1.0&q=85",
  },
  {
    id: "poplar", icon: FaTree,
    hi: "सफेदा (Poplar) बागवानी", en: "Poplar (Safeda) Plantation",
    desc_hi: "P23, P288 व अन्य किस्म के सफेदे लगवाएँ। तेज़ बढ़ोतरी, अच्छा दाम।",
    desc_en: "Plant P23, P288 & other varieties. Fast growth, great returns.",
    subsidy_hi: "P23, P288 किस्म",
    subsidy_en: "P23, P288 varieties",
    highlight: "P23/P288",
    img: "https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwyfHxwb3BsYXIlMjB0cmVlc3xlbnwwfHx8fDE3ODUzODc0NDV8MA&ixlib=rb-4.1.0&q=85",
  },
];

const MicroIrrigation = () => {
  const { lang } = useI18n();

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" data-testid="irrigation-page">
      {/* Hero banner */}
      <div className="glass-strong relative overflow-hidden mb-8 p-6 md:p-10" data-testid="irrigation-hero">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-24 -bottom-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative">
          <div className="section-eyebrow">Government Subsidy Schemes</div>
          <h1 className="font-display font-extrabold text-3xl md:text-5xl leading-tight text-white">
            {lang === "hi"
              ? (<>सरकार की <span className="text-amber-400">बड़ी छूट</span> योजनाएँ</>)
              : (<>Government's <span className="text-amber-400">biggest subsidy</span> schemes</>)}
          </h1>
          <p className="text-slate-300 mt-3 max-w-2xl">
            {lang === "hi"
              ? "खेतों में डिग्गी की 70% और 85% सब्सिडी · फव्वारा/ड्रिप सिस्टम · P23, P288 सफेदा · PM सूर्य घर पर ₹78,000 और ₹1,10,000 सब्सिडी।"
              : "Farm ponds with 70% & 85% subsidy · Sprinkler/Drip systems · P23, P288 Poplar · PM Surya Ghar with ₹78,000 & ₹1,10,000 subsidy."}
          </p>

          {/* Highlight chips */}
          <div className="flex flex-wrap gap-2 mt-5">
            <span className="chip !text-base !py-1.5 !px-3"><FaAward /> डिग्गी 70%–85%</span>
            <span className="chip !text-base !py-1.5 !px-3"><FaAward /> फव्वारा / ड्रिप 85%</span>
            <span className="chip !text-base !py-1.5 !px-3"><FaLeaf /> P23 / P288 Poplar</span>
            <span className="chip !text-base !py-1.5 !px-3"><FaAward /> सूर्य घर ₹78K–₹1.1L</span>
          </div>
        </div>
      </div>

      {/* Schemes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="irrigation-grid">
        {schemes.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="glass overflow-hidden group relative" data-testid={`irrigation-card-${s.id}`}>
              <div className="relative h-40 overflow-hidden">
                <img src={s.img} alt={s.en} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f0d] via-[#0a0f0d]/40 to-transparent"></div>
                <span className="absolute top-3 right-3 bg-amber-500 text-slate-900 font-extrabold px-3 py-1 rounded-full text-sm shadow-lg">{s.highlight}</span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center"><Icon /></div>
                  <div>
                    <div className="font-display font-bold text-lg text-white">{lang === "hi" ? s.hi : s.en}</div>
                    <div className="text-xs text-amber-400 font-semibold">{lang === "hi" ? s.subsidy_hi : s.subsidy_en}</div>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-4">{lang === "hi" ? s.desc_hi : s.desc_en}</p>
                <Link to={`/irrigation/apply?scheme=${s.id}`} className="btn-mint w-full" data-testid={`irrigation-apply-${s.id}`}>
                  {lang === "hi" ? "अभी आवेदन करें" : "Apply Now"} <FaChevronRight />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contact strip */}
      <div className="mt-10 glass p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4" data-testid="irrigation-contact">
        <div>
          <div className="section-eyebrow">Field Officers</div>
          <h3 className="font-display text-xl font-bold text-white">
            {lang === "hi" ? "मुफ्त परामर्श के लिए संपर्क करें" : "Contact for free consultation"}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="tel:9813664230" className="btn-outline-mint" data-testid="call-sanjay-btn">
            <FaPhone /> Sanjay Fageria · 98136-64230
          </a>
          <a href="tel:9097410008" className="btn-outline-mint" data-testid="call-anoop-btn">
            <FaPhone /> Anoop Beniwal · 90974-10008
          </a>
          <a href="tel:9992120628" className="btn-mint" data-testid="call-office-btn">
            <FaPhone /> Office · 99921-20628
          </a>
          <a href="https://wa.me/918168762016" target="_blank" rel="noreferrer" className="btn-amber" data-testid="wa-btn">
            <FaWhatsapp /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default MicroIrrigation;
