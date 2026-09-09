import React, { useState, useEffect } from "react";
import { Outlet, Link, NavLink, useNavigate, Navigate } from "react-router-dom";
import {
  FaTachometerAlt, FaThumbtack, FaSearch, FaEdit, FaSignOutAlt, FaHome,
  FaBriefcase, FaNewspaper, FaFileAlt, FaBars, FaChartLine, FaImages, FaStar,
  FaMoon, FaRegSun, FaTimes, FaPalette,
} from "react-icons/fa";
import { getAdminToken, clearAdminToken } from "./adminAuth";
import "./admin-theme.css";

const NAV = [
  {
    section: "Overview",
    items: [
      { to: "/admin", end: true, label: "Dashboard", icon: FaTachometerAlt, testid: "admin-nav-dashboard" },
      { to: "/admin/search-analytics", label: "Search Analytics", icon: FaSearch, testid: "admin-nav-search-analytics" },
      { to: "/admin/integrations", label: "Analytics & SEO", icon: FaChartLine, testid: "admin-nav-integrations" },
    ],
  },
  {
    section: "Content",
    items: [
      { to: "/admin/blogs", label: "Posts", icon: FaThumbtack, testid: "admin-nav-blogs" },
      { to: "/admin/vacancies", label: "Vacancies", icon: FaBriefcase, testid: "admin-nav-vacancies" },
      { to: "/admin/slides", label: "News Slider", icon: FaImages, testid: "admin-nav-slides" },
      { to: "/admin/reviews", label: "Reviews", icon: FaStar, testid: "admin-nav-reviews" },
      { to: "/admin/resumes", label: "CV Templates", icon: FaFileAlt, testid: "admin-nav-resumes" },
    ],
  },
  {
    section: "Settings",
    items: [
      { to: "/admin/site", label: "Site Theme & Links", icon: FaPalette, testid: "admin-nav-site" },
      { to: "/admin/job-seo", label: "Job SEO", icon: FaSearch, testid: "admin-nav-job-seo" },
      { to: "/admin/seo", label: "Site SEO", icon: FaNewspaper, testid: "admin-nav-seo" },
      { to: "/admin/content", label: "Front-page Text", icon: FaEdit, testid: "admin-nav-content" },
    ],
  },
];

const AdminLayout = () => {
  const nav = useNavigate();
  const [open, setOpen] = useState(false); // mobile drawer
  const [dark, setDark] = useState(() => localStorage.getItem("admin-theme") === "dark");

  useEffect(() => {
    localStorage.setItem("admin-theme", dark ? "dark" : "light");
  }, [dark]);

  if (!getAdminToken()) return <Navigate to="/admin/login" replace />;

  const logout = () => {
    clearAdminToken();
    nav("/admin/login", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
      isActive
        ? "bg-emerald-500/[0.12] text-emerald-600"
        : "text-slate-500 hover:bg-slate-500/[0.08] hover:text-slate-800"
    }`;

  const Sidebar = (
    <aside
      className="w-[264px] shrink-0 h-full flex flex-col"
      style={{ backgroundColor: "var(--admin-surface)", borderRight: "1px dashed var(--admin-border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 h-[72px] shrink-0">
        <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white grid place-items-center font-extrabold shadow-lg shadow-emerald-500/30">
          HR
        </div>
        <div className="leading-tight">
          <div className="font-extrabold text-[15px] text-slate-900">HR Digital</div>
          <div className="text-[11px] text-slate-500">Admin Console</div>
        </div>
        <button onClick={() => setOpen(false)} className="ml-auto md:hidden p-2 rounded-lg hover:bg-slate-500/10 text-slate-500">
          <FaTimes />
        </button>
      </div>

      {/* Account chip */}
      <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl px-3 py-3" style={{ backgroundColor: "rgba(145,158,171,0.10)" }}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white grid place-items-center font-bold">A</div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-slate-800 truncate">Admin</div>
          <div className="text-[11px] text-slate-500 truncate">Administrator</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto admin-scroll px-4 py-2 space-y-4" data-testid="admin-nav">
        {NAV.map((grp) => (
          <div key={grp.section}>
            <div className="px-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{grp.section}</div>
            <div className="space-y-1">
              {grp.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className={linkClass} data-testid={it.testid} onClick={() => setOpen(false)}>
                  <it.icon className="text-[16px] w-5 shrink-0" /> {it.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
          data-testid="admin-logout"
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className={`admin-shell ${dark ? "dark" : ""} min-h-screen flex`} data-testid="admin-layout">
      {/* Desktop sidebar */}
      <div className="hidden md:block sticky top-0 h-screen">{Sidebar}</div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{Sidebar}</div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-40 h-[68px] flex items-center gap-3 px-4 md:px-8 backdrop-blur-md"
          style={{ backgroundColor: dark ? "rgba(22,28,36,0.8)" : "rgba(244,246,248,0.8)" }}
          data-testid="admin-topbar"
        >
          <button onClick={() => setOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-slate-500/10 text-slate-600" data-testid="admin-sidebar-toggle">
            <FaBars />
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setDark((d) => !d)}
              className="w-10 h-10 grid place-items-center rounded-full hover:bg-slate-500/10 text-slate-600 transition-colors"
              title={dark ? "Switch to light" : "Switch to dark"}
              data-testid="admin-theme-toggle"
            >
              {dark ? <FaRegSun className="text-amber-400 text-lg" /> : <FaMoon className="text-slate-600 text-lg" />}
            </button>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 grid place-items-center rounded-full hover:bg-slate-500/10 text-slate-600 transition-colors"
              title="Visit site"
              data-testid="admin-topbar-view-site"
            >
              <FaHome className="text-lg" />
            </a>
            <div className="ml-1 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white grid place-items-center font-bold text-sm">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 md:p-8" data-testid="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
