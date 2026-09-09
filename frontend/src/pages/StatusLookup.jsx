import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { FaSearch, FaCheckCircle, FaTimesCircle, FaFingerprint } from "react-icons/fa";

const StatusLookup = () => {
  const { lang } = useI18n();
  const [params] = useSearchParams();
  const [ref, setRef] = useState(params.get("ref") || "");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (refNo) => {
    if (!refNo) return;
    setLoading(true); setErr(""); setResult(null);
    try {
      const { data } = await api.get(`/status/${refNo}`);
      setResult(data);
    } catch {
      setErr(lang === "hi" ? "आवेदन नहीं मिला। रेफ नंबर जाँचें।" : "Application not found. Please check the reference number.");
    } finally { setLoading(false); }
  }, [lang]);

  useEffect(() => {
    const r = params.get("ref");
    if (r) search(r);
  }, [params, search]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12" data-testid="status-page">
      <div className="section-eyebrow">Track</div>
      <h1 className="section-title !text-3xl">{lang === "hi" ? "आवेदन स्थिति ट्रैक करें" : "Track Application Status"}</h1>
      <p className="text-slate-400 mt-2 text-sm">{lang === "hi" ? "अपना रेफ. नंबर डालें (जैसे SOL-XXXXXXXX या LOAN-XXXXXXXX)" : "Enter your Ref. No. (e.g. SOL-XXXXXXXX or LOAN-XXXXXXXX)"}</p>

      <form onSubmit={(e) => { e.preventDefault(); search(ref); }} className="flex gap-2 mt-6" data-testid="status-form">
        <div className="input-icon-wrap flex-1">
          <FaFingerprint className="icon" />
          <input className="input font-mono uppercase" placeholder="SOL-XXXXXXXX" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} data-testid="status-ref-input" />
        </div>
        <button disabled={loading} className="btn-mint" data-testid="status-search-btn"><FaSearch /> {loading ? "..." : lang === "hi" ? "खोजें" : "Search"}</button>
      </form>

      {err && <div className="mt-6 glass p-4 border-red-500/40 !bg-red-500/5 flex items-center gap-2 text-red-400" data-testid="status-error"><FaTimesCircle /> {err}</div>}

      {result && (
        <div className="mt-6 glass p-6 border-emerald-500/40" data-testid="status-result">
          <div className="flex items-center gap-3 mb-4">
            <FaCheckCircle className="text-emerald-400 text-2xl" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Reference Number</div>
              <div className="font-mono font-bold text-emerald-400 text-xl">{result.ref_no}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Name:</span> <b className="text-white">{result.full_name}</b></div>
            <div><span className="text-slate-500">Status:</span> <span className="badge badge-submitted">{result.status}</span></div>
            <div><span className="text-slate-500">Phone:</span> <span className="text-slate-200">{result.phone}</span></div>
            <div><span className="text-slate-500">City:</span> <span className="text-slate-200">{result.city}</span></div>
            <div className="col-span-2"><span className="text-slate-500">Submitted:</span> <span className="text-slate-200">{new Date(result.created_at).toLocaleString()}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusLookup;
