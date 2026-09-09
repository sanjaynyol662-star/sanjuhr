import React, { useMemo, useState, useRef, useEffect } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import {
  FaPalette, FaCheck, FaDesktop, FaSearch, FaBriefcase, FaRegClock,
  FaMapMarkerAlt, FaBuilding, FaArrowRight, FaChevronDown, FaBell, FaEyeDropper,
} from "react-icons/fa";

/* ---------------------------------------------------------------------------
   THEME PREVIEW (front-site) — self-contained, does NOT touch the live site.
   Demonstrates an Aurora-style light UI + a theme switcher (Light / Dark /
   System + colour presets) and a Primary-Color picker. All colours are driven
   by CSS variables scoped to this page's root, so nothing leaks elsewhere.
--------------------------------------------------------------------------- */

const THEMES = {
  light:    { label: "Light",    group: "default", sw: ["#2f6bff", "#ffffff"], v: { bg: "#f3f6fc", surface: "#ffffff", soft: "#eef2fb", text: "#1e293b", muted: "#64748b", border: "#e6eaf2", primary: "#2f6bff", heroA: "#eaf1ff", heroB: "#f7faff" } },
  dark:     { label: "Dark",     group: "default", sw: ["#3b82f6", "#0b1220"], v: { bg: "#0b1220", surface: "#141d2e", soft: "#1b2740", text: "#e6ebf5", muted: "#93a1b8", border: "#243146", primary: "#3b82f6", heroA: "#16223a", heroB: "#0b1220" } },
  system:   { label: "System",   group: "default", isSystem: true },
  luxury:   { label: "Luxury",   sw: ["#9f2d2d", "#f5efe6"], v: { bg: "#f6efe7", surface: "#fffaf4", soft: "#f2e6d8", text: "#3a2b25", muted: "#8a7266", border: "#e9dccd", primary: "#9f2d2d", heroA: "#f1e2d3", heroB: "#fbf5ee" } },
  retro:    { label: "Retro",    sw: ["#4b6070", "#e5dcc3"], v: { bg: "#ece3d1", surface: "#f8f3e7", soft: "#efe7d1", text: "#3b3a33", muted: "#7c766a", border: "#ddd2b6", primary: "#4b6070", heroA: "#e4d9bd", heroB: "#f6f0e0" } },
  arctic:   { label: "Arctic",   sw: ["#0f766e", "#eef7f6"], v: { bg: "#eef7f6", surface: "#ffffff", soft: "#e2f1ef", text: "#0f2a28", muted: "#5b7c78", border: "#d2e7e3", primary: "#0f766e", heroA: "#dcf0ec", heroB: "#f4fbfa" } },
  nature:   { label: "Nature",   sw: ["#2f8a3b", "#eef6e9"], v: { bg: "#eff6e9", surface: "#ffffff", soft: "#e3f0d8", text: "#22331d", muted: "#5f7a54", border: "#d9e8cb", primary: "#2f8a3b", heroA: "#e2f0d5", heroB: "#f6fbf1" } },
  ember:    { label: "Ember",    sw: ["#e8a877", "#1c1917"], v: { bg: "#171412", surface: "#221d18", soft: "#2c241d", text: "#f4e9df", muted: "#b59f8d", border: "#3a2f26", primary: "#e8935a", heroA: "#2a2019", heroB: "#171412" } },
  dracula:  { label: "Dracula",  sw: ["#a855f7", "#1e1b2e"], v: { bg: "#191527", surface: "#221d38", soft: "#2b2447", text: "#ece7fb", muted: "#a99fca", border: "#342c52", primary: "#a855f7", heroA: "#251f3f", heroB: "#191527" } },
  midnight: { label: "Midnight", sw: ["#93b4f5", "#0f1830"], v: { bg: "#0d1526", surface: "#152039", soft: "#1c2a49", text: "#e5edff", muted: "#8ea3c9", border: "#243352", primary: "#7aa2f0", heroA: "#182443", heroB: "#0d1526" } },
};

const PRIMARIES = ["#2f6bff", "#60a5fa", "#475569", "#9f2d2d", "#0f766e", "#2f8a3b", "#e8935a", "#a855f7", "#93b4f5"];

