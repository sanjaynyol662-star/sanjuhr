import React, { useState } from "react";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import { FaBell, FaEnvelope, FaCheck, FaSpinner } from "react-icons/fa";

const CATEGORIES = [
  { key: "bank", hi: "बैंक", en: "Bank" },
  { key: "ssc", hi: "SSC", en: "SSC" },
  { key: "railway", hi: "रेलवे", en: "Railway" },
  { key: "police", hi: "पुलिस", en: "Police" },
  { key: "upsc", hi: "UPSC", en: "UPSC" },
  { key: "defence", hi: "रक्षा", en: "Defence" },
  { key: "teaching", hi: "शिक्षक", en: "Teacher" },
  { key: "medical", hi: "मेडिकल", en: "Medical" },
  { key: "psu", hi: "PSU", en: "PSU" },
  { key: "haryana", hi: "हरियाणा", en: "Haryana" },
];

const QUALIFICATIONS = [
  { key: "10th", hi: "10वीं", en: "10th" },
  { key: "12th", hi: "12वीं", en: "12th" },
  { key: "iti", hi: "ITI", en: "ITI" },
  { key: "diploma", hi: "डिप्लोमा", en: "Diploma" },
  { key: "graduate", hi: "स्नातक", en: "Graduate" },
  { key: "engineer", hi: "इंजीनियरिंग", en: "B.Tech/B.E" },
  { key: "post", hi: "पोस्ट ग्रेजुएट", en: "PG" },
];

const JobAlertSubscribe = () => {
  const { lang } = useI18n();
  const [email, setEmail] = useState("");
  const [cats, setCats] = useState([]);
  const [quals, setQuals] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const toggle = (arr, setArr, k) =>
    setArr(arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error(lang === "hi" ? "ईमेल आवश्यक है" : "Email required"); return; }
    if (cats.length === 0 && quals.length === 0 && !keyword.trim()) {
      toast.error(lang === "hi" ? "कम से कम एक श्रेणी, योग्यता या कीवर्ड चुनें" : "Pick at least one category, qualification or keyword");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/vacancy-alerts/subscribe", {
        email, categories: cats, qualifications: quals, keyword: keyword.trim() || null,
      });
      setDone(true);
      toast.success(lang === "hi" ? "सब्सक्राइब हो गया! नई भर्ती आते ही ईमेल मिलेगा।" : "Subscribed! You'll get an email when a matching job is posted.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Subscribe failed");
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="glass p-6 mb-6 border-emerald-500/30 flex items-center gap-4" data-testid="job-alert-success">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xl">
          <FaCheck />
        </div>
        <div>
          <div className="font-semibold text-white">
            {lang === "hi" ? "अलर्ट चालू हो गया ✔" : "Alerts activated ✔"}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {lang === "hi"
              ? `जब भी आपकी पसंद की नई भर्ती आएगी, ${email} पर ईमेल भेजेंगे।`
              : `We'll email ${email} the moment a matching job is posted.`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-5 mb-6" data-testid="job-alert-subscribe">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
        data-testid="job-alert-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FaBell className={expanded ? "" : "animate-pulse"} />
          </div>
          <div>
            <div className="font-semibold text-white text-sm md:text-base">
              {lang === "hi" ? "नई भर्ती का Free अलर्ट पाएं" : "Get FREE job alerts by email"}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {lang === "hi" ? "पसंदीदा श्रेणी / योग्यता चुनें — नई भर्ती आते ही ईमेल आएगा।" : "Pick categories & qualifications — we'll email you instantly."}
            </div>
          </div>
        </div>
        <span
          className={expanded
            ? "chip !mt-0 shrink-0 ml-2"
            : "wa-pop btn-mint !py-2 !px-4 !text-xs !rounded-full shrink-0 ml-2"}
          data-testid="job-alert-subscribe-cta"
        >
          {!expanded && <FaBell className="text-[11px]" />}
          {expanded ? (lang === "hi" ? "बंद करें" : "Hide") : (lang === "hi" ? "सब्सक्राइब करें" : "Subscribe")}
        </span>
      </button>

      {expanded && (
        <form onSubmit={submit} className="mt-4 space-y-4 border-t border-white/5 pt-4">
          <div className="input-icon-wrap">
            <FaEnvelope className="icon" />
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={lang === "hi" ? "अपना ईमेल दर्ज करें" : "Enter your email"}
              className="input" data-testid="alert-email"
            />
          </div>

          <div>
            <div className="text-[10px] uppercase text-slate-500 mb-2 tracking-widest">
              {lang === "hi" ? "श्रेणियाँ (कोई भी चुनें)" : "Categories (pick any)"}
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c.key} type="button"
                  onClick={() => toggle(cats, setCats, c.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    cats.includes(c.key)
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                      : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white"
                  }`}
                  data-testid={`alert-cat-${c.key}`}
                >
                  {lang === "hi" ? c.hi : c.en}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase text-slate-500 mb-2 tracking-widest">
              {lang === "hi" ? "योग्यता" : "Qualification"}
            </div>
            <div className="flex flex-wrap gap-2">
              {QUALIFICATIONS.map(q => (
                <button key={q.key} type="button"
                  onClick={() => toggle(quals, setQuals, q.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    quals.includes(q.key)
                      ? "bg-sky-500/15 text-sky-300 border-sky-500/40"
                      : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white"
                  }`}
                  data-testid={`alert-qual-${q.key}`}
                >
                  {lang === "hi" ? q.hi : q.en}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase text-slate-500 mb-2 tracking-widest">
              {lang === "hi" ? "कीवर्ड (वैकल्पिक)" : "Keyword (optional)"}
            </div>
            <input
              type="text" value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={lang === "hi" ? "जैसे: Haryana, teacher, engineer" : "e.g. Haryana, teacher, engineer"}
              className="input" data-testid="alert-keyword"
            />
          </div>

          <button
            type="submit" disabled={submitting}
            className="btn-mint w-full md:w-auto" data-testid="alert-submit"
          >
            {submitting ? <FaSpinner className="animate-spin" /> : <FaBell />}
            {submitting
              ? (lang === "hi" ? "सब्सक्राइब हो रहा है..." : "Subscribing...")
              : (lang === "hi" ? "फ्री अलर्ट चालू करें" : "Activate Free Alerts")}
          </button>
          <div className="text-[11px] text-slate-500">
            {lang === "hi" ? "स्पैम नहीं। कभी भी unsubscribe करें।" : "No spam. Unsubscribe anytime."}
          </div>
        </form>
      )}
    </div>
  );
};

export default JobAlertSubscribe;
