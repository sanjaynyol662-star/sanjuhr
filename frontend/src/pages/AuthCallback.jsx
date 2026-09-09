import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { FaSpinner } from "react-icons/fa";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = () => {
  const location = useLocation();
  const nav = useNavigate();
  const { refresh } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      nav("/login", { replace: true });
      return;
    }
    const sessionId = match[1];

    (async () => {
      try {
        await api.post("/auth/session", null, { headers: { "X-Session-ID": sessionId } });
        await refresh();
        toast.success("Signed in with Google");
        window.history.replaceState(null, "", "/dashboard");
        nav("/dashboard", { replace: true });
      } catch (e) {
        toast.error("Google sign-in failed");
        nav("/login?error=google", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center" data-testid="auth-callback">
      <div className="signin-card text-center max-w-sm">
        <div className="signin-badge mx-auto"><FaSpinner className="animate-spin" /></div>
        <h2 className="font-display text-xl font-bold text-white mb-1">Signing you in…</h2>
        <p className="text-sm text-slate-400">Please wait, verifying your Google session.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
