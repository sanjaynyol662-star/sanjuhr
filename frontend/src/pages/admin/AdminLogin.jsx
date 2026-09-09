import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { FaLock, FaUser, FaSignInAlt, FaCog } from "react-icons/fa";
import { getAdminToken, setAdminToken } from "./adminAuth";

const AdminLogin = () => {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (getAdminToken()) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data?.user?.role !== "admin") {
        toast.error("Yeh account admin nahi hai");
        setBusy(false);
        return;
      }
      setAdminToken(data.access_token);
      toast.success("Welcome, admin");
      nav("/admin", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50" data-testid="admin-login-page">
      <div className="w-full max-w-md rounded-2xl shadow-2xl bg-white border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white grid place-items-center">
            <FaCog />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
            <p className="text-xs text-slate-500">HR Digital Services</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Email</span>
            <div className="mt-1 flex items-center gap-2 border border-slate-300 rounded-lg px-3 focus-within:border-emerald-500">
              <FaUser className="text-slate-400 text-sm" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-2.5 outline-none bg-transparent text-slate-900"
                data-testid="admin-login-email"
                autoComplete="username"
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Password</span>
            <div className="mt-1 flex items-center gap-2 border border-slate-300 rounded-lg px-3 focus-within:border-emerald-500">
              <FaLock className="text-slate-400 text-sm" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2.5 outline-none bg-transparent text-slate-900"
                data-testid="admin-login-password"
                autoComplete="current-password"
                required
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            data-testid="admin-login-submit"
          >
            <FaSignInAlt /> {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="mt-6 text-[11px] text-slate-500 leading-relaxed">
          This admin area is hidden from the public site. Only authorized personnel
          should log in. All actions are logged.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
