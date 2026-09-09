import React from "react";
import { FaWhatsapp, FaFacebook, FaTwitter, FaTelegram, FaLinkedin, FaLink } from "react-icons/fa";
import { toast } from "sonner";

const enc = encodeURIComponent;

/* One-click share of the current post to social platforms (opens the platform's share dialog). */
const SocialShare = ({ title, text, url, lang = "hi", className = "" }) => {
  const hi = lang === "hi";
  const link = url || (typeof window !== "undefined" ? window.location.href : "");
  const msg = `${title || ""}${text ? " — " + text : ""}`.trim();

  const targets = [
    { key: "whatsapp", label: "WhatsApp", Icon: FaWhatsapp, color: "#25D366", href: `https://wa.me/?text=${enc(`${msg}\n${link}`)}` },
    { key: "facebook", label: "Facebook", Icon: FaFacebook, color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}&quote=${enc(msg)}` },
    { key: "twitter", label: "X / Twitter", Icon: FaTwitter, color: "#1DA1F2", href: `https://twitter.com/intent/tweet?text=${enc(msg)}&url=${enc(link)}` },
    { key: "telegram", label: "Telegram", Icon: FaTelegram, color: "#229ED9", href: `https://t.me/share/url?url=${enc(link)}&text=${enc(msg)}` },
    { key: "linkedin", label: "LinkedIn", Icon: FaLinkedin, color: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link)}` },
  ];

  const open = (href) => window.open(href, "_blank", "noopener,noreferrer,width=640,height=560");
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast.success(hi ? "लिंक कॉपी हुआ" : "Link copied"); }
    catch { toast.error(hi ? "कॉपी नहीं हो पाया" : "Could not copy"); }
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`} data-testid="social-share">
      <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mr-1">{hi ? "शेयर करें" : "Share"}</span>
      {targets.map(({ key, label, Icon, color, href }) => (
        <button key={key} type="button" onClick={() => open(href)} className="social-icon social-share-btn" title={label} aria-label={`Share on ${label}`}
          style={{ "--share-c": color }} data-testid={`share-${key}`}>
          <Icon />
        </button>
      ))}
      <button type="button" onClick={copy} className="social-icon social-share-btn" title={hi ? "लिंक कॉपी" : "Copy link"} aria-label="Copy link"
        style={{ "--share-c": "var(--emerald)" }} data-testid="share-copy">
        <FaLink />
      </button>
    </div>
  );
};

export default SocialShare;
