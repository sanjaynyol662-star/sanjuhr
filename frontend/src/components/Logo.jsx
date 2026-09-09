import React from "react";

const LOGO_URL = "https://customer-assets-wrfwihn1.emergentagent.net/job_haryana-solar-app/artifacts/m1jq5awm_ChatGPT%20Image%20Aug%204%2C%202026%2C%2005_21_32%20PM.png";

/**
 * HR Digital Services brand logo (uploaded PNG).
 * The uploaded artwork has a white background, so we render it inside a
 * subtle white rounded tile that looks intentional on dark backgrounds.
 *
 * Props:
 *  - size: number (px)      — the outer tile dimension, default 44
 *  - variant: "tile" | "bare"
 *      "tile" (default) wraps the PNG in a rounded white tile with a soft shadow
 *      "bare" renders the raw image (use on light backgrounds only)
 *  - className: extra classes for the wrapper
 */
const Logo = ({ size = 44, variant = "tile", className = "" }) => {
  if (variant === "bare") {
    return (
      <img
        src={LOGO_URL}
        alt="HR Digital Services"
        width={size}
        height={size}
        className={`object-contain ${className}`}
        data-testid="brand-logo"
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-white shadow-[0_4px_18px_-6px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/20 ${className}`}
      style={{ width: size, height: size, padding: Math.max(2, Math.round(size * 0.06)) }}
      data-testid="brand-logo"
    >
      <img
        src={LOGO_URL}
        alt="HR Digital Services"
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  );
};

export default Logo;
