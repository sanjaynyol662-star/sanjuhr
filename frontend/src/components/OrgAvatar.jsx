import React from "react";

const PALETTE = [
  ["#dbeafe", "#1d4ed8"], ["#dcfce7", "#15803d"], ["#fef3c7", "#b45309"], ["#fce7f3", "#be185d"],
  ["#ede9fe", "#6d28d9"], ["#cffafe", "#0e7490"], ["#ffedd5", "#c2410c"], ["#e0e7ff", "#4338ca"],
];
const DARK_PALETTE = [
  ["rgba(96,165,250,.18)", "#93c5fd"], ["rgba(74,222,128,.18)", "#86efac"], ["rgba(251,191,36,.18)", "#fcd34d"], ["rgba(244,114,182,.18)", "#f9a8d4"],
  ["rgba(167,139,250,.18)", "#c4b5fd"], ["rgba(34,211,238,.18)", "#67e8f9"], ["rgba(251,146,60,.18)", "#fdba74"], ["rgba(129,140,248,.18)", "#a5b4fc"],
];

const initials = (name) => {
  const words = String(name || "").replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};
const hash = (s) => [...String(s || "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const OrgAvatar = ({ name, className = "" }) => {
  const idx = hash(name) % PALETTE.length;
  const dark = typeof document !== "undefined" && !document.body.classList.contains("light-theme");
  const [bg, fg] = (dark ? DARK_PALETTE : PALETTE)[idx];
  return (
    <span
      className={`nu-icon font-display font-extrabold text-[13px] tracking-tight ${className}`}
      style={{ background: bg, color: fg }}
      title={name}
      data-testid="org-avatar"
    >
      {initials(name)}
    </span>
  );
};

export default OrgAvatar;
