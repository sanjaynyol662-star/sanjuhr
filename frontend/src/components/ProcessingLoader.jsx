import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaLeaf } from "react-icons/fa";
import { useI18n } from "@/context/I18nContext";

/** Ekharid-style processing overlay shown briefly on route transitions. */
const ProcessingLoader = () => {
  const { lang } = useI18n();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [pct, setPct] = useState(12);

  useEffect(() => {
    setShow(true);
    setPct(12);
    let p = 12;
    const t = setInterval(() => {
      p = Math.min(96, p + Math.round(Math.random() * 22));
      setPct(p);
    }, 90);
    const hide = setTimeout(() => { setShow(false); clearInterval(t); }, 550);
    return () => { clearInterval(t); clearTimeout(hide); };
  }, [location.pathname]);

  if (!show) return null;
  return (
    <div className="proc-overlay" data-testid="processing-loader">
      <div className="proc-card">
        <div className="proc-icon-wrap"><FaLeaf /></div>
        <div className="proc-label">HARYANA</div>
        <div className="proc-title">{lang === "hi" ? "प्रोसेस हो रहा है…" : "Processing…"}</div>
        <div className="proc-sub">{lang === "hi" ? "आपका सत्र सुरक्षित हो रहा है" : "Securing your session"}</div>
        <div className="proc-bar"></div>
        <div className="proc-percent">{pct}%</div>
      </div>
    </div>
  );
};

export default ProcessingLoader;
