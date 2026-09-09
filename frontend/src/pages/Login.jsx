import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import { FaLock, FaEnvelope, FaGoogle, FaEye, FaEyeSlash, FaShieldAlt } from "react-icons/fa";

const Login = () => {
  const { login, googleLogin } = useAuth();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(lang === "hi" ? "स्वागत है!" : "Welcome!");
      nav(loc.state?.from || "/dashboard");
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Login failed");
    } finally { setLoading(false); }
  };

  const doGoogle = () => {
    // Redirects to Emergent Auth → returns to /dashboard with #session_id
    googleLogin();
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16" data-testid="login-page">
      <div className="signin-card">
        <span className="signin-pill">Sign in</span>
        <div className="signin-badge"><FaShieldAlt /></div>
        <h1 className="font-display text-2xl font-bold text-white mb-1">{lang === "hi" ? "आपका स्वागत है!" : "Welcome back!"}</h1>
        <p className="text-sm text-slate-400 mb-5">{lang === "hi" ? "अपने खाते में साइन इन करें।" : "Sign in to your account."}</p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">{lang === "hi" ? "ईमेल" : "Email"}</label>
            <div className="input-icon-wrap">
              <FaEnvelope className="icon" />
              <input required type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email-input" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label mb-0">{lang === "hi" ? "पासवर्ड" : "Password"}</label>
              <Link to="/forgot-password" className="text-xs link-mint" data-testid="forgot-password-link">
                {lang === "hi" ? "भूल गए?" : "Forgot?"}
              </Link>
            </div>
            <div className="input-icon-wrap mt-1.5">
              <FaLock className="icon" />
              <input required type={showPw ? "text" : "password"} className="input pr-10" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400">
                {showPw ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-mint w-full mt-2" data-testid="login-submit-btn">
            {loading ? "..." : (lang === "hi" ? "साइन इन" : "Sign in")}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Or continue with</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>
        <button onClick={doGoogle} className="btn-ghost w-full justify-center" data-testid="google-login-btn">
          <FaGoogle className="text-red-400" /> {lang === "hi" ? "Google से जारी रखें" : "Continue with Google"}
        </button>

        <p className="text-xs text-center mt-5 text-slate-400">
          {lang === "hi" ? "नए यूज़र?" : "New here?"} <Link to="/register" className="link-mint font-semibold" data-testid="link-to-register">{lang === "hi" ? "अकाउंट बनाएँ" : "Create account"}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
