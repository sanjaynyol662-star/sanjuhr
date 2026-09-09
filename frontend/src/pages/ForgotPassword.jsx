import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import { FaEnvelope, FaLock, FaCheckCircle } from "react-icons/fa";

const ForgotPassword = () => {
  const { lang } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setDone(true);
      toast.success(lang === "hi" ? "अगर ईमेल मौजूद है, तो रीसेट लिंक भेज दिया गया।" : "If the email exists, a reset link has been sent.");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16" data-testid="forgot-password-page">
      <div className="signin-card">
        <span className="signin-pill">Reset password</span>
        <div className="signin-badge"><FaLock /></div>
        <h1 className="font-display text-2xl font-bold text-white mb-1">{lang === "hi" ? "पासवर्ड भूल गए?" : "Forgot password?"}</h1>
        <p className="text-sm text-slate-400 mb-5">
          {lang === "hi" ? "अपना ईमेल डालें, हम एक रीसेट लिंक भेजेंगे।" : "Enter your email — we'll send you a reset link."}
        </p>

        {done ? (
          <div className="text-center py-6" data-testid="forgot-success">
            <FaCheckCircle className="text-emerald-400 text-5xl mx-auto mb-3" />
            <p className="text-slate-300 text-sm">
              {lang === "hi" ? "अगर आपका खाता मौजूद है, तो आपके ईमेल में एक लिंक भेज दिया गया है। 1 घंटे में इसे उपयोग करें।" : "If your account exists, a reset link has been sent to your email. Use it within 1 hour."}
            </p>
            <Link to="/login" className="btn-mint mt-6 w-full" data-testid="back-to-login">
              {lang === "hi" ? "लॉगिन पर लौटें" : "Back to Sign in"}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <div className="input-icon-wrap">
                <FaEnvelope className="icon" />
                <input required type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="forgot-email-input" />
              </div>
            </div>
            <button disabled={loading} className="btn-mint w-full mt-2" data-testid="forgot-submit-btn">
              {loading ? "..." : (lang === "hi" ? "रीसेट लिंक भेजें" : "Send Reset Link")}
            </button>
          </form>
        )}
        <p className="text-xs text-center mt-5 text-slate-400">
          <Link to="/login" className="link-mint font-semibold" data-testid="back-to-login-link">← {lang === "hi" ? "लॉगिन पर लौटें" : "Back to Sign in"}</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
