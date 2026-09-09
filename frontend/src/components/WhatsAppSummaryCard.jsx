import React, { useState } from "react";
import { FaWhatsapp, FaCopy, FaCheck } from "react-icons/fa";
import { toast } from "sonner";
import { WHATSAPP_CHANNEL_URL, buildWhatsAppSummary } from "@/lib/whatsapp";

/** WhatsApp Smart Engine card — auto-generated summary + copy + channel join. */
const WhatsAppSummaryCard = ({ summary, vacancy, lang = "hi" }) => {
  const text = summary || buildWhatsAppSummary(vacancy || {});
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success(lang === "hi" ? "WhatsApp summary copy ho gayi!" : "WhatsApp summary copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass p-5 mb-6 !border-[#25D366]/40" data-testid="vacancy-whatsapp-summary-card">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="section-eyebrow !mb-0 flex items-center gap-2">
          <FaWhatsapp className="text-[#25D366]" /> WhatsApp Summary (Auto-Generated)
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-bold transition"
          data-testid="copy-whatsapp-summary-button"
        >
          {copied ? <FaCheck /> : <FaCopy />} {copied ? (lang === "hi" ? "कॉपी हो गया" : "Copied") : (lang === "hi" ? "कॉपी करें" : "Copy")}
        </button>
      </div>
      <pre className="hidden">{text}</pre>
      <a
        href={WHATSAPP_CHANNEL_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-4 relative overflow-hidden flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold py-3.5 transition"
        data-testid="vacancy-join-whatsapp-button"
      >
        <FaWhatsapp className="text-lg" />
        {lang === "hi" ? "WhatsApp Channel Join करें — हर नई भर्ती सबसे पहले" : "Join WhatsApp Channel — every new vacancy first"}
      </a>
    </div>
  );
};

export default WhatsAppSummaryCard;
