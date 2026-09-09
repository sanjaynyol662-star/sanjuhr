import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import DocumentUploader from "@/components/DocumentUploader";
import { FaWater, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaIdCard, FaSeedling, FaChevronRight } from "react-icons/fa";

const SCHEMES = [
  { id: "diggi", hi: "डिग्गी (Farm Pond)", en: "Diggi (Farm Pond)", sub_hi: "70%–85% सब्सिडी", sub_en: "70%–85% subsidy" },
  { id: "sprinkler", hi: "फव्वारा सिंचाई", en: "Sprinkler Irrigation", sub_hi: "85% तक", sub_en: "up to 85%" },
  { id: "drip", hi: "ड्रिप सिंचाई", en: "Drip Irrigation", sub_hi: "85% तक", sub_en: "up to 85%" },
  { id: "poplar", hi: "सफेदा (Poplar) बागवानी", en: "Poplar Plantation", sub_hi: "P23, P288 किस्म", sub_en: "P23, P288 varieties" },
  { id: "other", hi: "अन्य कृषि योजना", en: "Other Farm Scheme", sub_hi: "जो लागू हो", sub_en: "As applicable" },
];

const IrrigationApply = () => {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    scheme_type: params.get("scheme") || "diggi",
    full_name: "", email: "", phone: "", village: "", tehsil: "", district: "Sirsa", state: "Haryana",
    pincode: "", land_area_acre: "", khasra_number: "", aadhaar_number: "", crops: "", water_source: "tubewell",
    category: "general", notes: "",
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
      const payload = { ...f, land_area_acre: f.land_area_acre ? Number(f.land_area_acre) : null };
      const { data } = await api.post("/irrigation/apply", payload);
      toast.success(lang === "hi" ? `आवेदन जमा हुआ! रेफ नं: ${data.application.ref_no}` : `Submitted! Ref: ${data.application.ref_no}`);
      nav(user && typeof user === "object" ? "/dashboard" : `/status?ref=${data.application.ref_no}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally { setLoading(false); }
  };

  const selectedScheme = SCHEMES.find(s => s.id === f.scheme_type);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10" data-testid="irrigation-apply-page">
      <div className="mb-4">
        <div className="section-eyebrow">Farm & Irrigation</div>
        <h1 className="section-title !text-3xl">{lang === "hi" ? "माइक्रो सिंचाई / कृषि आवेदन" : "Micro Irrigation / Farm Application"}</h1>
      </div>

      {selectedScheme && (
        <div className="glass p-4 mb-6 flex items-center justify-between" data-testid="irrigation-scheme-summary">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center"><FaSeedling /></div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">{lang === "hi" ? "चयनित योजना" : "Selected Scheme"}</div>
              <div className="font-semibold text-white">{lang === "hi" ? selectedScheme.hi : selectedScheme.en}</div>
            </div>
          </div>
          <div className="chip !text-base">{lang === "hi" ? selectedScheme.sub_hi : selectedScheme.sub_en}</div>
        </div>
      )}

      <form onSubmit={submit} className="glass p-6 md:p-8 space-y-5" data-testid="irrigation-form">
        <div>
          <label className="label">{lang === "hi" ? "योजना चुनें" : "Choose scheme"} <span className="req">*</span></label>
          <select required className="input" value={f.scheme_type} onChange={set("scheme_type")} data-testid="scheme-select">
            {SCHEMES.map(s => <option key={s.id} value={s.id}>{lang === "hi" ? s.hi : s.en} — {lang === "hi" ? s.sub_hi : s.sub_en}</option>)}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="label">{lang === "hi" ? "पूरा नाम" : "Full Name"} <span className="req">*</span></label>
            <div className="input-icon-wrap"><FaUser className="icon" /><input required className="input" value={f.full_name} onChange={set("full_name")} data-testid="irr-name-input" /></div>
          </div>
          <div><label className="label">{lang === "hi" ? "मोबाइल" : "Mobile"} <span className="req">*</span></label>
            <div className="input-icon-wrap"><FaPhone className="icon" /><input required className="input" value={f.phone} onChange={set("phone")} data-testid="irr-phone-input" /></div>
          </div>
          <div><label className="label">Email <span className="req">*</span></label>
            <div className="input-icon-wrap"><FaEnvelope className="icon" /><input required type="email" className="input" value={f.email} onChange={set("email")} data-testid="irr-email-input" /></div>
          </div>
          <div><label className="label">{lang === "hi" ? "आधार" : "Aadhaar"}</label>
            <div className="input-icon-wrap"><FaIdCard className="icon" /><input maxLength="12" className="input" value={f.aadhaar_number} onChange={set("aadhaar_number")} data-testid="irr-aadhaar-input" /></div>
          </div>

          <div><label className="label">{lang === "hi" ? "गाँव" : "Village"} <span className="req">*</span></label>
            <div className="input-icon-wrap"><FaMapMarkerAlt className="icon" /><input required className="input" value={f.village} onChange={set("village")} data-testid="irr-village-input" /></div>
          </div>
          <div><label className="label">{lang === "hi" ? "तहसील" : "Tehsil"}</label>
            <input className="input" value={f.tehsil} onChange={set("tehsil")} data-testid="irr-tehsil-input" />
          </div>
          <div><label className="label">{lang === "hi" ? "ज़िला" : "District"}</label>
            <input className="input" value={f.district} onChange={set("district")} data-testid="irr-district-input" />
          </div>
          <div><label className="label">{lang === "hi" ? "पिनकोड" : "Pincode"}</label>
            <input className="input" value={f.pincode} onChange={set("pincode")} data-testid="irr-pincode-input" />
          </div>

          <div><label className="label">{lang === "hi" ? "भूमि क्षेत्रफल (एकड़)" : "Land Area (acre)"}</label>
            <input type="number" step="0.1" className="input" value={f.land_area_acre} onChange={set("land_area_acre")} data-testid="irr-area-input" />
          </div>
          <div><label className="label">{lang === "hi" ? "खसरा नंबर" : "Khasra Number"}</label>
            <input className="input" value={f.khasra_number} onChange={set("khasra_number")} data-testid="irr-khasra-input" />
          </div>
          <div><label className="label">{lang === "hi" ? "जल स्रोत" : "Water Source"}</label>
            <select className="input" value={f.water_source} onChange={set("water_source")} data-testid="irr-water-select">
              <option value="canal">{lang === "hi" ? "नहर" : "Canal"}</option>
              <option value="tubewell">{lang === "hi" ? "ट्यूबवेल" : "Tubewell"}</option>
              <option value="borewell">{lang === "hi" ? "बोरवेल" : "Borewell"}</option>
              <option value="pond">{lang === "hi" ? "तालाब" : "Pond"}</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div><label className="label">{lang === "hi" ? "श्रेणी" : "Category"}</label>
            <select className="input" value={f.category} onChange={set("category")} data-testid="irr-category-select">
              <option value="general">General</option>
              <option value="sc">SC</option>
              <option value="st">ST</option>
              <option value="obc">OBC</option>
              <option value="small">Small Farmer</option>
              <option value="marginal">Marginal Farmer</option>
            </select>
          </div>

          <div className="md:col-span-2"><label className="label">{lang === "hi" ? "मुख्य फसलें" : "Main Crops"}</label>
            <input className="input" value={f.crops} onChange={set("crops")} placeholder={lang === "hi" ? "जैसे कपास, गेहूँ, सरसों..." : "e.g. cotton, wheat, mustard..."} data-testid="irr-crops-input" />
          </div>
          <div className="md:col-span-2"><label className="label">{lang === "hi" ? "टिप्पणी" : "Notes"}</label>
            <textarea rows="3" className="input" value={f.notes} onChange={set("notes")} data-testid="irr-notes-input" />
          </div>
        </div>

        {user && user !== false && (
          <div className="pt-4 border-t border-white/5">
            <label className="label">{lang === "hi" ? "दस्तावेज़ (वैकल्पिक)" : "Documents (optional)"}</label>
            <p className="text-xs text-slate-500 mb-3">{lang === "hi" ? "आधार, जमाबंदी/खसरा, बैंक पासबुक।" : "Aadhaar, Jamabandi/Khasra, bank passbook."}</p>
            <DocumentUploader />
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-white/5">
          <button type="submit" disabled={loading} className="btn-mint" data-testid="irr-submit-btn">
            {loading ? "..." : <><FaWater /> {lang === "hi" ? "आवेदन जमा करें" : "Submit Application"} <FaChevronRight /></>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IrrigationApply;
