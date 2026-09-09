import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaPalette, FaSave, FaCheck, FaLock, FaLockOpen, FaTwitter, FaFacebook, FaInstagram, FaYoutube, FaWhatsapp, FaLink, FaUndo } from "react-icons/fa";
import { adminApi } from "./adminAuth";

const THEMES = [
  { key: "light", label: "Light", sw: ["#2f6bff", "#ffffff"], base: "light" },
  { key: "dark", label: "Dark", sw: ["#3b82f6", "#0b1220"], base: "dark" },
  { key: "system", label: "System", sw: ["#94a3b8", "#e2e8f0"], base: "auto" },
  { key: "luxury", label: "Luxury", sw: ["#9f2d2d", "#f5efe6"], base: "light" },
  { key: "retro", label: "Retro", sw: ["#4b6070", "#e5dcc3"], base: "light" },
  { key: "arctic", label: "Arctic", sw: ["#0f766e", "#eef7f6"], base: "light" },
  { key: "nature", label: "Nature", sw: ["#2f8a3b", "#eef6e9"], base: "light" },
  { key: "ember", label: "Ember", sw: ["#e8935a", "#1c1917"], base: "dark" },
  { key: "dracula", label: "Dracula", sw: ["#a855f7", "#1e1b2e"], base: "dark" },
  { key: "midnight", label: "Midnight", sw: ["#93b4f5", "#0f1830"], base: "dark" },
];
const PRIMARIES = ["#059669", "#2f6bff", "#60a5fa", "#475569", "#9f2d2d", "#0f766e", "#2f8a3b", "#e8935a", "#a855f7", "#ec4899", "#ef4444", "#f59e0b"];
const SOCIALS = [
  { k: "social_facebook", label: "Facebook", Icon: FaFacebook, ph: "https://facebook.com/yourpage" },
  { k: "social_twitter", label: "X (Twitter)", Icon: FaTwitter, ph: "https://x.com/yourpage" },
  { k: "social_instagram", label: "Instagram", Icon: FaInstagram, ph: "https://instagram.com/yourpage" },
  { k: "social_whatsapp", label: "WhatsApp", Icon: FaWhatsapp, ph: "https://wa.me/918168762016 ya channel link" },
  { k: "social_youtube", label: "YouTube", Icon: FaYoutube, ph: "https://youtube.com/@yourchannel" },
];
const inputCls = "w-full px-3 py-2 rounded border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm text-slate-900 bg-white";
const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v || "");

