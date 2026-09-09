import React, { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  FaPlus, FaEdit, FaTrash, FaSave, FaBold, FaItalic, FaHeading, FaListUl, FaLink,
  FaImage, FaArrowLeft, FaCheckCircle, FaTimesCircle, FaTags, FaFolder, FaSlidersH,
  FaCog, FaShareAlt, FaSitemap, FaTimes,
} from "react-icons/fa";
import { adminApi } from "./adminAuth";
import { BACKEND_URL as BACKEND } from "@/lib/api";
import { IMAGE_PRESETS, getPreset, fitImageToSize } from "@/lib/imagePresets";

const inputCls =
  "w-full px-3 py-2 rounded border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-900 bg-white";
const EMPTY = {
  title: "", excerpt: "", content: "", status: "published",
  categories: [], tags: [], focus_keyword: "", seo_title: "", seo_description: "", custom_head: "",
};

const wordCount = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

const AdminBlogs = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // 'list' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [image, setImage] = useState(null);
  const [imgPreset, setImgPreset] = useState("banner");
  const [imgPreview, setImgPreview] = useState("");
  const [centerImage, setCenterImage] = useState(null);
  const [centerPreview, setCenterPreview] = useState("");
  const [removeCenter, setRemoveCenter] = useState(false);
  const [contentText, setContentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [taxonomy, setTaxonomy] = useState({ categories: [], tags: [] });
  const [newCat, setNewCat] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [seoTab, setSeoTab] = useState("general");
  const editorRef = useRef(null);

  const load = () => {
    setLoading(true);
    adminApi.get("/admin/blogs")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch((err) => toast.error(err?.response?.data?.detail || "Load failed"))
      .finally(() => setLoading(false));
    adminApi.get("/admin/blog-taxonomy").then((r) => setTaxonomy(r.data || { categories: [], tags: [] })).catch(() => {});
  };
  useEffect(load, []);

  useEffect(() => {
    if (view === "edit" && editorRef.current) {
      editorRef.current.innerHTML = form.content || "";
      setContentText(editorRef.current.innerText || "");
    }
  }, [view, editing]); // eslint-disable-line

  const openCreate = () => {
    setEditing(null); setForm(EMPTY); setImage(null); setImgPreview(""); setContentText(""); setSeoTab("general");
    setCenterImage(null); setCenterPreview(""); setRemoveCenter(false);
    setView("edit");
  };
  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title, excerpt: b.excerpt || "", content: b.content || "", status: b.status || "published",
      categories: b.categories || [], tags: b.tags || [], focus_keyword: b.focus_keyword || "",
      seo_title: b.seo_title || "", seo_description: b.seo_description || "", custom_head: b.custom_head || "",
    });
    setImage(null); setImgPreview(b.image_url ? `${BACKEND}${b.image_url}` : ""); setSeoTab("general");
    setCenterImage(null); setCenterPreview(b.center_image_url ? `${BACKEND}${b.center_image_url}` : ""); setRemoveCenter(false);
    setView("edit");
  };

  const exec = (cmd, arg = null) => { document.execCommand(cmd, false, arg); editorRef.current?.focus(); onEditorInput(); };
  const addLink = () => { const url = window.prompt("Link URL:"); if (url) exec("createLink", url); };
  const onEditorInput = () => setContentText(editorRef.current?.innerText || "");

  const pickImage = (f) => { setImage(f); setImgPreview(f ? URL.createObjectURL(f) : ""); };
  const pickCenter = (f) => { setCenterImage(f); setCenterPreview(f ? URL.createObjectURL(f) : ""); if (f) setRemoveCenter(false); };
  const clearCenter = () => { setCenterImage(null); setCenterPreview(""); setRemoveCenter(true); };

  const toggleCat = (c) =>
    setForm((f) => ({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] }));
  const addCat = () => {
    const c = newCat.trim(); if (!c) return;
    setTaxonomy((t) => ({ ...t, categories: [...new Set([...t.categories, c])].sort() }));
    setForm((f) => ({ ...f, categories: [...new Set([...f.categories, c])] }));
    setNewCat("");
  };
  const addTag = (val) => {
    const t = (val ?? tagInput).trim().replace(/,$/, ""); if (!t) return;
    setForm((f) => ({ ...f, tags: [...new Set([...f.tags, t])] }));
    setTagInput("");
  };
  const removeTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  // ─────────── Rank Math style SEO analysis ───────────
  const seo = useMemo(() => {
    const kw = form.focus_keyword.trim().toLowerCase();
    const title = (form.seo_title || form.title).toLowerCase();
    const desc = (form.seo_description || form.excerpt).toLowerCase();
    const slug = (editing?.slug || form.title).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const body = contentText.toLowerCase();
    const words = wordCount(contentText);
    const kwSlug = kw.replace(/[^a-z0-9]+/g, "-");
    const checks = [
      { label: "Add Focus Keyword to the SEO title", ok: !!kw && title.includes(kw) },
      { label: "Add Focus Keyword to the meta description", ok: !!kw && desc.includes(kw) },
      { label: "Use Focus Keyword in the URL", ok: !!kw && slug.includes(kwSlug) },
      { label: "Use Focus Keyword at the beginning of your content", ok: !!kw && body.slice(0, 120).includes(kw) },
      { label: "Use Focus Keyword in the content", ok: !!kw && body.includes(kw) },
      { label: "Content should be 600–2500 words long", ok: words >= 600 && words <= 2500 },
      { label: "Set an SEO title (≤ 60 chars)", ok: !!(form.seo_title || form.title) && (form.seo_title || form.title).length <= 60 },
      { label: "Set a meta description (50–160 chars)", ok: (form.seo_description || form.excerpt).length >= 50 && (form.seo_description || form.excerpt).length <= 160 },
      { label: "Add a featured image", ok: !!imgPreview },
      { label: "Add at least one category", ok: form.categories.length > 0 },
    ];
    const passed = checks.filter((c) => c.ok).length;
    const score = Math.round((passed / checks.length) * 100);
    return { checks, score, words };
  }, [form, contentText, imgPreview, editing]);

  const scoreColor = seo.score >= 80 ? "text-green-600 bg-green-50 border-green-200"
    : seo.score >= 50 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200";

  const save = async (statusOverride) => {
    const content = editorRef.current?.innerHTML || "";
    if (!form.title.trim()) return toast.error("Title zaroori hai");
    const status = statusOverride || form.status;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("excerpt", form.excerpt);
      fd.append("content", content);
      fd.append("status", status);
      fd.append("categories", form.categories.join(","));
      fd.append("tags", form.tags.join(","));
      fd.append("focus_keyword", form.focus_keyword);
      fd.append("seo_title", form.seo_title);
      fd.append("seo_description", form.seo_description);
      fd.append("custom_head", form.custom_head || "");
      if (image) {
        const p = getPreset(imgPreset);
        const blob = await fitImageToSize(image, p.w, p.h);
        fd.append("image", blob, `cover-${p.id}.jpg`);
      }
      if (centerImage) {
        // Keep the center image at its natural aspect ratio (only downscale
        // very large files); never crop — "free size" as requested.
        const blob = await fitImageToSize(centerImage, 2000, 2000);
        fd.append("center_image", blob, "center.jpg");
      } else if (removeCenter) {
        fd.append("remove_center_image", "1");
      }
      if (editing) {
        fd.append("slug", editing.slug || "");
        await adminApi.put(`/admin/blogs/${editing.id}`, fd);
        toast.success("Post updated");
      } else {
        await adminApi.post("/admin/blogs", fd);
        toast.success(status === "draft" ? "Draft saved" : "Post published");
      }
      setView("list"); load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally { setBusy(false); }
  };

  const remove = async (b) => {
    if (!window.confirm(`"${b.title}" delete karein?`)) return;
    try { await adminApi.delete(`/admin/blogs/${b.id}`); toast.success("Post deleted"); load(); }
    catch (err) { toast.error(err?.response?.data?.detail || "Delete failed"); }
  };

  // ─────────── LIST VIEW ───────────
  if (view === "list") {
    return (
      <div data-testid="admin-blogs-page">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <h1 className="text-[23px] font-normal text-slate-800">Posts</h1>
          <button onClick={openCreate} className="px-3 py-1 rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-[13px] font-medium inline-flex items-center gap-1.5" data-testid="admin-add-blog-btn">
            <FaPlus className="text-[11px]" /> Add New
          </button>
          <span className="ml-auto text-xs text-slate-500">{items.length} posts</span>
        </div>

        <div className="bg-white rounded border border-slate-200 shadow-sm" data-testid="admin-blogs-list">
          <div className="hidden sm:grid grid-cols-[1fr_160px_120px_120px] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[12px] font-semibold text-slate-600 uppercase tracking-wide">
            <span>Title</span><span>Categories</span><span>Status</span><span className="text-right">Actions</span>
          </div>
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm" data-testid="admin-blogs-empty">Koi post nahi hai — pehla article likhein!</div>
          ) : (
            items.map((b) => (
              <div key={b.id} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_120px_120px] gap-2 items-center px-4 py-3 border-b border-slate-100 hover:bg-emerald-50/40 group" data-testid={`admin-blog-row-${b.id}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {b.image_url ? <img src={`${BACKEND}${b.image_url}`} alt="" className="w-11 h-11 rounded object-cover shrink-0" />
                    : <div className="w-11 h-11 rounded bg-slate-100 grid place-items-center shrink-0 text-slate-300"><FaImage /></div>}
                  <div className="min-w-0">
                    <p className="font-semibold text-emerald-800 truncate">{b.title}</p>
                    <p className="text-xs text-slate-400 truncate">/{b.slug} · {(b.views || 0).toLocaleString()} views</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 truncate">{(b.categories || []).join(", ") || "—"}</div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full w-fit ${b.status === "published" ? "text-green-700 bg-green-50" : "text-slate-500 bg-slate-100"}`}>{b.status}</span>
                <div className="flex items-center gap-1 sm:justify-end">
                  <a href={`/blogs/${b.slug}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-700 hover:underline px-2">View</a>
                  <button onClick={() => openEdit(b)} className="p-2 rounded text-slate-500 hover:bg-slate-100" data-testid={`admin-edit-blog-${b.id}`}><FaEdit /></button>
                  <button onClick={() => remove(b)} className="p-2 rounded text-red-500 hover:bg-red-50" data-testid={`admin-delete-blog-${b.id}`}><FaTrash /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─────────── EDITOR VIEW (WordPress + Rank Math) ───────────
  const seoTabs = [
    { id: "general", label: "General", icon: FaCog },
    { id: "advanced", label: "Advanced", icon: FaSlidersH },
    { id: "schema", label: "Schema", icon: FaSitemap },
    { id: "social", label: "Social", icon: FaShareAlt },
  ];

  return (
    <div data-testid="admin-blogs-page">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setView("list")} className="p-2 rounded border border-slate-300 text-slate-600 hover:bg-white" data-testid="admin-blog-back"><FaArrowLeft /></button>
        <h1 className="text-[23px] font-normal text-slate-800">{editing ? "Edit Post" : "Add Post"}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-5 items-start">
        {/* MAIN COLUMN */}
        <div className="space-y-4 min-w-0">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Add title"
            className="w-full px-4 py-3 rounded border border-slate-300 bg-white text-xl text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            data-testid="admin-blog-title"
          />

          {/* Editor */}
          <div className="bg-white rounded border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1 border-b border-slate-200 px-2 py-1.5 bg-slate-50 rounded-t">
              <button type="button" onClick={() => exec("bold")} title="Bold" className="p-2 rounded hover:bg-slate-200 text-slate-600" data-testid="editor-bold"><FaBold /></button>
              <button type="button" onClick={() => exec("italic")} title="Italic" className="p-2 rounded hover:bg-slate-200 text-slate-600" data-testid="editor-italic"><FaItalic /></button>
              <button type="button" onClick={() => exec("formatBlock", "<h2>")} title="Heading" className="p-2 rounded hover:bg-slate-200 text-slate-600" data-testid="editor-h2"><FaHeading /></button>
              <button type="button" onClick={() => exec("insertUnorderedList")} title="Bullet list" className="p-2 rounded hover:bg-slate-200 text-slate-600" data-testid="editor-list"><FaListUl /></button>
              <button type="button" onClick={addLink} title="Add link" className="p-2 rounded hover:bg-slate-200 text-slate-600" data-testid="editor-link"><FaLink /></button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              onInput={onEditorInput}
              className="min-h-[300px] px-4 py-3 text-sm text-slate-800 focus:outline-none leading-relaxed"
              data-testid="admin-blog-content-editor"
            />
            <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">Word count: {seo.words}</div>
          </div>

          {/* Excerpt */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4">
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Excerpt (listing card)</label>
            <input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Short excerpt" className={inputCls} data-testid="admin-blog-excerpt" />
          </div>

          {/* Rank Math SEO metabox */}
          <div className="bg-white rounded border border-slate-200 shadow-sm" data-testid="rankmath-seo-box">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="font-semibold text-slate-800 flex items-center gap-2"><FaCog className="text-emerald-600" /> HR SEO</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${scoreColor}`} data-testid="seo-score-badge">SEO: {seo.score} / 100</span>
            </div>
            <div className="flex border-b border-slate-200 text-[13px]">
              {seoTabs.map((t) => (
                <button key={t.id} onClick={() => setSeoTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 -mb-px ${seoTab === t.id ? "border-emerald-600 text-emerald-700 font-semibold" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                  data-testid={`seo-tab-${t.id}`}>
                  <t.icon className="text-xs" /> {t.label}
                </button>
              ))}
            </div>

            {seoTab === "general" && (
              <div className="p-4 space-y-4">
                {/* Snippet preview */}
                <div className="rounded border border-slate-200 p-3 bg-slate-50">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Preview</p>
                  <p className="text-[#1a0dab] text-base leading-tight truncate">{form.seo_title || form.title || "Post title"} - HR Digital Services</p>
                  <p className="text-[#006621] text-xs truncate">hrdigitalservices.in › blogs › {(editing?.slug || form.title || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}</p>
                  <p className="text-slate-600 text-xs mt-1 line-clamp-2">{form.seo_description || form.excerpt || "Meta description preview shows here…"}</p>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Focus Keyword</label>
                  <input value={form.focus_keyword} onChange={(e) => setForm({ ...form, focus_keyword: e.target.value })} placeholder="e.g. Haryana govt jobs" className={inputCls} data-testid="seo-focus-keyword" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">SEO Title</label>
                  <input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} placeholder={form.title || "Custom SEO title"} className={inputCls} data-testid="seo-title" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Meta Description</label>
                  <textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} rows={2} placeholder="Meta description for search engines" className={inputCls} data-testid="seo-description" />
                </div>

                {/* Basic SEO checklist */}
                <div className="rounded border border-slate-200">
                  <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 text-[13px] font-semibold text-slate-700 flex items-center justify-between">
                    <span>Basic SEO</span>
                    <span className="text-xs text-red-600">{seo.checks.filter((c) => !c.ok).length} Errors</span>
                  </div>
                  <ul className="divide-y divide-slate-100" data-testid="seo-checklist">
                    {seo.checks.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 px-3 py-2 text-[13px]">
                        {c.ok ? <FaCheckCircle className="text-green-500 mt-0.5 shrink-0" /> : <FaTimesCircle className="text-red-400 mt-0.5 shrink-0" />}
                        <span className={c.ok ? "text-slate-600" : "text-slate-700"}>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {seoTab === "advanced" && (
              <div className="p-4 text-sm text-slate-500 space-y-3">
                <p className="flex items-center gap-2"><FaCheckCircle className="text-slate-300" /> Robots: <b className="text-slate-700">Index, Follow</b> (default)</p>
                <p className="flex items-center gap-2"><FaCheckCircle className="text-slate-300" /> Canonical URL auto-generated from slug.</p>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Verification code / Custom &lt;head&gt; meta tags</label>
                  <textarea
                    value={form.custom_head}
                    onChange={(e) => setForm({ ...form, custom_head: e.target.value })}
                    rows={4}
                    placeholder={'<meta name="google-site-verification" content="xxxx" />'}
                    className={`${inputCls} font-mono !text-xs`}
                    data-testid="admin-blog-custom-head"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Yeh raw meta/verification tags is post ke page ke &lt;head&gt; me inject honge (Google verification, custom SEO meta, etc.).</p>
                </div>
              </div>
            )}
            {seoTab === "schema" && (
              <div className="p-4 text-sm text-slate-500"><p>Schema type: <b className="text-slate-700">Article</b> (auto). Rich results enabled for blog posts.</p></div>
            )}
            {seoTab === "social" && (
              <div className="p-4 text-sm text-slate-500"><p>Open Graph & Twitter cards use the SEO title, description and featured image automatically.</p></div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-4">
          {/* Publish */}
          <div className="bg-white rounded border border-slate-200 shadow-sm" data-testid="publish-box">
            <div className="px-4 py-2.5 border-b border-slate-200 font-semibold text-slate-800 text-sm">Publish</div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-500">Status</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-800 bg-white" data-testid="admin-blog-status">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className={`flex items-center justify-between text-[13px] px-3 py-2 rounded border ${scoreColor}`}>
                <span className="font-semibold">SEO Score</span>
                <span className="font-bold">{seo.score} / 100</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button type="button" disabled={busy} onClick={() => save("draft")} className="flex-1 px-3 py-2 rounded border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60" data-testid="admin-blog-save-draft">
                  Save Draft
                </button>
                <button type="button" disabled={busy} onClick={() => save()} className="flex-1 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60" data-testid="admin-blog-save">
                  <FaSave /> {busy ? "…" : editing ? "Update" : "Publish"}
                </button>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded border border-slate-200 shadow-sm" data-testid="categories-box">
            <div className="px-4 py-2.5 border-b border-slate-200 font-semibold text-slate-800 text-sm flex items-center gap-2"><FaFolder className="text-emerald-600" /> Categories</div>
            <div className="p-4">
              <div className="max-h-40 overflow-y-auto space-y-1.5 mb-3">
                {taxonomy.categories.length === 0 && form.categories.length === 0 && <p className="text-xs text-slate-400">No categories yet — add one below.</p>}
                {[...new Set([...taxonomy.categories, ...form.categories])].map((c) => (
                  <label key={c} className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.categories.includes(c)} onChange={() => toggleCat(c)} className="accent-emerald-600" data-testid={`cat-${c}`} /> {c}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCat())} placeholder="New category" className={`${inputCls} !py-1.5 text-[13px]`} data-testid="new-category-input" />
                <button type="button" onClick={addCat} className="px-3 rounded border border-emerald-600 text-emerald-700 text-[13px] font-semibold hover:bg-emerald-50" data-testid="add-category-btn">Add</button>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded border border-slate-200 shadow-sm" data-testid="tags-box">
            <div className="px-4 py-2.5 border-b border-slate-200 font-semibold text-slate-800 text-sm flex items-center gap-2"><FaTags className="text-emerald-600" /> Tags</div>
            <div className="p-4">
              <div className="flex gap-2 mb-2">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), addTag())} placeholder="Add tag, Enter" className={`${inputCls} !py-1.5 text-[13px]`} data-testid="tag-input" />
                <button type="button" onClick={() => addTag()} className="px-3 rounded border border-emerald-600 text-emerald-700 text-[13px] font-semibold hover:bg-emerald-50" data-testid="add-tag-btn">Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-[12px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5" data-testid={`tag-chip-${t}`}>
                    {t} <button type="button" onClick={() => removeTag(t)} className="hover:text-red-500"><FaTimes className="text-[10px]" /></button>
                  </span>
                ))}
              </div>
              {taxonomy.tags.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] text-slate-400 mb-1">Most used</p>
                  <div className="flex flex-wrap gap-1.5">
                    {taxonomy.tags.slice(0, 12).filter((t) => !form.tags.includes(t)).map((t) => (
                      <button key={t} type="button" onClick={() => addTag(t)} className="text-[12px] text-slate-500 border border-slate-200 rounded-full px-2 py-0.5 hover:border-emerald-300 hover:text-emerald-700">{t}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Featured image */}
          <div className="bg-white rounded border border-slate-200 shadow-sm" data-testid="featured-image-box">
            <div className="px-4 py-2.5 border-b border-slate-200 font-semibold text-slate-800 text-sm flex items-center gap-2"><FaImage className="text-emerald-600" /> Featured image</div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2 mb-3" data-testid="admin-blog-preset-group">
                {IMAGE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setImgPreset(p.id)}
                    className={`text-left px-2.5 py-1.5 rounded border text-[12px] transition ${
                      imgPreset === p.id
                        ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20"
                        : "border-slate-300 hover:bg-slate-50"
                    }`}
                    data-testid={`admin-blog-preset-${p.id}`}
                  >
                    <span className="font-semibold text-slate-800 block">{p.label}</span>
                    <span className="text-slate-500">{p.w} × {p.h}px</span>
                  </button>
                ))}
              </div>
              {imgPreview ? (
                <div className="mb-3">
                  <img
                    src={imgPreview}
                    alt=""
                    style={{ aspectRatio: `${getPreset(imgPreset).w} / ${getPreset(imgPreset).h}` }}
                    className="w-full max-h-48 object-contain bg-slate-100 rounded border border-slate-200"
                  />
                </div>
              ) : (
                <div
                  className="mb-3 rounded border border-dashed border-slate-300 grid place-items-center text-slate-300"
                  style={{ aspectRatio: `${getPreset(imgPreset).w} / ${getPreset(imgPreset).h}`, maxHeight: "12rem" }}
                >
                  <FaImage className="text-3xl" />
                </div>
              )}
              <p className="text-[11px] text-slate-500 mb-2">
                Image poori dikhegi (crop nahi) — {getPreset(imgPreset).w} × {getPreset(imgPreset).h}px ke andar fit hokar save hogi.
              </p>
              <input type="file" accept="image/*" onChange={(e) => pickImage(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                data-testid="admin-blog-image" />
            </div>
          </div>

          {/* Center image (optional, free size) */}
          <div className="bg-white rounded border border-slate-200 shadow-sm" data-testid="center-image-box">
            <div className="px-4 py-2.5 border-b border-slate-200 font-semibold text-slate-800 text-sm flex items-center gap-2"><FaImage className="text-emerald-600" /> Center image <span className="text-[11px] font-normal text-slate-400">(optional)</span></div>
            <div className="p-4">
              {centerPreview ? (
                <div className="mb-3">
                  <img src={centerPreview} alt="" className="w-full max-h-56 object-contain bg-slate-100 rounded border border-slate-200" data-testid="admin-blog-center-preview" />
                  <button type="button" onClick={clearCenter} className="mt-2 text-[12px] font-semibold text-red-600 hover:underline" data-testid="admin-blog-center-remove">Remove center image</button>
                </div>
              ) : (
                <div className="mb-3 rounded border border-dashed border-slate-300 grid place-items-center text-slate-300 h-28"><FaImage className="text-3xl" /></div>
              )}
              <p className="text-[11px] text-slate-500 mb-2">
                Post ke beech me dikhne wali image — apni original size/aspect me (crop nahi). Optional hai.
              </p>
              <input type="file" accept="image/*" onChange={(e) => pickCenter(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                data-testid="admin-blog-center-image" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBlogs;
