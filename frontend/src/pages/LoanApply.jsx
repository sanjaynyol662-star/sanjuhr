import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import DocumentUploader from "@/components/DocumentUploader";
import { FaMoneyCheckAlt } from "react-icons/fa";

const LoanApply = () => {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    loan_type: params.get("type") || "solar",
    full_name: "", email: "", phone: "", address: "", city: "Sirsa", state: "Haryana", pincode: "",
    occupation: "salaried", monthly_income: "", loan_amount: "", loan_tenure_months: 120,
    pan_number: "", aadhaar_number: "", notes: "",
  });

  useEffect(() => {
    if (user && typeof user === "object") {
      setF(v => ({ ...v, full_name: v.full_name || user.name || "", email: v.email || user.email || "", phone: v.phone || user.phone || "" }));
    }
  }, [user]);

  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...f, monthly_income: Number(f.monthly_income), loan_amount: Number(f.loan_amount), loan_tenure_months: Number(f.loan_tenure_months) };
      const { data } = await api.post("/loan/apply", payload);
      toast.success(lang === "hi" ? `आवेदन जमा हुआ! रेफ नं: ${data.application.ref_no}` : `Application submitted! Ref: ${data.application.ref_no}`);
      nav(user && typeof user === "object" ? "/dashboard" : `/status?ref=${data.application.ref_no}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  // EMI calculator (rough)
  const emi = (() => {
    const P = Number(f.loan_amount) || 0;
    const n = Number(f.loan_tenure_months) || 0;
    const r = 0.0575 / 12;
    if (P <= 0 || n <= 0) return 0;
    return Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10" data-testid="loan-apply-page">
      <div className="mb-2">
        <div className="section-eyebrow">Loan Portal</div>
        <h1 className="section-title !text-3xl">{t({ hi: "लोन आवेदन फॉर्म", en: "Loan Application Form" })}</h1>
      </div>
      <p className="text-slate-400 mt-2 mb-6 text-sm">{t({ hi: "सोलर, बिज़नेस या पर्सनल लोन के लिए आवेदन करें। 5-7 दिनों में मंज़ूरी।", en: "Apply for Solar, Business or Personal loan. Approval in 5-7 days." })}</p>

      <form onSubmit={submit} className="glass p-6 md:p-8 space-y-5" data-testid="loan-apply-form">
        <div>
          <label className="label">{t({ hi: "लोन प्रकार", en: "Loan Type" })} *</label>
          <select className="input" value={f.loan_type} onChange={set("loan_type")} data-testid="loan-type-select" required>
            <option value="solar">Solar Loan</option>
            <option value="business">Business Loan</option>
            <option value="personal">Personal Loan</option>
            <option value="home">Home Loan</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="label">{t({ hi: "पूरा नाम", en: "Full Name" })} *</label><input required className="input" value={f.full_name} onChange={set("full_name")} data-testid="loan-name-input" /></div>
          <div><label className="label">{t({ hi: "मोबाइल नंबर", en: "Mobile" })} *</label><input required className="input" value={f.phone} onChange={set("phone")} data-testid="loan-phone-input" /></div>
          <div><label className="label">Email *</label><input required type="email" className="input" value={f.email} onChange={set("email")} data-testid="loan-email-input" /></div>
          <div><label className="label">{t({ hi: "व्यवसाय", en: "Occupation" })}</label>
            <select className="input" value={f.occupation} onChange={set("occupation")} data-testid="loan-occupation-select">
              <option value="salaried">{t({ hi: "नौकरी", en: "Salaried" })}</option>
              <option value="self_employed">{t({ hi: "स्वरोज़गार", en: "Self-Employed" })}</option>
              <option value="business">{t({ hi: "व्यापार", en: "Business" })}</option>
              <option value="farmer">{t({ hi: "किसान", en: "Farmer" })}</option>
            </select>
          </div>
          <div className="md:col-span-2"><label className="label">{t({ hi: "पता", en: "Address" })} *</label><input required className="input" value={f.address} onChange={set("address")} data-testid="loan-address-input" /></div>
          <div><label className="label">{t({ hi: "शहर", en: "City" })}</label><input className="input" value={f.city} onChange={set("city")} data-testid="loan-city-input" /></div>
          <div><label className="label">{t({ hi: "पिनकोड", en: "Pincode" })} *</label><input required className="input" value={f.pincode} onChange={set("pincode")} data-testid="loan-pincode-input" /></div>
          <div><label className="label">{t({ hi: "मासिक आय (₹)", en: "Monthly Income (₹)" })} *</label><input required type="number" className="input" value={f.monthly_income} onChange={set("monthly_income")} data-testid="loan-income-input" /></div>
          <div><label className="label">{t({ hi: "लोन राशि (₹)", en: "Loan Amount (₹)" })} *</label><input required type="number" className="input" value={f.loan_amount} onChange={set("loan_amount")} data-testid="loan-amount-input" /></div>
          <div><label className="label">{t({ hi: "अवधि (महीने)", en: "Tenure (months)" })} *</label>
            <select className="input" value={f.loan_tenure_months} onChange={set("loan_tenure_months")} data-testid="loan-tenure-select">
              {[12, 24, 36, 48, 60, 84, 120].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div><label className="label">PAN {t({ hi: "(वैकल्पिक)", en: "(optional)" })}</label><input className="input" value={f.pan_number} onChange={set("pan_number")} data-testid="loan-pan-input" /></div>
          <div><label className="label">{t({ hi: "आधार", en: "Aadhaar" })} {t({ hi: "(वैकल्पिक)", en: "(optional)" })}</label><input className="input" value={f.aadhaar_number} onChange={set("aadhaar_number")} data-testid="loan-aadhaar-input" /></div>
          <div className="md:col-span-2"><label className="label">{t({ hi: "अतिरिक्त टिप्पणी", en: "Notes" })}</label><textarea rows="3" className="input" value={f.notes} onChange={set("notes")} data-testid="loan-notes-input" /></div>
        </div>

        {user && user !== false && (
          <div className="pt-4 border-t border-white/5">
            <label className="label">{t({ hi: "KYC दस्तावेज़ (वैकल्पिक)", en: "KYC Documents (optional)" })}</label>
            <p className="text-xs text-slate-500 mb-3">{t({ hi: "आधार, PAN, बैंक स्टेटमेंट, आय प्रमाण।", en: "Aadhaar, PAN, bank statement, income proof." })}</p>
            <DocumentUploader />
          </div>
        )}

        {emi > 0 && (
          <div className="glass p-4 flex items-center justify-between border-emerald-500/30 !bg-emerald-500/5" data-testid="emi-preview">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-widest">{t({ hi: "अनुमानित EMI (5.75% ब्याज · 0% प्रोसेसिंग)", en: "Estimated EMI (5.75% interest · 0% processing)" })}</div>
              <div className="text-3xl font-display font-bold text-emerald-400">₹ {emi.toLocaleString("en-IN")}<span className="text-sm font-normal text-slate-500"> / {t({ hi: "माह", en: "month" })}</span></div>
            </div>
            <div className="text-amber-400 text-4xl"><i className="fa-solid fa-calculator"></i></div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-white/5">
          <button type="submit" disabled={loading} className="btn-mint" data-testid="loan-submit-btn">
            {loading ? "..." : <><i className="fa-solid fa-paper-plane"></i> {t({ hi: "अभी आवेदन करें", en: "Apply Now" })}</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanApply;
