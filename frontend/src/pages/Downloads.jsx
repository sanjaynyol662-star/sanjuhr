import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { FaFileDownload, FaFilePdf, FaFileAlt } from "react-icons/fa";

import { BACKEND_URL as BACKEND } from "@/lib/api";

const Downloads = () => {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  useEffect(() => {
    api.get("/downloads").then(r => setItems(r.data)).catch(() => {});
    api.get("/resume-templates").then(r => setTemplates(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);
  return (
    <div className="max-w-5xl mx-auto px-4 py-12" data-testid="downloads-page">
      <div className="section-eyebrow">Downloads</div>
      <h1 className="section-title !text-3xl">{hi ? "डाउनलोड करें" : "Downloads"}</h1>
      <p className="text-slate-400 mt-2 text-sm">{hi ? "फॉर्म्स, ब्रोशर व गाइडलाइन डाउनलोड करें।" : "Download forms, brochures and guidelines."}</p>

      <h2 className="font-display text-xl font-bold text-white mt-10" data-testid="cv-templates-heading">
        {hi ? "Resume / CV Templates" : "Resume / CV Templates"}
      </h2>
      <p className="text-slate-400 mt-1 text-sm">{hi ? "Sarkari job applications के लिए professional CV templates — free download." : "Professional CV templates for govt job applications — free download."}</p>
      {templates.length === 0 ? (
        <div className="glass p-6 text-center text-slate-400 text-sm mt-4" data-testid="cv-templates-empty">
          {hi ? "Templates जल्द ही उपलब्ध होंगे।" : "Templates coming soon."}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mt-4" data-testid="cv-templates-grid">
          {templates.map((t) => (
            <a key={t.id} href={`${BACKEND}${t.url}`} target="_blank" rel="noreferrer" className="glass p-5 flex items-center gap-4 hover:border-emerald-500/40 transition" data-testid={`cv-template-${t.id}`}>
              <FaFileAlt className="text-emerald-400 text-3xl shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-white">{t.name}</div>
                <div className="text-xs text-slate-400 mt-1">{t.filename}{t.size ? ` · ${(t.size / 1024).toFixed(0)} KB` : ""}</div>
              </div>
              <FaFileDownload className="text-emerald-400 text-xl" />
            </a>
          ))}
        </div>
      )}

      <h2 className="font-display text-xl font-bold text-white mt-10">{hi ? "फॉर्म्स व गाइडलाइन" : "Forms & Guidelines"}</h2>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        {items.map((d, i) => (
          <a key={d.id} href={d.url} className="glass p-5 flex items-center gap-4 hover:border-emerald-500/40 transition" data-testid={`download-item-${i}`}>
            <FaFilePdf className="text-red-400 text-4xl shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-white">{hi ? d.title_hi : d.title_en}</div>
              <div className="text-xs text-slate-400 mt-1">{d.size}</div>
            </div>
            <FaFileDownload className="text-emerald-400 text-xl" />
          </a>
        ))}
      </div>
    </div>
  );
};

export default Downloads;
