import React, { createContext, useContext, useEffect, useState } from "react";

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");
  useEffect(() => { localStorage.setItem("lang", lang); document.documentElement.lang = lang; }, [lang]);
  const t = (obj) => (typeof obj === "string" ? obj : obj?.[lang] ?? obj?.en ?? "");
  const toggle = () => setLang(l => (l === "hi" ? "en" : "hi"));
  return (
    <I18nContext.Provider value={{ lang, setLang, toggle, t }}>{children}</I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
