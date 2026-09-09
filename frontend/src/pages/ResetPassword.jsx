import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import { FaLock, FaEye, FaEyeSlash, FaShieldAlt } from "react-icons/fa";

const ResetPassword = () => {
  const { lang } = useI18n();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const token = params.get("token");

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error(lang === "hi" ? "पासवर्ड मेल नहीं खा रहे" : "Passwords do not match"); return; }
    if (!token) { toast.error("Missing token"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success(lang === "hi" ? "पासवर्ड अपडेट हो गया! अब लॉगिन करें।" : "Password updated! You can now sign in.");
      nav("/login", { replace: true });
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Reset failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16" data-testid="reset-password-page">
      <div className="signin-card">
        <span className="signin-pill">New password</span>
        <div className="signin-badge"><FaShieldAlt /></div>
        <h1 className="font-display text-2xl font-bold text-white mb-1">{lang === "hi" ? "नया पासवर्ड सेट करें" : "Set a new password"}</h1>
        <p className="text-sm text-slate-400 mb-5">{lang === "hi" ? "कम से कम 6 अक्षर।" : "Minimum 6 characters."}</p>

        {!token ? (
          <div className="text-sm text-red-400 text-center py-6">
            {lang === "hi" ? "अमान्य या टूटा हुआ लिंक।" : "Invalid or broken link."}
            <div className="mt-3">
              <Link to="/forgot-password" className="link-mint font-semibold">{lang === "hi" ? "नया लिंक मांगें" : "Request a new one"}</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">{lang === "hi" ? "नया पासवर्ड" : "New password"}</label>
              <div className="input-icon-wrap">
                <FaLock className="icon" />
                <input required minLength={6} type={showPw ? "text" : "password"} className="input pr-10" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="reset-password-input" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400">
                  {showPw ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">{lang === "hi" ? "पुष्टि करें" : "Confirm password"}</label>
              <div className="input-icon-wrap">
                <FaLock className="icon" />
                <input required minLength={6} type={showPw ? "text" : "password"} className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="reset-confirm-input" />
              </div>
            </div>
            <button disabled={loading} className="btn-mint w-full mt-2" data-testid="reset-submit-btn">
              {loading ? "..." : (lang === "hi" ? "पासवर्ड अपडेट करें" : "Update Password")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
