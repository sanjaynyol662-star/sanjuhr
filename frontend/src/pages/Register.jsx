import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import { FaUserPlus, FaEnvelope, FaLock, FaUser, FaPhone } from "react-icons/fa";

const Register = () => {
  const { register } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(f);
      toast.success(lang === "hi" ? "अकाउंट बना!" : "Account created!");
      nav("/dashboard");
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16" data-testid="register-page">
      <div className="signin-card">
        <span className="signin-pill">Register</span>
        <div className="signin-badge"><FaUserPlus /></div>
        <h1 className="font-display text-2xl font-bold text-white mb-1">{lang === "hi" ? "अकाउंट बनाएँ" : "Create Account"}</h1>
        <p className="text-sm text-slate-400 mb-5">{lang === "hi" ? "अपनी सभी applications एक जगह पर track करें।" : "Track all your applications in one place."}</p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">{lang === "hi" ? "पूरा नाम" : "Full name"} <span className="req">*</span></label>
            <div className="input-icon-wrap"><FaUser className="icon" /><input required className="input" value={f.name} onChange={set("name")} data-testid="reg-name-input" /></div>
          </div>
          <div>
            <label className="label">{lang === "hi" ? "ईमेल" : "Email"} <span className="req">*</span></label>
            <div className="input-icon-wrap"><FaEnvelope className="icon" /><input required type="email" className="input" value={f.email} onChange={set("email")} data-testid="reg-email-input" /></div>
          </div>
          <div>
            <label className="label">{lang === "hi" ? "मोबाइल" : "Mobile"} <span className="req">*</span></label>
            <div className="input-icon-wrap"><FaPhone className="icon" /><input required className="input" value={f.phone} onChange={set("phone")} data-testid="reg-phone-input" /></div>
          </div>
          <div>
            <label className="label">{lang === "hi" ? "पासवर्ड (न्यूनतम 6)" : "Password (min 6)"} <span className="req">*</span></label>
            <div className="input-icon-wrap"><FaLock className="icon" /><input required minLength={6} type="password" className="input" value={f.password} onChange={set("password")} data-testid="reg-password-input" /></div>
          </div>
          <button disabled={loading} className="btn-mint w-full mt-2" data-testid="reg-submit-btn">
            {loading ? "..." : (lang === "hi" ? "अकाउंट बनाएँ" : "Create Account")}
          </button>
        </form>

        <p className="text-xs text-center mt-5 text-slate-400">
          {lang === "hi" ? "पहले से खाता है?" : "Have an account?"} <Link to="/login" className="link-mint font-semibold" data-testid="link-to-login">{lang === "hi" ? "साइन इन करें" : "Sign in"}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
