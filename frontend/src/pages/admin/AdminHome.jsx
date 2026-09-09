import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaSearch, FaEdit, FaChevronRight, FaBriefcase, FaNewspaper, FaFileAlt,
  FaEye, FaStar, FaComments,
} from "react-icons/fa";
import { adminApi } from "./adminAuth";

const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-IN") : "—");

const StatCard = ({ icon: Icon, value, label, tint, testid }) => (
  <div className="admin-card rounded-2xl bg-white p-5" data-testid={testid}>
    <div className={`w-12 h-12 rounded-2xl grid place-items-center mb-4 ${tint}`}>
      <Icon className="text-xl" />
    </div>
    <div className="text-[28px] leading-none font-extrabold text-slate-900 tabular-nums">{value}</div>
    <div className="text-[13px] text-slate-500 mt-2 font-medium">{label}</div>
  </div>
);

const QuickCard = ({ to, icon: Icon, title, desc, testid }) => (
  <Link
    to={to}
    className="group block rounded-2xl bg-white border border-slate-200 p-5 hover:-translate-y-0.5 transition-all"
    data-testid={testid}
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 grid place-items-center">
        <Icon />
      </div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <FaChevronRight className="ml-auto text-slate-300 group-hover:text-emerald-600 transition-colors" />
    </div>
    <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
  </Link>
);

const AdminHome = () => {
  const [ov, setOv] = useState(null);

  useEffect(() => {
    adminApi.get("/admin/overview").then((r) => setOv(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="admin-home">
      <h1 className="text-[24px] font-extrabold text-slate-900 mb-1">Welcome back, Admin 👋</h1>
      <p className="text-sm text-slate-500 mb-6">HR Digital Services — overview of your site at a glance.</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4" data-testid="admin-overview">
        <StatCard icon={FaBriefcase} value={fmt(ov?.total_vacancies)} label="Total Vacancies" tint="bg-emerald-500/10 text-emerald-600" testid="stat-vacancies" />
        <StatCard icon={FaEye} value={fmt(ov?.total_views)} label="Total Views" tint="bg-violet-500/10 text-violet-600" testid="stat-views" />
        <StatCard icon={FaNewspaper} value={fmt(ov?.total_blogs)} label="Blog Posts" tint="bg-sky-500/10 text-sky-600" testid="stat-blogs" />
        <StatCard icon={FaStar} value={fmt(ov?.total_reviews)} label="Reviews" tint="bg-amber-500/10 text-amber-600" testid="stat-reviews" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FaBriefcase} value={fmt(ov?.manual_vacancies)} label="Manual Posts" tint="bg-teal-500/10 text-teal-600" testid="stat-manual" />
        <StatCard icon={FaEye} value={fmt(ov?.vacancy_views)} label="Vacancy Views" tint="bg-fuchsia-500/10 text-fuchsia-600" testid="stat-vac-views" />
        <StatCard icon={FaEye} value={fmt(ov?.blog_views)} label="Blog Views" tint="bg-indigo-500/10 text-indigo-600" testid="stat-blog-views" />
        <StatCard icon={FaComments} value={fmt(ov?.contacts)} label="Contacts" tint="bg-rose-500/10 text-rose-600" testid="stat-contacts" />
      </div>

      {/* Quick actions */}
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Manage</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <QuickCard to="/admin/vacancies" icon={FaBriefcase} title="Manual Vacancies"
          desc="Post your own jobs with apply link, important links & PDF attachments — never overwritten by auto-refresh."
          testid="admin-card-vacancies" />
        <QuickCard to="/admin/blogs" icon={FaNewspaper} title="Manage Posts"
          desc="Write articles with editor, images, SEO and per-post verification meta tags."
          testid="admin-card-blogs" />
        <QuickCard to="/admin/reviews" icon={FaStar} title="Reviews"
          desc="Moderate visitor reviews on posts & vacancies — hide or delete anytime."
          testid="admin-card-reviews" />
        <QuickCard to="/admin/job-seo" icon={FaSearch} title="Job SEO Manager"
          desc="Per-job SEO title, focus keyword, description + verification meta tag."
          testid="admin-card-job-seo" />
        <QuickCard to="/admin/resumes" icon={FaFileAlt} title="CV Templates"
          desc="Upload resume/CV templates for visitors to download."
          testid="admin-card-resumes" />
        <QuickCard to="/admin/content" icon={FaEdit} title="Front-page Text"
          desc="Update homepage hero, tagline, about blurb and footer contact info."
          testid="admin-card-content" />
      </div>
    </div>
  );
};

export default AdminHome;
