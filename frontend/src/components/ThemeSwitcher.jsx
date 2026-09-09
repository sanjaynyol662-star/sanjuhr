import React, { useEffect, useRef, useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { FaPalette, FaCheck, FaDesktop, FaEyeDropper, FaChevronDown, FaUndo } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import { useI18n } from "@/context/I18nContext";

const THEMES = [
  { key: "light", label: "Light", group: "default", sw: ["#2f6bff", "#ffffff"] },
  { key: "dark", label: "Dark", group: "default", sw: ["#3b82f6", "#0b1220"] },
  { key: "system", label: "System", group: "default", system: true },
  { key: "luxury", label: "Luxury", sw: ["#9f2d2d", "#f5efe6"] },
  { key: "retro", label: "Retro", sw: ["#4b6070", "#e5dcc3"] },
  { key: "arctic", label: "Arctic", sw: ["#0f766e", "#eef7f6"] },
  { key: "nature", label: "Nature", sw: ["#2f8a3b", "#eef6e9"] },
  { key: "ember", label: "Ember", sw: ["#e8935a", "#1c1917"] },
  { key: "dracula", label: "Dracula", sw: ["#a855f7", "#1e1b2e"] },
  { key: "midnight", label: "Midnight", sw: ["#93b4f5", "#0f1830"] },
];
const PRIMARIES = ["#059669", "#2f6bff", "#60a5fa", "#475569", "#9f2d2d", "#0f766e", "#2f8a3b", "#e8935a", "#a855f7"];
const SWATCH_GRID = ["#0b1220", "#334155", "#64748b", "#cbd5e1", "#10b981", "#059669", "#34d399", "#22d3ee", "#93c5fd", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#ef4444", "#f59e0b"];

const contrast = (hex) => {
  const c = (hex || "#000").replace("#", "");
  const f = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const r = parseInt(f.slice(0, 2), 16), g = parseInt(f.slice(2, 4), 16), b = parseInt(f.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? "#0b1220" : "#ffffff";
};

const ThemeSwitcher = () => {
  const { theme, setTheme, primary, setPrimary, locked } = useTheme();
  const { lang } = useI18n();
  const hi = lang === "hi";
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowCustom(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const curPrimary = primary || "#059669";
  const isPreset = PRIMARIES.map((c) => c.toLowerCase()).includes(curPrimary.toLowerCase());
  const pickEyedropper = async () => {
    if (window.EyeDropper) {
      try { const res = await new window.EyeDropper().open(); if (res?.sRGBHex) setPrimary(res.sRGBHex); } catch { /* cancelled */ }
    }
  };

  const Row = ({ t, indent }) => {
    const active = theme === t.key;
    return (
      <button
        onClick={() => setTheme(t.key)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${indent ? "pl-7" : ""}`}
        style={{ background: active ? "var(--emerald-soft)" : "transparent" }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--emerald-soft)"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
        data-testid={`theme-opt-${t.key}`}
      >
        <span className="w-5 h-5 rounded-full grid place-items-center shrink-0" style={{ background: active ? "var(--emerald)" : "transparent", border: active ? "none" : "1px solid var(--border-strong)" }}>
          {active && <FaCheck className="text-[9px]" style={{ color: contrast(curPrimary) }} />}
        </span>
        <span className="text-[14px]" style={{ color: active ? "var(--emerald-glow)" : "var(--text)", fontWeight: active ? 700 : 500 }}>{t.label}</span>
        <span className="ml-auto flex items-center gap-1">
          {t.system ? (
            <FaDesktop style={{ color: "var(--muted)" }} />
          ) : (
            <>
              <span className="w-4 h-4 rounded-[4px]" style={{ background: t.sw[0], border: "1px solid var(--border-strong)" }} />
              <span className="w-4 h-4 rounded-[4px]" style={{ background: t.sw[1], border: "1px solid var(--border-strong)" }} />
            </>
          )}
        </span>
      </button>
    );
  };

  if (locked) return null;

  return (
    <div className="relative" ref={ref}>
      <button className="a11y-btn" onClick={() => setOpen((o) => !o)} title={hi ? "थीम बदलें" : "Change theme"} aria-label="Theme palette" data-testid="theme-palette-btn">
        <FaPalette />
      </button>
      {open && (
        <div className="theme-switcher-panel absolute right-0 mt-2 w-[300px] rounded-2xl p-2 z-[80] max-h-[80vh] overflow-y-auto" data-testid="theme-switcher-panel">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="flex items-center gap-2 font-bold" style={{ color: "var(--emerald-glow)" }}>
              <span className="w-5 h-5 rounded-full grid place-items-center" style={{ background: "var(--emerald)" }}><FaCheck className="text-[9px]" style={{ color: contrast(curPrimary) }} /></span>
              {hi ? "थीम" : "Themes"}
            </span>
            <span className="flex items-center gap-2">
              {typeof window !== "undefined" && sessionStorage.getItem("harmonyPreview") === "1" && (
                <span className="harmony-badge" data-testid="harmony-preview-badge">Harmony</span>
              )}
              <FaChevronDown className="text-xs" style={{ color: "var(--muted)" }} />
            </span>
          </div>
          {THEMES.filter((t) => t.group === "default").map((t) => <Row key={t.key} t={t} indent />)}
          <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />
          {THEMES.filter((t) => !t.group).map((t) => <Row key={t.key} t={t} />)}

          <div className="px-3 pt-3 pb-1">
            <div className="text-[14px] font-bold mb-2" style={{ color: "var(--text)" }}>{hi ? "प्राइमरी रंग" : "Primary Color"}</div>
            <div className="flex flex-wrap gap-2 items-center">
              {PRIMARIES.map((c) => (
                <button key={c} onClick={() => { setPrimary(c === "#059669" ? "" : c); setShowCustom(false); }}
                  className="w-8 h-8 rounded-lg grid place-items-center transition"
                  style={{ background: c, outline: (curPrimary.toLowerCase() === c.toLowerCase()) ? "2px solid var(--text)" : "none", outlineOffset: "2px" }}
                  data-testid={`primary-${c}`}>
                  {curPrimary.toLowerCase() === c.toLowerCase() && <FaCheck className="text-xs" style={{ color: contrast(c) }} />}
                </button>
              ))}
              <button onClick={() => setShowCustom((s) => !s)}
                className="w-8 h-8 rounded-lg grid place-items-center transition"
                style={{ background: "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)", outline: !isPreset ? "2px solid var(--text)" : "none", outlineOffset: "2px" }}
                title={hi ? "कस्टम रंग" : "Custom color"} data-testid="primary-custom-btn">
                {!isPreset && <FaCheck className="text-xs text-white drop-shadow" />}
              </button>
            </div>

            {showCustom && (
              <div className="mt-3 rounded-2xl p-3" style={{ border: "1px solid var(--border)", background: "var(--emerald-soft)" }} data-testid="custom-color-panel">
                <HexColorPicker color={curPrimary} onChange={setPrimary} />
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={pickEyedropper} disabled={typeof window !== "undefined" && !window.EyeDropper}
                    className="w-9 h-9 rounded-lg grid place-items-center disabled:opacity-40"
                    style={{ border: "1px solid var(--border-strong)", color: "var(--muted)" }} title="Pick from screen" data-testid="custom-eyedropper">
                    <FaEyeDropper />
                  </button>
                  <div className="flex-1 flex items-center gap-2 rounded-lg px-2" style={{ border: "1px solid var(--border-strong)", background: "var(--panel-solid)" }}>
                    <span className="text-sm font-bold" style={{ color: "var(--muted)" }}>#</span>
                    <HexColorInput color={curPrimary} onChange={setPrimary} className="flex-1 bg-transparent outline-none py-2 text-sm uppercase" style={{ color: "var(--text)" }} data-testid="custom-hex-input" />
                    <span className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>HEX</span>
                  </div>
                </div>
                <div className="grid grid-cols-8 gap-1.5 mt-3">
                  {SWATCH_GRID.map((c, i) => (
                    <button key={i} onClick={() => setPrimary(c)} className="w-full aspect-square rounded-md" style={{ background: c, border: "1px solid var(--border)" }} data-testid={`custom-swatch-${i}`} />
                  ))}
                </div>
                <button onClick={() => { setPrimary(""); setShowCustom(false); }} className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold" style={{ border: "1px solid var(--border-strong)", color: "var(--text-dim)" }} data-testid="primary-reset">
                  <FaUndo /> {hi ? "थीम का डिफ़ॉल्ट रंग" : "Reset to theme default"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
