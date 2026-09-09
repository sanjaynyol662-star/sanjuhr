import React, { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import Poster from "./Poster";
import { X, Download, Share2, Loader2, Upload, ImageOff } from "lucide-react";
import { SITE_NAME, SITE_BASE_URL } from "./config";

/*
  Self-contained Share popup. Drop it into ANY React app.
  Usage:
    const [open, setOpen] = useState(false);
    <button onClick={() => setOpen(true)}>Share Vacancy</button>
    {open && <ShareModal vacancy={vacancy} onClose={() => setOpen(false)} />}

  `vacancy` shape:
    { id, jobTitle, organization, totalPosts, qualification, lastDate,
      lastDateNote, jobType, location, selectionProcess, highlights: [] }
*/

const overlay = {
  position: "fixed", inset: 0, zIndex: 50, display: "flex",
  alignItems: "flex-start", justifyContent: "center",
  background: "rgba(0,0,0,0.6)", padding: 12, overflowY: "auto",
};
const card = {
  position: "relative", width: "100%", maxWidth: 780,
  borderRadius: 16, background: "#fff", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", margin: "16px 0",
  fontFamily: "'Poppins', sans-serif",
  color: "#0f172a",
};
const label = { display: "block", fontWeight: 600, color: "#12307a", marginBottom: 6, fontSize: 14 };
const input = {
  width: "100%", height: 48, borderRadius: 10, border: "1px solid #cbd5e1",
  padding: "0 14px", fontSize: 16, outline: "none", boxSizing: "border-box",
  background: "#ffffff", color: "#0f172a",
};
const btn = (bg) => ({
  height: 44, borderRadius: 10, border: "none", background: bg, color: "#fff",
  fontWeight: 700, fontSize: 15, padding: "0 16px", cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
});

// Small curated palette — vendors pick a poster accent that matches their shop
// branding. Order = navy default, emerald, red, orange, purple, teal, magenta, black.
const BRAND_COLORS = [
  { key: "navy",    val: "#12307a", label: "Navy" },
  { key: "emerald", val: "#059669", label: "Emerald" },
  { key: "red",     val: "#b91c1c", label: "Red" },
  { key: "orange",  val: "#ea580c", label: "Orange" },
  { key: "purple",  val: "#7c3aed", label: "Purple" },
  { key: "teal",    val: "#0d9488", label: "Teal" },
  { key: "magenta", val: "#be185d", label: "Magenta" },
  { key: "slate",   val: "#0f172a", label: "Slate" },
];

const ShareModal = ({ vacancy, onClose }) => {
  const [shopName, setShopName] = useState("");
  const [contact, setContact] = useState("");
  const [logo, setLogo] = useState(null);
  const [accentColor, setAccentColor] = useState(BRAND_COLORS[0].val);
  const [showPoster, setShowPoster] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [posterH, setPosterH] = useState(920);
  const posterRef = useRef(null);
  const previewWrapRef = useRef(null);

  const displayName = (shopName && shopName.trim()) || SITE_NAME;

  // Fit the 620px-wide poster into whatever preview area we have.
  // Uses CSS transform (not zoom) so it works consistently on Safari/Firefox
  // and doesn't affect html-to-image's DOM measurements during capture.
  useEffect(() => {
    if (!showPoster) return;
    const compute = () => {
      const isMobile = window.innerWidth < 640;
      // Give the preview container some breathing room but on tiny phones use
      // nearly the full screen width so the poster is still legible.
      const cardPad = isMobile ? 24 : 48;        // px total horizontal card padding
      const wrapPad = isMobile ? 12 : 32;        // px total horizontal preview padding
      const availW = Math.max(220, window.innerWidth - cardPad - wrapPad - 8);
      const sW = availW / 620;
      const s = Math.min(1, Math.max(0.34, sW));
      setPreviewScale(Number(s.toFixed(3)));
      // Measure the actual poster height so the wrapper reserves exact space
      // (avoids clipping OR leaving a huge empty gap under the scaled poster).
      if (posterRef.current) {
        setPosterH(posterRef.current.scrollHeight || 920);
      }
    };
    compute();
    // re-measure once fonts settle so tall-line-height posters aren't clipped
    const t = setTimeout(compute, 250);
    window.addEventListener("resize", compute);
    return () => { clearTimeout(t); window.removeEventListener("resize", compute); };
  }, [showPoster]);

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  // Wait for web fonts + one animation frame → then rasterize to PNG.
  // html-to-image embeds the fonts as data URIs into the exported SVG so text
  // never reflows between screen and download (fixes html2canvas timing bug).
  const capture = async () => {
    const node = posterRef.current;
    if (!node) return null;
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    } catch { /* fonts API missing → continue */ }
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
    return toPng(node, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: "#eef1f8",
      // Force capture at the poster's natural size regardless of preview scale
      width: 620,
      height: node.scrollHeight,
      style: { transform: "none", transformOrigin: "top left" },
    });
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const dataUrl = await capture();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `${displayName.replace(/\s+/g, "-")}-vacancy-poster.png`;
      link.href = dataUrl;
      link.click();
    } finally { setBusy(false); }
  };

  const handleWhatsApp = async () => {
    setBusy(true);
    try {
      const dataUrl = await capture();
      const url = `${SITE_BASE_URL}/vacancies/${vacancy.id}`;
      const parts = [
        `*${displayName}*`,
        "",
        `🔥 ${vacancy.jobTitle} 🔥`,
        vacancy.organization ? `🏢 ${vacancy.organization}` : null,
        `✅ Total Posts: ${vacancy.totalPosts}`,
        vacancy.qualification ? `🎓 Qualification: ${vacancy.qualification}` : null,
        `📅 Last Date: ${vacancy.lastDate}`,
        "",
        `👇 Full details:`,
        url,
      ].filter(Boolean);
      const text = encodeURIComponent(parts.join("\n"));
      if (dataUrl) {
        const link = document.createElement("a");
        link.download = `${displayName.replace(/\s+/g, "-")}-vacancy-poster.png`;
        link.href = dataUrl;
        link.click();
      }
      window.open(`https://wa.me/?text=${text}`, "_blank");
    } finally { setBusy(false); }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{ position: "absolute", right: 16, top: 16, zIndex: 10, border: "none", borderRadius: 999, background: "#f1f5f9", padding: 8, cursor: "pointer" }}
        >
          <X size={18} color="#475569" />
        </button>

        {!showPoster ? (
          <div style={{ padding: "20px 16px" }}>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: "#12307a", margin: 0 }}>Share This Vacancy</h3>
            <p style={{ marginTop: 6, fontSize: 14, color: "#64748b" }}>
              Enter your Shop / Center name — it appears on top of the poster. Leave blank to keep
              <b style={{ color: "#12307a" }}> {SITE_NAME}</b>.
            </p>

            <div style={{ marginTop: 22 }}>
              <label style={label}>Enter Your Shop / Center Name</label>
              <input autoFocus placeholder="e.g. HR Digital Services" value={shopName}
                onChange={(e) => setShopName(e.target.value)} style={input}
                onKeyDown={(e) => e.key === "Enter" && setShowPoster(true)} />
            </div>

            <div style={{ marginTop: 18 }}>
              <label style={label}>Phone / WhatsApp Number (optional)</label>
              <input placeholder="e.g. +91 81687 62016" value={contact}
                onChange={(e) => setContact(e.target.value)} style={input} />
            </div>

            <div style={{ marginTop: 18 }}>
              <label style={label}>Shop Logo (optional)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ display: "flex", height: 64, width: 64, flexShrink: 0, cursor: "pointer", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 12, border: "2px dashed #cbd5e1", background: "#f8fafc" }}>
                  {logo ? <img src={logo} alt="logo" style={{ height: "100%", width: "100%", objectFit: "contain" }} />
                        : <Upload size={20} color="#94a3b8" />}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogo} />
                </label>
                <div style={{ fontSize: 14, color: "#64748b" }}>
                  {logo ? (
                    <button onClick={() => setLogo(null)} style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "none", color: "#ef4444", fontWeight: 600, cursor: "pointer" }}>
                      <ImageOff size={14} /> Remove logo
                    </button>
                  ) : "Upload your center logo to show it beside the name. Leave empty for the default HR badge."}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <label style={label}>Brand Accent Color</label>
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
                data-testid="poster-accent-palette"
              >
                {BRAND_COLORS.map((c) => {
                  const selected = accentColor === c.val;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setAccentColor(c.val)}
                      data-testid={`poster-accent-${c.key}`}
                      aria-pressed={selected}
                      aria-label={`Choose ${c.label} accent`}
                      title={c.label}
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: c.val, cursor: "pointer",
                        border: selected ? "3px solid #0f172a" : "2px solid #e2e8f0",
                        boxShadow: selected ? "0 0 0 3px rgba(15,23,42,0.12)" : "0 2px 4px rgba(0,0,0,0.08)",
                        transform: selected ? "scale(1.1)" : "scale(1)",
                        transition: "all 0.15s",
                      }}
                    />
                  );
                })}
              </div>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                Pick a color that matches your shop's branding — used across the poster header, deadline pill and footer.
              </p>
            </div>

            <button onClick={() => setShowPoster(true)} style={{ ...btn("#16a34a"), width: "100%", height: 48, marginTop: 24, fontSize: 16, justifyContent: "center" }}>
              Generate Poster & Share
            </button>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#12307a", margin: 0 }}>Your Poster is Ready</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button onClick={() => setShowPoster(false)} style={{ ...btn("#fff"), color: "#334155", border: "1px solid #cbd5e1" }}>Edit</button>
                <button onClick={handleDownload} disabled={busy} style={btn("#12307a")} data-testid="poster-download-btn">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download
                </button>
                <button onClick={handleWhatsApp} disabled={busy} style={btn("#25d366")} data-testid="poster-whatsapp-btn">
                  <Share2 size={16} /> WhatsApp
                </button>
              </div>
            </div>
            {/* Preview scroller — uses CSS transform (not zoom) so html-to-image
                captures the poster at its natural 620px width without offset drift.
                The wrapper reserves the scaled height so nothing is clipped. */}
            <div
              ref={previewWrapRef}
              style={{
                display: "flex", justifyContent: "center", alignItems: "flex-start",
                borderRadius: 12, background: "#f1f5f9",
                padding: 6, overflow: "hidden",
              }}
              data-testid="poster-preview-wrap"
            >
              <div
                style={{
                  width: 620 * previewScale,
                  height: posterH * previewScale,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 620,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <Poster ref={posterRef} shopName={shopName} vacancy={vacancy} logo={logo} contact={contact} accentColor={accentColor} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