// Preset swatches shown inside the custom picker (like the reference image grid)
const SWATCH_GRID = [
  "#0b1220", "#334155", "#64748b", "#cbd5e1", "#10b981", "#059669", "#34d399", "#22d3ee",
  "#93c5fd", "#bfdbfe", "#e2e8f0", "#14b8a6", "#a7f3d0", "#2dd4bf", "#111827", "#f59e0b",
  "#f1f5f9", "#e5e7eb", "#f8fafc", "#fbbf24", "#fca5a5", "#f87171", "#0f172a", "#ffffff",
];

const isDarkTheme = (key) => ["dark", "ember", "dracula", "midnight"].includes(key);

const contrastText = (hex) => {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? "#0b1220" : "#ffffff";
};

const SAMPLE_JOBS = [
  { title: "India Post — Gramin Dak Sevak", org: "Department of Posts", posts: "23,757 Posts", last: "21 Sep 2026", loc: "All India" },
  { title: "SSC Combined Graduate Level (CGL)", org: "Staff Selection Commission", posts: "17,727 Posts", last: "24 Jul 2026", loc: "All India" },
  { title: "Haryana Police Constable", org: "HSSC", posts: "6,000 Posts", last: "30 Aug 2026", loc: "Haryana" },
  { title: "RRB NTPC Graduate Level", org: "Railway Recruitment Board", posts: "11,558 Posts", last: "12 Aug 2026", loc: "All India" },
];

