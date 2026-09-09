import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import DocumentUploader from "@/components/DocumentUploader";
import { FaSolarPanel } from "react-icons/fa";

const SolarApply = () => {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    application_type: params.get("type") || "pm_surya_ghar",
    full_name: "", email: "", phone: "", address: "", city: "Sirsa", state: "Haryana", pincode: "",
    property_type: "residential", roof_area_sqft: "", estimated_kw: "", monthly_bill: "",
    electricity_provider: "DHBVN", consumer_number: "", aadhaar_number: "", notes: "",
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
      const payload = { ...f };
      ["roof_area_sqft", "estimated_kw", "monthly_bill"].forEach(k => { payload[k] = payload[k] ? Number(payload[k]) : null; });
      const { data } = await api.post("/solar/apply", payload);
      toast.success(lang === "hi" ? `आवेदन जमा हुआ! रेफ नं: ${data.application.ref_no}` : `Application submitted! Ref: ${data.application.ref_no}`);
      nav(user && typeof user === "object" ? "/dashboard" : `/status?ref=${data.application.ref_no}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10" data-testid="solar-apply-page">
      <div className="mb-2">
        <div className="section-eyebrow">Solar Portal</div>
        <h1 className="section-title !text-3xl">{t({ hi: "सोलर आवेदन फॉर्म", en: "Solar Application Form" })}</h1>
      </div>
      <p className="text-slate-400 mt-2 mb-6 text-sm">{t({ hi: "PM सूर्य घर, रूफटॉप सोलर या इंस्टॉलेशन के लिए आवेदन करें। हमारी टीम 24 घंटे में संपर्क करेगी।", en: "Apply for PM Surya Ghar, Rooftop Solar or Installation. Our team will contact you within 24 hours." })}</p>

      <form onSubmit={submit} className="glass p-6 md:p-8 space-y-5" data-testid="solar-apply-form">
        <div>
          <label className="label">{t({ hi: "आवेदन का प्रकार", en: "Application Type" })} *</label>
          <select className="input" value={f.application_type} onChange={set("application_type")} data-testid="solar-type-select" required>
            <option value="pm_surya_ghar">PM Surya Ghar Yojana</option>
            <option value="rooftop">Rooftop Solar Lead</option>
            <option value="installation">Installation Request</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="label">{t({ hi: "पूरा नाम", en: "Full Name" })} *</label><input required className="input" value={f.full_name} onChange={set("full_name")} data-testid="solar-name-input" /></div>
          <div><label className="label">{t({ hi: "मोबाइल नंबर", en: "Mobile" })} *</label><input required className="input" value={f.phone} onChange={set("phone")} data-testid="solar-phone-input" /></div>
          <div><label className="label">Email *</label><input required type="email" className="input" value={f.email} onChange={set("email")} data-testid="solar-email-input" /></div>
          <div><label className="label">{t({ hi: "प्रॉपर्टी प्रकार", en: "Property Type" })}</label>
            <select className="input" value={f.property_type} onChange={set("property_type")} data-testid="solar-property-select">
              <option value="residential">{t({ hi: "आवासीय", en: "Residential" })}</option>
              <option value="commercial">{t({ hi: "व्यावसायिक", en: "Commercial" })}</option>
              <option value="agriculture">{t({ hi: "कृषि", en: "Agriculture" })}</option>
            </select>
          </div>
          <div className="md:col-span-2"><label className="label">{t({ hi: "पता", en: "Address" })} *</label><input required className="input" value={f.address} onChange={set("address")} data-testid="solar-address-input" /></div>
          <div><label className="label">{t({ hi: "शहर", en: "City" })}</label><input className="input" value={f.city} onChange={set("city")} data-testid="solar-city-input" /></div>
          <div><label className="label">{t({ hi: "पिनकोड", en: "Pincode" })} *</label><input required className="input" value={f.pincode} onChange={set("pincode")} data-testid="solar-pincode-input" /></div>
          <div><label className="label">{t({ hi: "छत का क्षेत्रफल (वर्ग फुट)", en: "Roof Area (sqft)" })}</label><input type="number" className="input" value={f.roof_area_sqft} onChange={set("roof_area_sqft")} data-testid="solar-area-input" /></div>
          <div><label className="label">{t({ hi: "अनुमानित क्षमता (kW)", en: "Estimated Capacity (kW)" })}</label><input type="number" step="0.1" className="input" value={f.estimated_kw} onChange={set("estimated_kw")} data-testid="solar-kw-input" /></div>
          <div><label className="label">{t({ hi: "औसत मासिक बिल (₹)", en: "Avg Monthly Bill (₹)" })}</label><input type="number" className="input" value={f.monthly_bill} onChange={set("monthly_bill")} data-testid="solar-bill-input" /></div>
          <div><label className="label">{t({ hi: "बिजली कंपनी", en: "Electricity Provider" })}</label>
            <select className="input" value={f.electricity_provider} onChange={set("electricity_provider")} data-testid="solar-discom-select">
              <option>DHBVN</option><option>UHBVN</option><option>Other</option>
            </select>
          </div>
          <div><label className="label">{t({ hi: "उपभोक्ता संख्या", en: "Consumer Number" })}</label><input className="input" value={f.consumer_number} onChange={set("consumer_number")} data-testid="solar-consumer-input" /></div>
          <div><label className="label">{t({ hi: "आधार नंबर (वैकल्पिक)", en: "Aadhaar (optional)" })}</label><input className="input" value={f.aadhaar_number} onChange={set("aadhaar_number")} data-testid="solar-aadhaar-input" /></div>
          <div className="md:col-span-2"><label className="label">{t({ hi: "अतिरिक्त टिप्पणी", en: "Additional Notes" })}</label><textarea rows="3" className="input" value={f.notes} onChange={set("notes")} data-testid="solar-notes-input" /></div>
        </div>

        {user && user !== false && (
          <div className="pt-4 border-t border-white/5">
            <label className="label">{t({ hi: "दस्तावेज़ अपलोड (वैकल्पिक)", en: "Upload Documents (optional)" })}</label>
            <p className="text-xs text-slate-500 mb-3">{t({ hi: "आधार, बिजली बिल, फोटो — बाद में डैशबोर्ड से भी जोड़ सकते हैं।", en: "Aadhaar, electricity bill, photos — you can also add them later from the dashboard." })}</p>
            <DocumentUploader />
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-white/5">
          <button type="submit" disabled={loading} className="btn-mint" data-testid="solar-submit-btn">
            {loading ? "..." : <><i className="fa-solid fa-paper-plane"></i> {lang === "hi" ? "अभी आवेदन करें" : "Apply Now"}</>}
          </button>
          <span className="text-xs text-slate-400">{t({ hi: "फॉर्म सबमिट करने के बाद रेफ. नंबर मिलेगा।", en: "You will receive a reference number after submission." })}</span>
        </div>
      </form>
    </div>
  );
};

export default SolarApply;
