import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { FaWhatsapp, FaTelegram, FaYoutube, FaInstagram, FaMobileAlt, FaComments, FaExternalLinkAlt } from "react-icons/fa";

const CHANNELS = [
  { key: "channel_whatsapp", label: "WhatsApp Channel", icon: FaWhatsapp, cls: "bg-green-500/10 border-green-500/30 text-green-400" },
  { key: "channel_telegram", label: "Telegram Channel", icon: FaTelegram, cls: "bg-sky-500/10 border-sky-500/30 text-sky-400" },
  { key: "channel_arattai", label: "Arattai Channel", icon: FaComments, cls: "bg-orange-500/10 border-orange-500/30 text-orange-400" },
  { key: "channel_youtube", label: "YouTube", icon: FaYoutube, cls: "bg-red-500/10 border-red-500/30 text-red-400" },
  { key: "channel_instagram", label: "Instagram", icon: FaInstagram, cls: "bg-pink-500/10 border-pink-500/30 text-pink-400" },
  { key: "channel_app", label: "Download Mobile App", icon: FaMobileAlt, cls: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" },
];

/** Shows the site's OWN channel links (configured in admin) on post/vacancy pages. */
const ChannelLinks = ({ hi = false }) => {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get("/site-settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  const available = CHANNELS.filter((c) => settings && settings[c.key]);
  if (available.length === 0) return null;

  return (
    <div className="glass p-6 mt-8" data-testid="channel-links">
      <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
        <FaComments className="text-emerald-400" /> {hi ? "हमारे चैनल जॉइन करें" : "Join Our Channels"}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {available.map((c) => (
          <a
            key={c.key}
            href={settings[c.key]}
            target="_blank"
            rel="noreferrer"
            className={`p-3 rounded-lg border flex items-center gap-3 transition hover:scale-[1.01] ${c.cls}`}
            data-testid={`channel-${c.key}`}
          >
            <c.icon className="text-xl shrink-0" />
            <span className="text-sm text-white flex-1 font-medium">{c.label}</span>
            <FaExternalLinkAlt className="text-xs text-slate-500 shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
};

export default ChannelLinks;
