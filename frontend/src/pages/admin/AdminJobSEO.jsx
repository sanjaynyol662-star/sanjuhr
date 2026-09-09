import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaSearch, FaEdit, FaRandom, FaWhatsapp, FaTimes, FaSave, FaListUl } from "react-icons/fa";
import { adminApi } from "./adminAuth";
import api from "@/lib/api";
import { computeSeoScore } from "@/lib/utils-seo";
import VacancyForm from "./VacancyForm";

const inputCls = "mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-sm text-slate-900 bg-white";

/** Rank Math style per-job SEO manager — works on manual + scraped (API) vacancies. */
const AdminJobSEO = () => {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ seo_title: "", focus_keyword: "", seo_description: "", custom_head: "" });
  const [saving, setSaving] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [editingFull, setEditingFull] = useState(null); // full vacancy for detail edit

  const load = (p = page, query = q) => {
    setLoading(true);
    adminApi
      .get("/admin/vacancies-seo", { params: { page: p, per_page: 20, q: query } })
      .then((r) => setData(r.data))
      .catch((err) => toast.error(err?.response?.data?.detail || "Load failed"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page, q); /* eslint-disable-next-line */ }, [page]);

  const search = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, q);
  };

  const openEdit = (v) => {
    setEditing(v);
    setForm({ seo_title: v.seo_title || "", focus_keyword: v.focus_keyword || "", seo_description: v.seo_description || "", custom_head: v.custom_head || "" });
  };

  // Open the full details editor. Fetches the complete vacancy and normalises
  // scraped important_links ({kind,text,href}) to the manual shape ({label,url,type}).
  const openEditFull = async (v) => {
    try {
      const { data } = await api.get(`/vacancies/${v.id}`);
      const links = (data.important_links || []).map((l) => ({
        label: l.label || l.text || "Link",
        url: l.url || l.href || "",
        type: l.type || ((l.url || l.href || "").toLowerCase().split("?")[0].endsWith(".pdf") ? "pdf" : "link"),
      })).filter((l) => l.url);
      setEditingFull({ ...data, important_links: links });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not load vacancy");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.put(`/admin/vacancies/${editing.id}/seo`, form);
      toast.success("SEO save ho gayi — post ab Manual hai (Shuffle ab isse nahi badlega)");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const shuffle = async () => {
    setShuffling(true);
    try {
      const { data } = await adminApi.post("/admin/vacancies/shuffle-seo");
      toast.success(`${data.shuffled} API jobs ke Title/Description rotate ho gaye — ab Google ke liye unique`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Shuffle failed");
    } finally {
      setShuffling(false);
    }
  };

  const copyWa = async (v) => {
    if (!v.whatsapp_summary) return toast.error("Summary available nahi hai");
    try {
      await navigator.clipboard.writeText(v.whatsapp_summary);
      toast.success("WhatsApp summary copy ho gayi!");
    } catch {
      toast.error("Copy failed");
    }
  };

  const seo = computeSeoScore(form);

  return (
    <div data-testid="admin-job-seo-page">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Job SEO Manager</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Har job (manual + API) ke liye Rank Math style SEO — custom title, focus keyword, meta description.
            API jobs ka title/description shuffle karke duplicate content se bachein. Total: {data.total} jobs.
          </p>
        </div>
        <button
          onClick={shuffle}
          disabled={shuffling}
          className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 shadow"
          data-testid="admin-shuffle-seo-btn"
        >
          <FaRandom className={shuffling ? "animate-spin" : ""} /> Shuffle API SEO
        </button>
      </div>

      <form onSubmit={search} className="flex gap-2 mb-4 max-w-md">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Job title / organization search..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-sm bg-white"
            data-testid="admin-job-seo-search"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold" data-testid="admin-job-seo-search-btn">
          Search
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : data.items.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm" data-testid="admin-job-seo-empty">Koi job nahi mili.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-job-seo-table">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">SEO Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60" data-testid={`admin-job-seo-row-${v.id}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 line-clamp-1">{v.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{v.organization || "—"} · Last: {v.last_date_text || "—"} · {(v.views || 0).toLocaleString()} views</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${v.source === "manual" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
                        {v.source === "manual" ? "Manual" : "API"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${v.seo_title ? "text-green-700 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                        {v.seo_title ? "Custom SEO ✓" : "Default"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => copyWa(v)} title="Copy WhatsApp Summary" className="inline-flex p-2 rounded-md text-[#1ebe5d] hover:bg-green-50" data-testid={`admin-job-seo-wa-${v.id}`}>
                        <FaWhatsapp />
                      </button>
                      <button onClick={() => openEdit(v)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-emerald-700 hover:bg-emerald-50 text-xs font-semibold" data-testid={`admin-job-seo-edit-${v.id}`}>
                        <FaEdit /> Edit SEO
                      </button>
                      <button onClick={() => openEditFull(v)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-slate-700 hover:bg-slate-100 text-xs font-semibold" title="Edit all details (moves API post to Manual)" data-testid={`admin-job-seo-edit-full-${v.id}`}>
                        <FaListUl /> Edit Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap" data-testid="admin-job-seo-pagination">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 bg-white disabled:opacity-40" data-testid="admin-job-seo-prev">
            ← Prev
          </button>
          <span className="text-sm text-slate-600">Page {data.page} / {data.pages}</span>
          <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 bg-white disabled:opacity-40" data-testid="admin-job-seo-next">
            Next →
          </button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" data-testid="admin-job-seo-dialog">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit SEO</h2>
                <p className="text-xs text-slate-500 line-clamp-1">{editing.title}</p>
                {editing.source !== "manual" && (
                  <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Note: save karte hi yeh API post Manual ban jayegi (Shuffle ab isse nahi chhedega).</p>
                )}
              </div>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100" data-testid="admin-job-seo-close">
                <FaTimes />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-extrabold ${seo.score >= 75 ? "text-green-600" : seo.score >= 45 ? "text-amber-600" : "text-red-500"}`} data-testid="admin-job-seo-score">
                  {seo.score}/100
                </span>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${seo.score >= 75 ? "bg-green-500" : seo.score >= 45 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${seo.score}%` }} />
                </div>
              </div>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Custom SEO Title</span>
                <input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} className={inputCls} placeholder={editing.title} data-testid="admin-job-seo-title-input" />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Focus Keyword</span>
                <input value={form.focus_keyword} onChange={(e) => setForm({ ...form, focus_keyword: e.target.value })} className={inputCls} placeholder="e.g. Haryana Police Bharti 2026" data-testid="admin-job-seo-keyword-input" />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Meta Description</span>
                <textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} rows={3} className={inputCls} placeholder="120-160 chars ideal" data-testid="admin-job-seo-description-input" />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Verification code / Custom &lt;head&gt; meta tags</span>
                <textarea value={form.custom_head} onChange={(e) => setForm({ ...form, custom_head: e.target.value })} rows={3} className={`${inputCls} font-mono !text-xs`} placeholder={'<meta name="google-site-verification" content="xxxx" />'} data-testid="admin-job-seo-custom-head-input" />
                <span className="block text-[11px] text-slate-400 mt-1">Is post ke page ke &lt;head&gt; me inject hoga.</span>
              </label>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {seo.checks.map((c, i) => (
                  <li key={i} className={`text-[11px] flex items-center gap-1.5 ${c.ok ? "text-green-700" : "text-slate-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.ok ? "bg-green-500" : "bg-slate-300"}`} /> {c.label}
                  </li>
                ))}
              </ul>
              <button
                onClick={save}
                disabled={saving}
                className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold inline-flex items-center justify-center gap-2"
                data-testid="admin-job-seo-save"
              >
                <FaSave /> {saving ? "Saving…" : "Save SEO Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
      {editingFull && (
        <VacancyForm
          initial={editingFull}
          onClose={() => setEditingFull(null)}
          onSaved={() => { setEditingFull(null); toast.success("Post updated — ab yeh Manual hai (Shuffle isse nahi badlega)"); load(); }}
        />
      )}
    </div>
  );
};

export default AdminJobSEO;
