import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FaPlus, FaEdit, FaTrash, FaExternalLinkAlt, FaBriefcase, FaWhatsapp, FaRandom, FaSync, FaEye } from "react-icons/fa";
import { adminApi } from "./adminAuth";
import VacancyForm from "./VacancyForm";

const AdminVacancies = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);   // null = closed; {} = create; {id, ...} = edit
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    adminApi
      .get("/admin/vacancies")
      .then((r) => setItems(r.data || []))
      .catch((err) => toast.error(err?.response?.data?.detail || "Failed to load vacancies"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const [shuffling, setShuffling] = useState(false);
  const shuffleSeo = async () => {
    setShuffling(true);
    try {
      const { data } = await adminApi.post("/admin/vacancies/shuffle-seo");
      toast.success(`${data.shuffled} API jobs ke Title/Description rotate ho gaye`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Shuffle failed");
    } finally {
      setShuffling(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const refreshFeed = async () => {
    setRefreshing(true);
    try {
      const { data } = await adminApi.post("/admin/vacancies/refresh");
      toast.success(`Feed refreshed: +${data.new_added} new · ${data.total} total`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const copyWhatsApp = async (v) => {
    if (!v.whatsapp_summary) return toast.error("Summary available nahi hai");
    try {
      await navigator.clipboard.writeText(v.whatsapp_summary);
      toast.success("WhatsApp summary copy ho gayi!");
    } catch {
      toast.error("Copy failed");
    }
  };

  const doDelete = async (id) => {
    try {
      await adminApi.delete(`/admin/vacancies/${id}`);
      toast.success("Vacancy deleted");
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div data-testid="admin-vacancies-page">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Manual Job Posts</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Vacancies you add here appear alongside the auto-scraped feed on the
            public <Link to="/" className="text-emerald-700 underline">homepage</Link>.
            Auto-refresh will never overwrite them. Har job ki WhatsApp summary auto-generate hoti hai.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshFeed}
            disabled={refreshing}
            className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 shadow"
            data-testid="admin-refresh-feed-btn"
            title="Scrape latest jobs from sources into the public feed"
          >
            <FaSync className={refreshing ? "animate-spin" : ""} /> Refresh Feed
          </button>
          <button
            onClick={shuffleSeo}
            disabled={shuffling}
            className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 shadow"
            data-testid="admin-shuffle-seo-btn"
            title="API (scraped) jobs ke Title/Description rotate karein"
          >
            <FaRandom className={shuffling ? "animate-spin" : ""} /> Shuffle API SEO
          </button>
          <button
            onClick={() => setEditing({})}
            className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow"
            data-testid="admin-vacancies-add-btn"
          >
            <FaPlus /> Add Vacancy
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && items.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <FaBriefcase className="text-4xl text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-4">
            No manual vacancies yet. Add your first one to start showing custom posts.
          </p>
          <button
            onClick={() => setEditing({})}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-2"
            data-testid="admin-vacancies-empty-add-btn"
          >
            <FaPlus /> Add First Vacancy
          </button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm" data-testid="admin-vacancies-table">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider">
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Organization</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Mode</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Last Date</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Views</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`admin-vac-row-${v.id}`}>
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-md">
                    <Link to={`/vacancies/${v.id}`} target="_blank" className="hover:text-emerald-700 inline-flex items-center gap-1.5">
                      <span className="line-clamp-2">{v.title}</span>
                      <FaExternalLinkAlt className="text-[9px] text-slate-400 shrink-0" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{v.organization || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell capitalize">{v.category || "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {v.application_mode ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        v.application_mode === "online" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>{v.application_mode}</span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{v.last_date_text || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell" data-testid={`admin-vac-views-${v.id}`}>
                    <span className="inline-flex items-center gap-1"><FaEye className="text-slate-400 text-[11px]" /> {(v.views || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => copyWhatsApp(v)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[#1ebe5d] hover:bg-green-50 text-xs"
                      data-testid={`admin-vac-whatsapp-${v.id}`}
                      title="Copy WhatsApp Summary"
                    >
                      <FaWhatsapp /> <span className="hidden md:inline">WhatsApp</span>
                    </button>
                    <button
                      onClick={() => setEditing(v)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-slate-700 hover:bg-slate-200 text-xs"
                      data-testid={`admin-vac-edit-${v.id}`}
                      title="Edit"
                    >
                      <FaEdit /> <span className="hidden md:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(v)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-red-700 hover:bg-red-50 text-xs ml-1"
                      data-testid={`admin-vac-delete-${v.id}`}
                      title="Delete"
                    >
                      <FaTrash /> <span className="hidden md:inline">Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <VacancyForm
          initial={editing?.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" data-testid="admin-delete-confirm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete this vacancy?</h3>
            <p className="text-sm text-slate-600 mb-4">
              <span className="font-medium">{confirmDelete.title}</span> — this cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                data-testid="admin-delete-cancel"
              >Cancel</button>
              <button
                onClick={() => doDelete(confirmDelete.id)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                data-testid="admin-delete-confirm-btn"
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVacancies;
