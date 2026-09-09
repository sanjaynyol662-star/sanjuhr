import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaPlus, FaEdit, FaTrash, FaSave, FaImage, FaArrowLeft } from "react-icons/fa";
import { adminApi } from "./adminAuth";
import { BACKEND_URL } from "@/lib/api";
import { IMAGE_PRESETS, getPreset, fitImageToSize } from "@/lib/imagePresets";

const inputCls =
  "w-full px-3 py-2 rounded border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm text-slate-900 bg-white";
const EMPTY = { title: "", subtitle: "", link: "", order: 0, active: true };

const AdminSlides = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [presetId, setPresetId] = useState("banner");
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.get("/admin/slides").then((r) => setItems(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, order: items.length }); setImage(null); setPreview(""); setView("edit"); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ title: s.title || "", subtitle: s.subtitle || "", link: s.link || "", order: s.order || 0, active: s.active !== false });
    setImage(null); setPreview(s.image_url ? `${BACKEND_URL}${s.image_url}` : ""); setView("edit");
  };
  const pickImage = (f) => { setImage(f); setPreview(f ? URL.createObjectURL(f) : preview); };

  const save = async () => {
    if (!editing && !image) return toast.error("Image zaroori hai");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("subtitle", form.subtitle);
      fd.append("link", form.link);
      fd.append("order", String(form.order || 0));
      fd.append("active", form.active ? "true" : "false");
      if (image) {
        const p = getPreset(presetId);
        const blob = await fitImageToSize(image, p.w, p.h);
        fd.append("image", blob, `slide-${p.id}.jpg`);
      }
      if (editing) { await adminApi.put(`/admin/slides/${editing.id}`, fd); toast.success("Slide updated"); }
      else { await adminApi.post("/admin/slides", fd); toast.success("Slide added"); }
      setView("list"); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
    finally { setBusy(false); }
  };

  const remove = async (s) => {
    if (!window.confirm("Ye slide delete karein?")) return;
    try { await adminApi.delete(`/admin/slides/${s.id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error("Delete failed"); }
  };

  if (view === "list") {
    return (
      <div data-testid="admin-slides-page">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <h1 className="text-[23px] font-normal text-slate-800">News Slider</h1>
          <button onClick={openCreate} className="px-3 py-1 rounded border border-blue-600 text-blue-700 hover:bg-blue-50 text-[13px] font-medium inline-flex items-center gap-1.5" data-testid="admin-add-slide-btn">
            <FaPlus className="text-[11px]" /> Add Slide
          </button>
          <span className="ml-auto text-xs text-slate-500">{items.length} slides</span>
        </div>
        <div className="bg-white rounded border border-slate-200 shadow-sm" data-testid="admin-slides-list">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm" data-testid="admin-slides-empty">Koi slide nahi — homepage carousel ke liye pehli slide add karein!</div>
          ) : (
            items.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-blue-50/40" data-testid={`admin-slide-row-${s.id}`}>
                {s.image_url ? <img src={`${BACKEND_URL}${s.image_url}`} alt="" className="w-24 h-14 rounded object-contain bg-slate-100 shrink-0" /> : <div className="w-24 h-14 rounded bg-slate-100 grid place-items-center text-slate-300"><FaImage /></div>}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate">{s.title || <span className="text-slate-400">(no title)</span>}</p>
                  <p className="text-xs text-slate-400 truncate">{s.subtitle}</p>
                </div>
                <span className="text-xs text-slate-500 w-16 text-center">#{s.order}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.active !== false ? "text-green-700 bg-green-50" : "text-slate-500 bg-slate-100"}`}>{s.active !== false ? "active" : "hidden"}</span>
                <button onClick={() => openEdit(s)} className="p-2 rounded text-slate-500 hover:bg-slate-100" data-testid={`admin-edit-slide-${s.id}`}><FaEdit /></button>
                <button onClick={() => remove(s)} className="p-2 rounded text-red-500 hover:bg-red-50" data-testid={`admin-delete-slide-${s.id}`}><FaTrash /></button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="admin-slides-page" className="max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setView("list")} className="p-2 rounded border border-slate-300 text-slate-600 hover:bg-white" data-testid="admin-slide-back"><FaArrowLeft /></button>
        <h1 className="text-[23px] font-normal text-slate-800">{editing ? "Edit Slide" : "Add Slide"}</h1>
      </div>
      <div className="bg-white rounded border border-slate-200 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1">Image size preset</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="admin-slide-preset-group">
            {IMAGE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                className={`text-left px-3 py-2 rounded border text-[13px] transition ${
                  presetId === p.id
                    ? "border-blue-600 bg-blue-50 ring-2 ring-blue-500/20"
                    : "border-slate-300 hover:bg-slate-50"
                }`}
                data-testid={`admin-slide-preset-${p.id}`}
              >
                <span className="font-semibold text-slate-800 block">{p.label}</span>
                <span className="text-slate-500 text-xs">{p.w} × {p.h}px</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Uploaded image ko automatically <b>{getPreset(presetId).w} × {getPreset(presetId).h}px</b> ({getPreset(presetId).note}) me center-crop kar diya jayega — pehle se isi size ka image banayein for best result.
          </p>
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1">Image {editing ? "(optional — replace)" : "(required)"}</label>
          {preview && (
            <img
              src={preview}
              alt=""
              style={{ aspectRatio: `${getPreset(presetId).w} / ${getPreset(presetId).h}` }}
              className="w-full max-h-64 object-contain bg-slate-100 rounded border border-slate-200 mb-2"
            />
          )}
          <input type="file" accept="image/*" onChange={(e) => pickImage(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" data-testid="admin-slide-image" />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1">Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Main heading (optional)" data-testid="admin-slide-title" />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1">Subtitle</label>
          <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputCls} placeholder="Short description (optional)" data-testid="admin-slide-subtitle" />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1">Link URL (on click)</label>
          <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className={inputCls} placeholder="https://…  (optional)" data-testid="admin-slide-link" />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">Order</label>
            <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value || "0", 10) })} className={`${inputCls} w-24`} data-testid="admin-slide-order" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 mt-6 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-blue-600" data-testid="admin-slide-active" /> Active (show on site)
          </label>
        </div>
        <button onClick={save} disabled={busy} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60" data-testid="admin-slide-save">
          <FaSave /> {busy ? "Saving…" : editing ? "Update Slide" : "Add Slide"}
        </button>
      </div>
    </div>
  );
};

export default AdminSlides;
