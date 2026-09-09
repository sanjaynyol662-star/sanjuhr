import React, { useState } from "react";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import { FaMapMarkerAlt, FaPhone, FaWhatsapp, FaEnvelope, FaClock, FaUser, FaCommentDots } from "react-icons/fa";

const Contact = () => {
  const { t, lang } = useI18n();
  const [f, setF] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/contact", f);
      toast.success(lang === "hi" ? "संदेश भेज दिया गया!" : "Message sent!");
      setF({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch { toast.error("Failed to send"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="contact-page">
      <div className="section-eyebrow">Contact</div>
      <h1 className="section-title !text-3xl">{lang === "hi" ? "हमसे संपर्क करें" : "Contact Us"}</h1>
      <p className="text-slate-400 mt-2 text-sm">{lang === "hi" ? "किसी भी जानकारी के लिए कॉल, व्हाट्सएप या संदेश भेजें।" : "For any information, call, WhatsApp or send us a message."}</p>

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="md:col-span-1 space-y-3">
          {[
            { icon: FaMapMarkerAlt, title: lang === "hi" ? "पता" : "Address", val: "200 Mtr From Bus Stand, Begu–Bhadra Road, Kagdana, Sirsa, Haryana" },
            { icon: FaPhone, title: lang === "hi" ? "फ़ोन" : "Phone", val: "8167862016", href: "tel:8167862016" },
            { icon: FaWhatsapp, title: "WhatsApp", val: "8168762016", href: "https://wa.me/918168762016" },
            { icon: FaEnvelope, title: "Email", val: "haryanaenterpriseskagdana@gmail.com", href: "mailto:haryanaenterpriseskagdana@gmail.com" },
            { icon: FaClock, title: lang === "hi" ? "समय" : "Hours", val: "Mon-Sat: 9:00 AM - 7:00 PM" },
          ].map((c, i) => {
            const Icon = c.icon;
            const content = (
              <div className="glass p-4 flex items-start gap-3 hover:border-emerald-500/40 transition" data-testid={`contact-info-${i}`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0"><Icon /></div>
                <div>
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">{c.title}</div>
                  <div className="text-sm text-slate-300 break-all mt-1">{c.val}</div>
                </div>
              </div>
            );
            return c.href ? <a key={i} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{content}</a> : <div key={i}>{content}</div>;
          })}
        </div>

        <form onSubmit={submit} className="md:col-span-2 glass p-6 md:p-8 space-y-4" data-testid="contact-form">
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="label">{lang === "hi" ? "नाम" : "Name"} *</label>
              <div className="input-icon-wrap"><FaUser className="icon" /><input required className="input" value={f.name} onChange={set("name")} data-testid="contact-name-input" /></div>
            </div>
            <div><label className="label">Email *</label>
              <div className="input-icon-wrap"><FaEnvelope className="icon" /><input required type="email" className="input" value={f.email} onChange={set("email")} data-testid="contact-email-input" /></div>
            </div>
            <div><label className="label">{lang === "hi" ? "मोबाइल" : "Phone"}</label>
              <div className="input-icon-wrap"><FaPhone className="icon" /><input className="input" value={f.phone} onChange={set("phone")} data-testid="contact-phone-input" /></div>
            </div>
            <div><label className="label">{lang === "hi" ? "विषय" : "Subject"} *</label>
              <div className="input-icon-wrap"><FaCommentDots className="icon" /><input required className="input" value={f.subject} onChange={set("subject")} data-testid="contact-subject-input" /></div>
            </div>
          </div>
          <div><label className="label">{lang === "hi" ? "संदेश" : "Message"} *</label><textarea required rows="5" className="input" value={f.message} onChange={set("message")} data-testid="contact-message-input" /></div>
          <button disabled={loading} className="btn-mint" data-testid="contact-submit-btn">{loading ? "..." : <><i className="fa-solid fa-paper-plane"></i> {lang === "hi" ? "संदेश भेजें" : "Send Message"}</>}</button>
        </form>
      </div>
    </div>
  );
};

export default Contact;