const ThemeSwitcher = ({ themeKey, setThemeKey, primary, setPrimary }) => {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowCustom(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const isPreset = PRIMARIES.includes((primary || "").toLowerCase());
  const pickEyedropper = async () => {
    if (window.EyeDropper) {
      try {
        const res = await new window.EyeDropper().open();
        if (res?.sRGBHex) setPrimary(res.sRGBHex);
      } catch { /* cancelled */ }
    }
  };

  const Row = ({ k, indent }) => {
    const t = THEMES[k];
    const active = themeKey === k;
    return (
      <button
        onClick={() => { setThemeKey(k); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${indent ? "pl-7" : ""} ${active ? "bg-[var(--soft)]" : "hover:bg-[var(--soft)]"}`}
        data-testid={`theme-opt-${k}`}
      >
        <span className={`w-5 h-5 rounded-full grid place-items-center border ${active ? "bg-[var(--primary)] border-transparent" : "border-[var(--border)]"}`}>
          {active && <FaCheck className="text-[9px]" style={{ color: contrastText(primary) }} />}
        </span>
        <span className={`text-[15px] ${active ? "font-semibold text-[var(--primary)]" : "text-[var(--text)]"}`}>{t.label}</span>
        <span className="ml-auto flex items-center gap-1">
          {t.isSystem ? (
            <FaDesktop className="text-[var(--muted)]" />
          ) : (
            <>
              <span className="w-4 h-4 rounded-[4px] border border-[var(--border)]" style={{ background: t.sw[0] }} />
              <span className="w-4 h-4 rounded-[4px] border border-[var(--border)]" style={{ background: t.sw[1] }} />
            </>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-11 h-11 grid place-items-center rounded-full border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--soft)] transition"
        title="Change theme"
        data-testid="theme-switcher-btn"
      >
        <FaPalette />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-3 w-[320px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-2 z-50"
          data-testid="theme-switcher-panel"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <span className="flex items-center gap-2 text-[var(--primary)] font-bold">
              <span className="w-5 h-5 rounded-full bg-[var(--primary)] grid place-items-center"><FaCheck className="text-[9px]" style={{ color: contrastText(primary) }} /></span>
              Default
            </span>
            <FaChevronDown className="text-[var(--muted)] text-xs rotate-180" />
          </div>
          <Row k="light" indent />
          <Row k="dark" indent />
          <Row k="system" indent />
          <div className="my-1 border-t border-[var(--border)]" />
          {["luxury", "retro", "arctic", "nature", "ember", "dracula", "midnight"].map((k) => <Row key={k} k={k} />)}
          <div className="px-3 pt-3 pb-1">
            <div className="text-[15px] font-bold text-[var(--text)] mb-2">Primary Color</div>
            <div className="flex flex-wrap gap-2 items-center">
              {PRIMARIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setPrimary(c); setShowCustom(false); }}
                  className={`w-9 h-9 rounded-lg grid place-items-center transition ${primary === c ? "ring-2 ring-offset-2 ring-[var(--text)] ring-offset-[var(--surface)]" : ""}`}
                  style={{ background: c }}
                  data-testid={`primary-${c}`}
                >
                  {primary === c && <FaCheck className="text-xs" style={{ color: contrastText(c) }} />}
                </button>
              ))}
              {/* Custom color trigger (rainbow) */}
              <button
                onClick={() => setShowCustom((s) => !s)}
                className={`w-9 h-9 rounded-lg grid place-items-center transition ${!isPreset ? "ring-2 ring-offset-2 ring-[var(--text)] ring-offset-[var(--surface)]" : ""}`}
                style={{ background: "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)" }}
                title="Custom color"
                data-testid="primary-custom-btn"
              >
                {!isPreset && <FaCheck className="text-xs text-white drop-shadow" />}
              </button>
            </div>

            {showCustom && (
              <div className="mt-3 rounded-2xl border border-[var(--border)] p-3 bg-[var(--soft)]" data-testid="custom-color-panel">
                <div className="custom-picker"><HexColorPicker color={primary} onChange={setPrimary} /></div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={pickEyedropper}
                    className="w-9 h-9 rounded-lg grid place-items-center border border-[var(--border)] text-[var(--muted)] hover:text-[var(--primary)] disabled:opacity-40"
                    title="Pick from screen"
                    disabled={typeof window !== "undefined" && !window.EyeDropper}
                    data-testid="custom-eyedropper"
                  >
                    <FaEyeDropper />
                  </button>
                  <div className="flex-1 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2">
                    <span className="text-[var(--muted)] text-sm font-bold">#</span>
                    <HexColorInput
                      color={primary}
                      onChange={setPrimary}
                      className="flex-1 bg-transparent outline-none py-2 text-[var(--text)] text-sm uppercase tracking-wide"
                      data-testid="custom-hex-input"
                    />
                    <span className="text-[10px] text-[var(--muted)] font-bold">HEX</span>
                  </div>
                </div>
                <div className="grid grid-cols-8 gap-1.5 mt-3">
                  {SWATCH_GRID.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setPrimary(c)}
                      className="w-full aspect-square rounded-md border border-[var(--border)]"
                      style={{ background: c }}
                      data-testid={`custom-swatch-${i}`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-2">कोई भी रंग चुनें — फिर ऊपर से <b>Light</b> या <b>Dark</b> base चुनकर उसी रंग को light/dark में देखें।</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ThemePreview = () => {
  const [themeKey, setThemeKey] = useState("light");
  const [primary, setPrimary] = useState(null);

  const resolvedKey = themeKey === "system"
    ? (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : themeKey;

  const vars = useMemo(() => {
    const base = THEMES[resolvedKey].v;
    const p = primary || base.primary;
    return {
      "--bg": base.bg, "--surface": base.surface, "--soft": base.soft,
      "--text": base.text, "--muted": base.muted, "--border": base.border,
      "--primary": p, "--primary-fg": contrastText(p),
      "--hero-a": base.heroA, "--hero-b": base.heroB,
    };
  }, [resolvedKey, primary]);

  const dark = isDarkTheme(resolvedKey);

  return (
    <div style={vars} className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors" data-testid="theme-preview-root">
      <style>{`
        .custom-picker .react-colorful { width: 100%; height: 160px; }
        .custom-picker .react-colorful__saturation { border-radius: 10px 10px 0 0; }
        .custom-picker .react-colorful__hue { height: 16px; border-radius: 0 0 10px 10px; margin-top: 8px; border-radius: 10px; }
        .custom-picker .react-colorful__pointer { width: 18px; height: 18px; }
      `}</style>
      {/* preview ribbon */}
      <div className="text-center text-[13px] font-semibold py-2 bg-[var(--primary)]" style={{ color: "var(--primary-fg)" }} data-testid="preview-ribbon">
        PREVIEW — यह सिर्फ demo है, live site पर अभी कुछ नहीं बदला। ऊपर-दाएँ palette आइकन से theme बदलें।
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur border-b border-[var(--border)]" style={{ background: dark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)" }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] grid place-items-center font-extrabold" style={{ color: "var(--primary-fg)" }}>HR</div>
            <div className="leading-tight">
              <div className="font-extrabold">HR Digital Services</div>
              <div className="text-[11px] text-[var(--muted)]">सरकारी नौकरी · सोलर सेवाएँ</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 ml-6 text-[14px] font-semibold">
            {["भर्तियाँ", "ब्लॉग", "सेवाएँ", "संपर्क"].map((n, i) => (
              <a key={n} className={`px-3 py-2 rounded-lg ${i === 0 ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}>{n}</a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-[12px] font-bold border border-[var(--border)] text-[var(--muted)]">EN</span>
            <ThemeSwitcher themeKey={themeKey} setThemeKey={setThemeKey} primary={primary || THEMES[resolvedKey].v.primary} setPrimary={setPrimary} />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5" style={{ backgroundImage: "linear-gradient(135deg, var(--hero-a), var(--hero-b))" }}>
        <div className="max-w-6xl mx-auto py-14 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--primary)]">
            <FaBell /> 1000+ Live सरकारी भर्तियाँ
          </span>
          <h1 className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight">
            सरकारी नौकरी की <span className="text-[var(--primary)]">सटीक जानकारी</span>
          </h1>
          <p className="mt-3 text-[var(--muted)] max-w-2xl mx-auto">
            नवीनतम भर्तियाँ, admit card, result और आवेदन की अंतिम तिथि — सब एक जगह, हर रोज़ अपडेट।
          </p>
          <div className="mt-6 max-w-xl mx-auto flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2 shadow-sm">
            <FaSearch className="ml-2 text-[var(--muted)]" />
            <input className="flex-1 bg-transparent outline-none text-[var(--text)] placeholder-[var(--muted)] px-2" placeholder="job खोजें — जैसे gds, ssc, police…" />
            <button className="px-5 py-2.5 rounded-xl font-bold bg-[var(--primary)]" style={{ color: "var(--primary-fg)" }}>खोजें</button>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {[["1,033", "Vacancies"], ["28", "States"], ["Daily", "Updates"]].map(([a, b]) => (
              <div key={b} className="px-5 py-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="text-xl font-extrabold text-[var(--primary)]">{a}</div>
                <div className="text-[12px] text-[var(--muted)]">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vacancy grid */}
      <section className="max-w-6xl mx-auto px-5 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold">नवीनतम भर्तियाँ</h2>
          <a className="text-[14px] font-bold text-[var(--primary)] flex items-center gap-1.5">सभी देखें <FaArrowRight className="text-xs" /></a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SAMPLE_JOBS.map((j) => (
            <div key={j.title} className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 hover:-translate-y-0.5 transition-transform shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl grid place-items-center bg-[var(--soft)] text-[var(--primary)] shrink-0"><FaBriefcase /></div>
                <div className="min-w-0">
                  <h3 className="font-bold leading-snug">{j.title}</h3>
                  <p className="text-[13px] text-[var(--muted)] flex items-center gap-1.5 mt-1"><FaBuilding className="text-[11px]" /> {j.org}</p>
                </div>
                <span className="ml-auto text-[11px] font-bold px-2 py-1 rounded-full bg-[var(--soft)] text-[var(--primary)] shrink-0">{j.posts}</span>
              </div>
              <div className="flex items-center gap-4 mt-4 text-[12px] text-[var(--muted)]">
                <span className="flex items-center gap-1.5"><FaRegClock /> अंतिम तिथि: <b className="text-[var(--text)]">{j.last}</b></span>
                <span className="flex items-center gap-1.5"><FaMapMarkerAlt /> {j.loc}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 py-2.5 rounded-xl font-bold bg-[var(--primary)]" style={{ color: "var(--primary-fg)" }}>अभी आवेदन करें</button>
                <button className="px-4 py-2.5 rounded-xl font-bold border border-[var(--border)] text-[var(--text)]">विवरण</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8 text-center text-[13px] text-[var(--muted)]">
        © HR Digital Services — theme preview
      </footer>
    </div>
  );
};

export default ThemePreview;
