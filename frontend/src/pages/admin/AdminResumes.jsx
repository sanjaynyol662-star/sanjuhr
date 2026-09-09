import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaUpload, FaTrash, FaDownload, FaFileAlt } from "react-icons/fa";
import { adminApi } from "./adminAuth";

import { BACKEND_URL as BACKEND } from "@/lib/api";

const AdminResumes = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .get("/resume-templates")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Load failed"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("File select karein");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("name", name || file.name);
      fd.append("file", file);
      await adminApi.post("/admin/resume-templates", fd);
      toast.success("Template upload ho gaya — Downloads page par live hai");
      setName("");
      setFile(null);
      e.target.reset();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`"${t.name}" delete karein?`)) return;
    try {
      await adminApi.delete(`/admin/resume-templates/${t.id}`);
      toast.success("Template delete ho gaya");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div data-testid="admin-resumes-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Resume / CV Templates</h1>
        <p className="text-sm text-slate-600">PDF, DOC, DOCX ya image templates upload karein — public Downloads page par dikhenge.</p>
      </div>

      <form onSubmit={upload} className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 flex flex-col md:flex-row md:items-end gap-3">
        <label className="flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Template Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sarkari Job CV Format"
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-sm bg-white"
            data-testid="admin-cv-name"
          />
        </label>
        <label className="flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">File (PDF / DOC / DOCX / Image)</span>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1 w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            data-testid="admin-cv-file"
          />
        </label>
        <button
          type="submit"
          disabled={uploading}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0"
          data-testid="admin-cv-upload-btn"
        >
          <FaUpload /> {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100" data-testid="admin-resumes-list">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm" data-testid="admin-resumes-empty">Abhi koi template nahi hai.</div>
        ) : (
          items.map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60" data-testid={`admin-resume-row-${t.id}`}>
              <span className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center shrink-0"><FaFileAlt /></span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                <p className="text-xs text-slate-400 truncate">{t.filename}{t.size ? ` · ${(t.size / 1024).toFixed(0)} KB` : ""}</p>
              </div>
              <a href={`${BACKEND}${t.url}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" data-testid={`admin-resume-download-${t.id}`}><FaDownload /></a>
              <button onClick={() => remove(t)} className="p-2 rounded-lg text-red-500 hover:bg-red-50" data-testid={`admin-resume-delete-${t.id}`}><FaTrash /></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminResumes;
