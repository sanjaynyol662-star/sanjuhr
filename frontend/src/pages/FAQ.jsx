import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { FaChevronDown, FaQuestionCircle } from "react-icons/fa";

const FAQ = () => {
  const { lang } = useI18n();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(0);
  useEffect(() => { api.get("/faqs").then(r => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div className="max-w-4xl mx-auto px-4 py-12" data-testid="faq-page">
      <div className="section-eyebrow">FAQ</div>
      <h1 className="section-title !text-3xl">{lang === "hi" ? "अक्सर पूछे जाने वाले प्रश्न" : "Frequently Asked Questions"}</h1>
      <div className="mt-8 space-y-3">
        {items.map((f, i) => (
          <div key={f.id} className="glass overflow-hidden" data-testid={`faq-item-${i}`}>
            <button className="w-full flex items-center justify-between p-4 text-left font-semibold text-white hover:bg-emerald-500/5 transition"
              onClick={() => setOpen(open === i ? -1 : i)} data-testid={`faq-toggle-${i}`}>
              <span className="flex items-center gap-2"><FaQuestionCircle className="text-amber-400" /> {lang === "hi" ? f.q_hi : f.q_en}</span>
              <FaChevronDown className={`transition-transform text-emerald-400 ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && <div className="px-4 pb-4 text-slate-300 leading-relaxed font-hindi border-t border-white/5 pt-3">{lang === "hi" ? f.a_hi : f.a_en}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
