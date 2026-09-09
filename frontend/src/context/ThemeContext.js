import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

/* Theme system for the public site. Re-maps the global CSS variables so the
   whole site re-skins instantly. Persists the visitor's choice in localStorage;
   first-time visitors get the admin-configured site default. */

export const THEME_KEYS = ["light", "dark", "system", "luxury", "retro", "arctic", "nature", "ember", "dracula", "midnight"];
const LIGHT_BASED = ["light", "luxury", "retro", "arctic", "nature"];
const THEME_CLASSES = ["theme-luxury", "theme-retro", "theme-arctic", "theme-nature", "theme-ember", "theme-dracula", "theme-midnight"];

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
const hexToRgb = (hex) => {
  const c = (hex || "").replace("#", "");
  const f = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};
const toHex = ([r, g, b]) => "#" + [r, g, b].map((x) => clamp(x).toString(16).padStart(2, "0")).join("");
const lighten = (hex, a) => { const [r, g, b] = hexToRgb(hex); return toHex([r + (255 - r) * a, g + (255 - g) * a, b + (255 - b) * a]); };
const darken = (hex, a) => { const [r, g, b] = hexToRgb(hex); return toHex([r * (1 - a), g * (1 - a), b * (1 - a)]); };
const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
const isValidHex = (hex) => /^#?[0-9a-fA-F]{6}$/.test(hex || "") || /^#?[0-9a-fA-F]{3}$/.test(hex || "");

const rgbToHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const hslToHex = (h, s, l) => {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
};
// Soft warm + cool companions for a custom primary (harmony palette)
const companions = (hex, light) => {
  const [, s] = rgbToHsl(hexToRgb(hex));
  const sat = Math.min(0.55, Math.max(0.35, s * 0.8));
  const lum = light ? 0.42 : 0.66;
  return [hslToHex(38, sat, lum), hslToHex(205, sat, lum)];
};

// Harmony preview: ?preview=harmony turns it on for this tab, ?preview=off turns it off.
export const HARMONY_KEY = "harmonyPreview";
const readHarmonyFlag = () => {
  if (typeof window === "undefined") return true;
  const p = new URLSearchParams(window.location.search).get("preview");
  if (p === "harmony") sessionStorage.setItem(HARMONY_KEY, "1");
  if (p === "off") { sessionStorage.setItem(HARMONY_KEY, "0"); return false; }
  const v = sessionStorage.getItem(HARMONY_KEY);
  return v === null ? true : v === "1";
};

const resolveTheme = (theme) =>
  theme === "system"
    ? (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;

const applyToBody = (theme, primary) => {
  if (typeof document === "undefined") return;
  const body = document.body;
  body.classList.remove("light-theme", ...THEME_CLASSES);
  const r = resolveTheme(theme);
  if (LIGHT_BASED.includes(r)) body.classList.add("light-theme");
  if (!["light", "dark"].includes(r)) body.classList.add(`theme-${r}`);

  // When a non-default theme OR a custom primary is active, remap hardcoded
  // emerald/green Tailwind utilities to the active accent (see themes.css).
  const themed = !["light", "dark"].includes(r) || (primary && isValidHex(primary));
  body.classList.toggle("has-theme", !!themed);
  body.classList.toggle("harmony", readHarmonyFlag());

  // Primary color → override the emerald accent family (inline on body = wins over any rule)
  const s = body.style;
  if (primary && isValidHex(primary)) {
    const p = primary.startsWith("#") ? primary : `#${primary}`;
    s.setProperty("--emerald", p);
    s.setProperty("--emerald-glow", lighten(p, 0.18));
    s.setProperty("--emerald-deep", darken(p, 0.14));
    s.setProperty("--emerald-soft", rgba(p, 0.12));
    const [warm, cool] = companions(p, LIGHT_BASED.includes(r));
    s.setProperty("--accent-2", warm);
    s.setProperty("--accent-3", cool);
  } else {
    s.removeProperty("--emerald");
    s.removeProperty("--emerald-glow");
    s.removeProperty("--emerald-deep");
    s.removeProperty("--emerald-soft");
    s.removeProperty("--accent-2");
    s.removeProperty("--accent-3");
  }
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("appTheme");
    if (saved && THEME_KEYS.includes(saved)) return saved;
    // legacy key from the old light/dark toggle
    const legacy = localStorage.getItem("lightTheme");
    if (legacy === "0") return "dark";
    return "light";
  });
  const [primary, setPrimaryState] = useState(() => localStorage.getItem("appPrimary") || "");
  const [locked, setLocked] = useState(false);

  // Admin-configured site theme goes LIVE for everyone: whenever the admin saves a new
  // default (theme_updated_at changes) every visitor adopts it; if locked, it always wins.
  useEffect(() => {
    api.get("/site-settings")
      .then((r) => {
        const dt = r.data?.default_theme;
        const dp = r.data?.default_primary || "";
        const stamp = r.data?.theme_updated_at || "";
        const isLocked = !!r.data?.theme_locked;
        setLocked(isLocked);
        const seen = localStorage.getItem("appThemeStamp") || "";
        const chosen = localStorage.getItem("appTheme") !== null;
        if (isLocked || !chosen || stamp !== seen) {
          if (dt && THEME_KEYS.includes(dt)) { setThemeState(dt); localStorage.setItem("appTheme", dt); }
          setPrimaryState(dp); localStorage.setItem("appPrimary", dp);
          localStorage.setItem("appThemeStamp", stamp);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { applyToBody(theme, primary); }, [theme, primary]);

  // react to OS change when on "system"
  useEffect(() => {
    if (theme !== "system" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => applyToBody("system", primary);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, [theme, primary]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    localStorage.setItem("appTheme", t);
    localStorage.setItem("lightTheme", LIGHT_BASED.includes(resolveTheme(t)) ? "1" : "0");
  }, []);

  const setPrimary = useCallback((p) => {
    const val = p || "";
    setPrimaryState(val);
    localStorage.setItem("appPrimary", val);
  }, []);

  const toggleLightDark = useCallback(() => {
    setTheme(LIGHT_BASED.includes(resolveTheme(theme)) ? "dark" : "light");
  }, [theme, setTheme]);

  const isLight = LIGHT_BASED.includes(resolveTheme(theme));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, primary, setPrimary, toggleLightDark, isLight, locked }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: "light", setTheme: () => {}, primary: "", setPrimary: () => {}, toggleLightDark: () => {}, isLight: true, locked: false };
  return ctx;
};
