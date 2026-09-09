import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import {
  FaChartLine, FaUsers, FaSolarPanel, FaMoneyBillWave, FaEnvelope, FaBullhorn,
  FaTrash, FaPlus, FaFilePdf, FaCheckCircle, FaClock, FaTimesCircle, FaEye, FaChartPie, FaIdCard, FaSeedling
} from "react-icons/fa";
import AdminAnalytics from "@/components/AdminAnalytics";

const STATUS_OPTS = ["submitted", "under_review", "approved", "rejected"];
const CSC_STATUS_OPTS = ["submitted", "under_review", "approved", "rejected", "completed"];

const AdminPanel = () => {
  const { user, ready } = useAuth();
  const { lang } = useI18n();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [solar, setSolar] = useState([]);
  const [loan, setLoan] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [notices, setNotices] = useState([]);
  const [csc, setCsc] = useState([]);
  const [irrigation, setIrrigation] = useState([]);
  const [newNotice, setNewNotice] = useState({ title_hi: "", title_en: "", type: "info" });

  const loadAll = async () => {
    try {
      const [s, u, so, lo, co, no, cs, ir] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/solar"),
        api.get("/admin/loan"),
        api.get("/admin/contacts"),
        api.get("/notices"),
        api.get("/admin/csc"),
        api.get("/admin/irrigation"),
      ]);
      setStats(s.data); setUsers(u.data); setSolar(so.data);
      setLoan(lo.data); setContacts(co.data); setNotices(no.data); setCsc(cs.data); setIrrigation(ir.data);
    } catch (e) {
      if (e.response?.status !== 401 && e.response?.status !== 403) toast.error("Failed to load admin data");
    }
  };

  useEffect(() => { if (ready && user && user.role === "admin") loadAll(); /* eslint-disable-next-line */ }, [ready, user]);

  if (!ready) return <div className="p-10 text-center text-slate-500">Loading...</div>;
  if (!user || user === false) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="signin-card">
        <div className="signin-badge !bg-red-500/20 !text-red-400 mx-auto"><FaTimesCircle /></div>
        <h2 className="font-display text-xl font-bold text-white">Admin Access Required</h2>
        <p className="text-sm text-slate-400 mt-2">This section is restricted to administrators only.</p>
      </div>
    </div>
  );

  const updateStatus = async (kind, refNo, status) => {
    try {
      await api.patch(`/admin/${kind}/${refNo}/status`, { status });
      toast.success(`${refNo} → ${status}`);
      loadAll();
    } catch { toast.error("Failed to update status"); }
  };

  const addNotice = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/notices", newNotice);
      toast.success(lang === "hi" ? "सूचना जोड़ी गयी" : "Notice added");
      setNewNotice({ title_hi: "", title_en: "", type: "info" });
      loadAll();
    } catch { toast.error("Failed"); }
  };

  const deleteNotice = async (id) => {
    if (!window.confirm(lang === "hi" ? "क्या आप निश्चित हैं?" : "Are you sure?")) return;
    try {
      await api.delete(`/admin/notices/${id}`);
      toast.success(lang === "hi" ? "हटा दी गयी" : "Deleted");
      loadAll();
    } catch { toast.error("Failed"); }
  };

  const tabs = [
    { id: "overview", label: lang === "hi" ? "अवलोकन" : "Overview", icon: FaChartLine },
    { id: "analytics", label: lang === "hi" ? "विश्लेषण" : "Analytics", icon: FaChartPie },
    { id: "users", label: lang === "hi" ? "यूज़र्स" : "Users", icon: FaUsers },
    { id: "solar", label: lang === "hi" ? "सोलर" : "Solar", icon: FaSolarPanel },
    { id: "loan", label: lang === "hi" ? "लोन" : "Loan", icon: FaMoneyBillWave },
    { id: "csc", label: lang === "hi" ? "CSC" : "CSC", icon: FaIdCard },
    { id: "irrigation", label: lang === "hi" ? "सिंचाई" : "Irrigation", icon: FaSeedling },
    { id: "contacts", label: lang === "hi" ? "संपर्क" : "Contacts", icon: FaEnvelope },
    { id: "notices", label: lang === "hi" ? "सूचनाएँ" : "Notices", icon: FaBullhorn },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" data-testid="admin-page">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="section-eyebrow">Admin Panel</div>
          <h1 className="section-title !text-3xl">{lang === "hi" ? "एडमिन कंट्रोल पैनल" : "Admin Control Panel"}</h1>
          <p className="text-slate-400 mt-1 text-sm">{lang === "hi" ? "सभी आवेदन, यूज़र्स और CMS एक जगह पर।" : "All applications, users and CMS in one place."}</p>
        </div>
        <div className="chip">Signed in as <b className="ml-1 text-white">{user.name}</b></div>
      </div>

      {/* Tab bar */}
      <div className="glass p-2 flex gap-1 overflow-x-auto mb-6" data-testid="admin-tabs">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition ${tab === t.id ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-white"}`}
              data-testid={`admin-tab-${t.id}`}>
              <Icon /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Overview */}
      {tab === "overview" && stats && (
        <div className="space-y-6" data-testid="admin-overview">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { k: "users", label: lang === "hi" ? "कुल यूज़र्स" : "Total Users", icon: FaUsers, color: "from-sky-500 to-sky-700" },
              { k: "solar_apps", label: lang === "hi" ? "सोलर आवेदन" : "Solar Applications", icon: FaSolarPanel, color: "from-emerald-500 to-emerald-700" },
              { k: "loan_apps", label: lang === "hi" ? "लोन आवेदन" : "Loan Applications", icon: FaMoneyBillWave, color: "from-amber-500 to-amber-700" },
              { k: "contacts", label: lang === "hi" ? "संपर्क संदेश" : "Contact Msgs", icon: FaEnvelope, color: "from-purple-500 to-purple-700" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="glass p-5 flex items-start gap-4" data-testid={`overview-stat-${s.k}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${s.color} text-white`}><Icon /></div>
                  <div>
                    <div className="text-3xl font-display font-bold text-white">{stats[s.k]}</div>
                    <div className="text-xs text-slate-400 uppercase tracking-widest mt-1">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><FaSolarPanel className="text-emerald-400" /> {lang === "hi" ? "सोलर स्थिति" : "Solar Status"}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400 flex items-center gap-2"><FaClock className="text-amber-400" /> {lang === "hi" ? "लंबित" : "Pending"}</span><b className="text-amber-300">{stats.solar_pending}</b></div>
                <div className="flex justify-between"><span className="text-slate-400 flex items-center gap-2"><FaCheckCircle className="text-emerald-400" /> {lang === "hi" ? "स्वीकृत" : "Approved"}</span><b className="text-emerald-300">{stats.solar_approved}</b></div>
              </div>
            </div>
            <div className="glass p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><FaMoneyBillWave className="text-amber-400" /> {lang === "hi" ? "लोन स्थिति" : "Loan Status"}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400 flex items-center gap-2"><FaClock className="text-amber-400" /> {lang === "hi" ? "लंबित" : "Pending"}</span><b className="text-amber-300">{stats.loan_pending}</b></div>
                <div className="flex justify-between"><span className="text-slate-400 flex items-center gap-2"><FaCheckCircle className="text-emerald-400" /> {lang === "hi" ? "स्वीकृत" : "Approved"}</span><b className="text-emerald-300">{stats.loan_approved}</b></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics tab */}
      {tab === "analytics" && <AdminAnalytics />}

      {/* Users */}
      {tab === "users" && (
        <div className="glass p-4" data-testid="admin-users-table">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Provider</th><th>Joined</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} data-testid={`user-row-${u.id}`}>
                    <td className="font-semibold text-white">{u.name}</td>
                    <td className="text-slate-300">{u.email}</td>
                    <td>{u.phone}</td>
                    <td><span className={`badge ${u.role === "admin" ? "badge-approved" : "badge-review"}`}>{u.role}</span></td>
                    <td className="text-xs text-slate-400">{u.auth_provider}</td>
                    <td className="text-xs text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Solar Applications */}
      {(tab === "solar" || tab === "loan") && (
        <div className="glass p-4" data-testid={`admin-${tab}-table`}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Ref No</th><th>Name</th><th>Phone</th><th>Type</th><th>City</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {(tab === "solar" ? solar : loan).map(a => (
                  <tr key={a.id} data-testid={`admin-${tab}-row-${a.ref_no}`}>
                    <td className="font-mono font-bold text-emerald-400">{a.ref_no}</td>
                    <td className="font-semibold text-white">{a.full_name}</td>
                    <td>{a.phone}</td>
                    <td className="text-xs">{tab === "solar" ? a.application_type : a.loan_type}</td>
                    <td>{a.city}</td>
                    <td><span className={`badge ${a.status === "approved" ? "badge-approved" : a.status === "rejected" ? "badge-rejected" : a.status === "under_review" ? "badge-review" : "badge-submitted"}`}>{a.status}</span></td>
                    <td className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>
                      <select
                        value={a.status}
                        onChange={(e) => updateStatus(tab, a.ref_no, e.target.value)}
                        className="input !py-1 !px-2 !text-xs" data-testid={`status-select-${a.ref_no}`}>
                        {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Irrigation */}
      {tab === "irrigation" && (
        <div className="glass p-4" data-testid="admin-irrigation-table">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Ref No</th><th>Scheme</th><th>Name</th><th>Village</th><th>Land</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {irrigation.map(a => (
                  <tr key={a.id} data-testid={`admin-irrigation-row-${a.ref_no}`}>
                    <td className="font-mono font-bold text-emerald-400">{a.ref_no}</td>
                    <td>{lang === "hi" ? a.scheme_hi : a.scheme_en}</td>
                    <td className="font-semibold text-white">{a.full_name}</td>
                    <td>{a.village}, {a.district}</td>
                    <td>{a.land_area_acre ? `${a.land_area_acre} acre` : "-"}</td>
                    <td><span className={`badge ${a.status === "approved" || a.status === "completed" ? "badge-approved" : a.status === "rejected" ? "badge-rejected" : a.status === "under_review" ? "badge-review" : "badge-submitted"}`}>{a.status}</span></td>
                    <td className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>
                      <select value={a.status} onChange={(e) => updateStatus("irrigation", a.ref_no, e.target.value)} className="input !py-1 !px-2 !text-xs" data-testid={`irr-status-select-${a.ref_no}`}>
                        {CSC_STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {irrigation.length === 0 && <tr><td colSpan={8} className="text-center text-slate-500 py-8">No irrigation applications yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSC Requests */}
      {tab === "csc" && (
        <div className="glass p-4" data-testid="admin-csc-table">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Ref No</th><th>Service</th><th>Name</th><th>Phone</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {csc.map(a => (
                  <tr key={a.id} data-testid={`admin-csc-row-${a.ref_no}`}>
                    <td className="font-mono font-bold text-emerald-400">{a.ref_no}</td>
                    <td>{lang === "hi" ? a.service_hi : a.service_en}{a.custom_service ? ` — ${a.custom_service}` : ""}</td>
                    <td className="font-semibold text-white">{a.full_name}</td>
                    <td>{a.phone}</td>
                    <td><span className={`badge ${a.status === "approved" || a.status === "completed" ? "badge-approved" : a.status === "rejected" ? "badge-rejected" : a.status === "under_review" ? "badge-review" : "badge-submitted"}`}>{a.status}</span></td>
                    <td className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>
                      <select value={a.status} onChange={(e) => updateStatus("csc", a.ref_no, e.target.value)} className="input !py-1 !px-2 !text-xs" data-testid={`csc-status-select-${a.ref_no}`}>
                        {CSC_STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {csc.length === 0 && <tr><td colSpan={8} className="text-center text-slate-500 py-8">No CSC requests yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contacts */}
      {tab === "contacts" && (
        <div className="space-y-3" data-testid="admin-contacts">
          {contacts.map((c, i) => (
            <div key={i} className="glass p-4" data-testid={`contact-item-${i}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-semibold text-white">{c.name} <span className="text-slate-500 text-xs">· {c.email} · {c.phone || "-"}</span></div>
                  <div className="text-sm text-emerald-400 font-medium mt-0.5">{c.subject}</div>
                </div>
                <div className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString()}</div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{c.message}</p>
            </div>
          ))}
          {contacts.length === 0 && <div className="text-center text-slate-500 py-10">No contact messages yet.</div>}
        </div>
      )}

      {/* Notices CMS */}
      {tab === "notices" && (
        <div className="space-y-6" data-testid="admin-notices-cms">
          <form onSubmit={addNotice} className="glass p-5" data-testid="notice-add-form">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><FaPlus className="text-emerald-400" /> {lang === "hi" ? "नई सूचना जोड़ें" : "Add New Notice"}</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className="label">Title (Hindi)</label><input required className="input" value={newNotice.title_hi} onChange={(e) => setNewNotice(v => ({ ...v, title_hi: e.target.value }))} data-testid="notice-title-hi" /></div>
              <div><label className="label">Title (English)</label><input required className="input" value={newNotice.title_en} onChange={(e) => setNewNotice(v => ({ ...v, title_en: e.target.value }))} data-testid="notice-title-en" /></div>
              <div className="md:col-span-2">
                <label className="label">Type</label>
                <select className="input" value={newNotice.type} onChange={(e) => setNewNotice(v => ({ ...v, type: e.target.value }))} data-testid="notice-type-select">
                  <option value="info">Info</option><option value="update">Update</option><option value="important">Important</option>
                </select>
              </div>
            </div>
            <button className="btn-mint mt-4" data-testid="notice-add-btn"><FaPlus /> {lang === "hi" ? "जोड़ें" : "Add Notice"}</button>
          </form>

          <div className="glass p-4">
            <h3 className="font-semibold text-white mb-3">{lang === "hi" ? "मौजूदा सूचनाएँ" : "Existing Notices"} ({notices.length})</h3>
            <div className="space-y-2">
              {notices.map((n) => (
                <div key={n.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]" data-testid={`notice-row-${n.id}`}>
                  <div>
                    <div className="text-white font-medium font-hindi">{n.title_hi}</div>
                    <div className="text-xs text-slate-400">{n.title_en}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${n.type === "important" ? "badge-rejected" : n.type === "update" ? "badge-review" : "badge-submitted"}`}>{n.type}</span>
                    <button onClick={() => deleteNotice(n.id)} className="text-red-400 hover:text-red-300" data-testid={`notice-delete-${n.id}`} title="Delete"><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
