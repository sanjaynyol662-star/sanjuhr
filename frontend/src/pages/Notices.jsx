import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { FaBullhorn } from "react-icons/fa";

const Notices = () => {
  const { lang } = useI18n();
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/notices").then(r => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div className="max-w-5xl mx-auto px-4 py-12" data-testid="notices-page">
      <div className="section-eyebrow">Notice Board</div>
      <h1 className="section-title !text-3xl">{lang === "hi" ? "सूचना बोर्ड" : "Notice Board"}</h1>
      <div className="mt-8 space-y-3">
        {items.map((n, i) => (
          <div key={n.id} className="glass p-4 flex items-start gap-4 hover:border-emerald-500/40 transition" data-testid={`notice-item-${i}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === "important" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"}`}>
              <FaBullhorn />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white font-hindi">{lang === "hi" ? n.title_hi : n.title_en}</div>
              <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">{n.type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notices;
