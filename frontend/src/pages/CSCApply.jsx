import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { CSC_CATEGORIES, findService } from "@/lib/cscServices";
import DocumentUploader from "@/components/DocumentUploader";
import { FaFileSignature, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaIdCard, FaChevronRight, FaCheckCircle } from "react-icons/fa";

const CSCApply = () => {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(params.get("service") || "aadhaar_update");
  const [f, setF] = useState({ full_name: "", email: "", phone: "", address: "", aadhaar_number: "", remarks: "", custom_service: "" });

  const svcInfo = useMemo(() => findService(selectedService), [selectedService]);

  useEffect(() => {
    if (user && typeof user === "object") {
      setF(v => ({ ...v, full_name: v.full_name || user.name || "", email: v.email || user.email || "", phone: v.phone || user.phone || "" }));
    }
  }, [user]);

  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!svcInfo.service) { toast.error("Please select a valid service"); return; }
    setLoading(true);
    try {
      const payload = { ...f, service_id: selectedService };
      const { data } = await api.post("/csc/apply", payload);
      toast.success(lang === "hi" ? `आवेदन जमा हुआ! रेफ नं: ${data.request.ref_no}` : `Submitted! Ref: ${data.request.ref_no}`);
      nav(user && typeof user === "object" ? "/dashboard" : `/status?ref=${data.request.ref_no}`);
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Submission failed");
    } finally { setLoading(false); }
  };

  const { service, category } = svcInfo;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10" data-testid="csc-apply-page">
      <div className="mb-4">
        <div className="section-eyebrow">CSC Portal</div>
        <h1 className="section-title !text-3xl">{lang === "hi" ? "CSC सेवा आवेदन" : "CSC Service Request"}</h1>
      </div>

      {service && (
        <div className="glass p-4 mb-6 flex flex-wrap items-center justify-between gap-3" data-testid="csc-selected-service">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="text-emerald-400 text-xl" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">{lang === "hi" ? "चयनित सेवा" : "Selected Service"}</div>
              <div className="font-semibold text-white">{lang === "hi" ? service.hi : service.en}</div>
              {category && <div className="text-xs text-slate-500">{lang === "hi" ? category.hi : category.en}</div>}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="glass p-6 md:p-8 space-y-5" data-testid="csc-apply-form">
        <div>
          <label className="label">{lang === "hi" ? "सेवा बदलें" : "Change service"}</label>
          <select className="input" value={selectedService} onChange={(e) => setSelectedService(e.target.value)} data-testid="csc-service-select">
            {CSC_CATEGORIES.map(cat => (
              <optgroup key={cat.id} label={lang === "hi" ? cat.hi : cat.en}>
                {cat.services.map(s => (
                  <option key={s.id} value={s.id}>
                    {lang === "hi" ? s.hi : s.en}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="label">{lang === "hi" ? "पूरा नाम" : "Full Name"} <span className="req">*</span></label>
            <div className="input-icon-wrap"><FaUser className="icon" /><input required className="input" value={f.full_name} onChange={set("full_name")} data-testid="csc-name-input" /></div>
          </div>
          <div><label className="label">{lang === "hi" ? "मोबाइल" : "Mobile"} <span className="req">*</span></label>
            <div className="input-icon-wrap"><FaPhone className="icon" /><input required className="input" value={f.phone} onChange={set("phone")} data-testid="csc-phone-input" /></div>
          </div>
          <div><label className="label">Email <span className="req">*</span></label>
            <div className="input-icon-wrap"><FaEnvelope className="icon" /><input required type="email" className="input" value={f.email} onChange={set("email")} data-testid="csc-email-input" /></div>
          </div>
          <div><label className="label">{lang === "hi" ? "आधार नंबर" : "Aadhaar Number"}</label>
            <div className="input-icon-wrap"><FaIdCard className="icon" /><input maxLength="12" className="input" value={f.aadhaar_number} onChange={set("aadhaar_number")} data-testid="csc-aadhaar-input" placeholder="XXXX-XXXX-XXXX" /></div>
          </div>
          <div className="md:col-span-2"><label className="label">{lang === "hi" ? "पता" : "Address"}</label>
            <div className="input-icon-wrap"><FaMapMarkerAlt className="icon" /><input className="input" value={f.address} onChange={set("address")} data-testid="csc-address-input" /></div>
          </div>
          {selectedService === "other_custom" && (
            <div className="md:col-span-2"><label className="label">{lang === "hi" ? "कौन सी सेवा चाहिए?" : "Which service do you need?"} <span className="req">*</span></label>
              <input required className="input" value={f.custom_service} onChange={set("custom_service")} placeholder={lang === "hi" ? "जैसे PMEGP लोन, विशेष अभियान..." : "e.g. PMEGP loan, special drive..."} data-testid="csc-custom-input" />
            </div>
          )}
          <div className="md:col-span-2"><label className="label">{lang === "hi" ? "टिप्पणी" : "Remarks"}</label>
            <textarea rows="3" className="input" value={f.remarks} onChange={set("remarks")} data-testid="csc-remarks-input" placeholder={lang === "hi" ? "अतिरिक्त जानकारी..." : "Any extra info..."} />
          </div>
        </div>

        {user && user !== false && (
          <div className="pt-4 border-t border-white/5">
            <label className="label">{lang === "hi" ? "आवश्यक दस्तावेज़ (वैकल्पिक)" : "Required Documents (optional)"}</label>
            <p className="text-xs text-slate-500 mb-3">{lang === "hi" ? "आधार, फोटो, पुराने कागज़ात आदि।" : "Aadhaar, photo, previous docs etc."}</p>
            <DocumentUploader />
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-white/5">
          <button type="submit" disabled={loading} className="btn-mint" data-testid="csc-submit-btn">
            {loading ? "..." : <><FaFileSignature /> {lang === "hi" ? "आवेदन जमा करें" : "Submit Request"} <FaChevronRight /></>}
          </button>
          <span className="text-xs text-slate-500">{lang === "hi" ? "जमा करने के बाद रेफ. नंबर मिलेगा।" : "You'll receive a reference number after submission."}</span>
        </div>
      </form>
    </div>
  );
};

export default CSCApply;