const AdminSite = () => {
  const [form, setForm] = useState({ default_theme: "light", default_primary: "", theme_locked: false, social_twitter: "", social_facebook: "", social_instagram: "", social_youtube: "", social_whatsapp: "" });
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    adminApi.get("/site-settings").then((r) => { setForm((p) => ({ ...p, ...r.data })); setSavedAt(r.data?.theme_updated_at || ""); }).catch(() => {});
  }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (form.default_primary && !isHex(form.default_primary)) { toast.error("Primary colour #RRGGBB format me hona chahiye"); return; }
    setBusy(true);
    try {
      const payload = { default_theme: form.default_theme, default_primary: form.default_primary || "", theme_locked: !!form.theme_locked };
      SOCIALS.forEach(({ k }) => { payload[k] = (form[k] || "").trim(); });
      const r = await adminApi.put("/admin/site-settings", payload);
      setSavedAt(r.data?.theme_updated_at || new Date().toISOString());
      toast.success("Saved — site par live ho gaya ✔");
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
    finally { setBusy(false); }
  };

  const cur = THEMES.find((t) => t.key === form.default_theme) || THEMES[0];
  const accent = isHex(form.default_primary) ? form.default_primary : cur.sw[0];

  return (
    <div data-testid="admin-site-page" className="max-w-4xl">
      <h1 className="text-[23px] font-normal text-slate-800 mb-1 flex items-center gap-2"><FaPalette className="text-blue-600" /> Site Theme &amp; Links</h1>
      <p className="text-sm text-slate-500 mb-5">Yahan se poori site ka theme colour aur "Stay Connected" links set karein — Save karte hi sabhi visitors ke liye live.</p>

      {/* Theme */}
      <div className="bg-white rounded border border-slate-200 shadow-sm mb-5" data-testid="site-theme-card">
        <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-800 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><FaPalette className="text-blue-600" /> Site Theme</span>
          {savedAt && <span className="text-[11px] font-normal text-slate-400" data-testid="theme-saved-at">Live since {new Date(savedAt).toLocaleString()}</span>}
        </div>
        <div className="p-4 space-y-5">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Theme</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {THEMES.map((t) => {
                const active = form.default_theme === t.key;
                return (
                  <button key={t.key} type="button" onClick={() => set("default_theme", t.key)}
                    className={`text-left rounded-lg border p-2.5 transition ${active ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                    data-testid={`site-theme-${t.key}`}>
                    <div className="h-10 rounded-md mb-2 relative overflow-hidden" style={{ background: t.sw[1], border: "1px solid rgba(0,0,0,.08)" }}>
                      <span className="absolute left-2 top-2 h-2 w-12 rounded-full" style={{ background: t.sw[0] }} />
                      <span className="absolute left-2 top-5 h-1.5 w-8 rounded-full" style={{ background: t.sw[0], opacity: 0.45 }} />
                      <span className="absolute right-2 bottom-2 h-3 w-6 rounded-sm" style={{ background: t.sw[0] }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-slate-800">{t.label}</span>
                      {active && <FaCheck className="text-blue-600 text-xs" />}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t.base}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Primary colour <span className="text-slate-400 font-normal">(optional — theme ka apna rang override karta hai)</span></label>
            <div className="flex flex-wrap items-center gap-2">
              {PRIMARIES.map((c) => {
                const active = (form.default_primary || "").toLowerCase() === c.toLowerCase();
                return (
                  <button key={c} type="button" onClick={() => set("default_primary", c)} className="w-9 h-9 rounded-lg grid place-items-center border border-black/10"
                    style={{ background: c, outline: active ? "2px solid #1d4ed8" : "none", outlineOffset: 2 }} title={c} data-testid={`site-primary-${c}`}>
                    {active && <FaCheck className="text-white text-xs drop-shadow" />}
                  </button>
                );
              })}
              <label className="w-9 h-9 rounded-lg overflow-hidden border border-slate-300 cursor-pointer" title="Custom">
                <input type="color" value={isHex(form.default_primary) ? form.default_primary : "#059669"} onChange={(e) => set("default_primary", e.target.value)} className="w-[150%] h-[150%] -m-2 cursor-pointer" data-testid="site-primary-custom" />
              </label>
              <input value={form.default_primary || ""} onChange={(e) => set("default_primary", e.target.value.trim())} placeholder="#059669" className={`${inputCls} !w-32 uppercase`} data-testid="site-primary-hex" />
              <button type="button" onClick={() => set("default_primary", "")} className="px-3 py-2 rounded text-xs font-semibold border border-slate-300 text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1.5" data-testid="site-primary-clear"><FaUndo /> Theme default</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-slate-200 p-3 bg-slate-50">
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">{form.theme_locked ? <FaLock className="text-blue-600" /> : <FaLockOpen className="text-slate-400" />} Sabhi visitors par lock karein</div>
              <p className="text-xs text-slate-500 mt-0.5">ON: site par theme switcher hide hoga, sab yahi theme dekhenge. OFF: default yahi hoga, par visitor apni pasand ka theme chun sakta hai.</p>
            </div>
            <button type="button" onClick={() => set("theme_locked", !form.theme_locked)} role="switch" aria-checked={!!form.theme_locked}
              className={`relative w-12 h-7 rounded-full transition shrink-0 ${form.theme_locked ? "bg-blue-600" : "bg-slate-300"}`} data-testid="site-theme-lock">
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition ${form.theme_locked ? "left-6" : "left-1"}`} />
            </button>
          </div>

          {/* Mini preview */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Preview</label>
            <div className="rounded-xl border border-slate-200 p-4" style={{ background: cur.sw[1] }} data-testid="site-theme-preview">
              <div className="flex items-center justify-between mb-3">
                <span className="h-2.5 w-24 rounded-full" style={{ background: accent }} />
                <span className="px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: accent }}>Button</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-lg p-2" style={{ background: cur.base === "dark" ? "rgba(255,255,255,.06)" : "#fff", border: `1px solid ${accent}33` }}>
                    <div className="h-1.5 w-3/4 rounded-full mb-1.5" style={{ background: cur.base === "dark" ? "#cbd5e1" : "#334155" }} />
                    <div className="h-1.5 w-1/2 rounded-full" style={{ background: accent, opacity: 0.7 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stay Connected links */}
      <div className="bg-white rounded border border-slate-200 shadow-sm mb-5" data-testid="site-social-card">
        <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-800 flex items-center gap-2"><FaLink className="text-blue-600" /> Stay Connected links (footer)</div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500">Footer ke "जुड़े रहें / Stay Connected" icons ke links. Jo khaali hoga uska icon click par home page par le jayega — link daalte hi click karne par woh page khulega.</p>
          {SOCIALS.map(({ k, label, Icon, ph }) => (
            <div key={k}>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5"><Icon className="text-blue-600" /> {label}</label>
              <input value={form[k] || ""} onChange={(e) => set(k, e.target.value)} placeholder={ph} className={inputCls} data-testid={`site-${k}`} />
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={busy}
        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60 mb-6"
        data-testid="site-settings-save">
        <FaSave /> {busy ? "Saving…" : "Save & go live"}
      </button>
    </div>
  );
};

export default AdminSite;
