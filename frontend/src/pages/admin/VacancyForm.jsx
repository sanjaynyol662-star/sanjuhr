import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaSave, FaTimes, FaPlus, FaTrash, FaFilePdf, FaLink, FaUpload } from "react-icons/fa";
import { adminApi } from "./adminAuth";
import { computeSeoScore } from "@/lib/utils-seo";
import { buildWhatsAppSummary } from "@/lib/whatsapp";
import RichTextEditor from "@/components/RichTextEditor";

const CATEGORIES = [
  { key: "haryana", label: "Haryana" },
  { key: "ssc", label: "SSC" },
  { key: "bank", label: "Bank" },
  { key: "railway", label: "Railway" },
  { key: "upsc", label: "UPSC" },
  { key: "police", label: "Police / Defence" },
  { key: "teaching", label: "Teaching" },
  { key: "medical", label: "Medical" },
  { key: "engineering", label: "Engineering" },
  { key: "admit_card", label: "Admit Card" },
  { key: "result", label: "Result" },
  { key: "other", label: "Other" },
];

const STATES = [
  "", "haryana", "delhi", "punjab", "rajasthan", "chandigarh",
  "himachal-pradesh", "uttarakhand", "uttar-pradesh", "madhya-pradesh",
  "bihar", "jharkhand", "gujarat", "maharashtra", "karnataka", "tamil-nadu",
  "kerala", "andhra-pradesh", "telangana", "west-bengal", "odisha",
  "chhattisgarh", "assam", "jammu-kashmir",
];

const QUALIFICATIONS = ["", "10th", "12th", "ITI", "Diploma", "Graduate", "B.Tech/B.E", "Post Graduate"];

const EMPTY = {
  title: "", organization: "", post_name: "", qualification: "",
  category: "other", application_mode: "", state: "",
  last_date_text: "", apply_url: "", description: "",
  total_posts: "", seo_title: "", focus_keyword: "", seo_description: "",
  tags: [], important_links: [],
  hindi_intro: "", hindi_description: "", hindi_how_to_apply: "", hindi_selection_process: "",
};

/**
 * Slide-over form used for both Create and Edit. `initial` is null when creating,
 * or the existing vacancy object when editing.
 */
// Defined at module scope so its identity is stable across re-renders.
// (Defining it inside the component remounts every child on each keystroke.)
const FormField = ({ label, children }) => (
  <label className="block">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
    {children}
  </label>
);


const VacancyForm = ({ initial, onClose, onSaved }) => {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);

  useEffect(() => {
    if (initial) {
      setF({
        title: initial.title || "",
        organization: initial.organization || "",
        post_name: initial.post_name || "",
        qualification: initial.qualification || "",
        category: initial.category || "other",
        application_mode: initial.application_mode || "",
        state: initial.state || "",
        last_date_text: initial.last_date_text || "",
        apply_url: initial.apply_url || "",
        description: initial.structured?.description || initial.content_html || "",
        total_posts: initial.structured?.total_posts || "",
        seo_title: initial.seo_title || "",
        focus_keyword: initial.focus_keyword || "",
        seo_description: initial.seo_description || "",
        tags: initial.tags || [],
        important_links: initial.important_links || [],
        hindi_intro: initial.hindi_intro || "",
        hindi_description: initial.hindi_description || "",
        hindi_how_to_apply: initial.hindi_how_to_apply || "",
        hindi_selection_process: initial.hindi_selection_process || "",
      });
    } else {
      setF(EMPTY);
    }
  }, [initial]);

  const upd = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const [regenBusy, setRegenBusy] = useState(false);
  const regenerateHindi = async () => {
    if (!initial?.id) {
      toast.error("Save the vacancy first, then regenerate Hindi.");
      return;
    }
    setRegenBusy(true);
    try {
      const { data } = await adminApi.post(`/admin/vacancies/${initial.id}/hindi/regenerate`);
      setF((prev) => ({
        ...prev,
        hindi_intro: data.hindi_intro || "",
        hindi_description: data.hindi_description || "",
        hindi_how_to_apply: data.hindi_how_to_apply || "",
        hindi_selection_process: data.hindi_selection_process || "",
      }));
      toast.success(`Hindi regenerated (${data.hindi_source || "template"})`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Regeneration failed");
    } finally {
      setRegenBusy(false);
    }
  };

  // Important-links (label + url, or uploaded PDF) helpers
  const addLink = (type = "link") => setF((p) => ({ ...p, important_links: [...(p.important_links || []), { label: "", url: "", type }] }));
  const updLink = (i, k, v) => setF((p) => {
    const arr = [...(p.important_links || [])];
    arr[i] = { ...arr[i], [k]: v };
    return { ...p, important_links: arr };
  });
  const removeLink = (i) => setF((p) => ({ ...p, important_links: (p.important_links || []).filter((_, idx) => idx !== i) }));
  const uploadPdf = async (i, file) => {
    if (!file) return;
    setUploadingIdx(i);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await adminApi.post("/admin/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setF((p) => {
        const arr = [...(p.important_links || [])];
        const cur = arr[i] || { label: "", url: "", type: "link" };
        arr[i] = { ...cur, url: data.url, type: "pdf", label: cur.label || (file.name || "PDF").replace(/\.[^.]+$/, "") };
        return { ...p, important_links: arr };
      });
      toast.success("PDF uploaded");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploadingIdx(null);
    }
  };

  const seo = computeSeoScore(f);
  const waPreview = buildWhatsAppSummary({
    title: f.title,
    post_name: f.post_name || f.title,
    qualification: f.qualification,
    last_date_text: f.last_date_text,
    structured: { total_posts: f.total_posts },
    id: initial?.id,
    apply_url: f.apply_url,
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.title || f.title.length < 3) {
      toast.error("Title is required (min 3 chars)");
      return;
    }
    setBusy(true);
    try {
      if (initial?.id) {
        await adminApi.put(`/admin/vacancies/${initial.id}`, f);
        toast.success("Vacancy updated");
      } else {
        await adminApi.post("/admin/vacancies", f);
        toast.success("Vacancy created");
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const Field = FormField;

  const inputCls = "mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-sm text-slate-900 bg-white";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" data-testid="vacancy-form-overlay">
      <form
        onSubmit={submit}
        className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
        data-testid="vacancy-form"
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initial ? "Edit Vacancy" : "Add Vacancy"}
            </h2>
            <p className="text-xs text-slate-500">Shown alongside auto-scraped feed</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5"
              data-testid="vacancy-form-cancel"
            >
              <FaTimes className="text-[10px]" /> Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              data-testid="vacancy-form-save"
            >
              <FaSave className="text-[10px]" /> {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Title (required)">
            <input required minLength={3} value={f.title} onChange={(e) => upd("title", e.target.value)}
              className={inputCls} data-testid="vacancy-form-title" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Organization / Department">
              <input value={f.organization} onChange={(e) => upd("organization", e.target.value)}
                className={inputCls} data-testid="vacancy-form-organization" />
            </Field>
            <Field label="Post Name (defaults to title)">
              <input value={f.post_name} onChange={(e) => upd("post_name", e.target.value)}
                className={inputCls} data-testid="vacancy-form-post_name" />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Category">
              <select value={f.category} onChange={(e) => upd("category", e.target.value)}
                className={inputCls} data-testid="vacancy-form-category">
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Application Mode">
              <select value={f.application_mode} onChange={(e) => upd("application_mode", e.target.value)}
                className={inputCls} data-testid="vacancy-form-application_mode">
                <option value="">Unknown</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </Field>
            <Field label="State">
              <select value={f.state} onChange={(e) => upd("state", e.target.value)}
                className={inputCls} data-testid="vacancy-form-state">
                {STATES.map((s) => (
                  <option key={s || "any"} value={s}>{s || "— any / none —"}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Qualification">
              <select value={f.qualification} onChange={(e) => upd("qualification", e.target.value)}
                className={inputCls} data-testid="vacancy-form-qualification">
                {QUALIFICATIONS.map((q) => (
                  <option key={q || "any"} value={q}>{q || "— any —"}</option>
                ))}
              </select>
            </Field>
            <Field label="Last Date (free-form text, e.g. 15 Sep 2026)">
              <input value={f.last_date_text} onChange={(e) => upd("last_date_text", e.target.value)}
                className={inputCls} data-testid="vacancy-form-last_date_text" />
            </Field>
            <Field label="Total Posts (कुल पद)">
              <input value={f.total_posts} onChange={(e) => upd("total_posts", e.target.value)}
                className={inputCls} placeholder="e.g. 1200" data-testid="vacancy-form-total-posts" />
            </Field>
          </div>
          <Field label="Apply URL (external)">
            <input type="url" value={f.apply_url} onChange={(e) => upd("apply_url", e.target.value)}
              className={inputCls} placeholder="https://example.com/apply" data-testid="vacancy-form-apply_url" />
          </Field>

          {/* Tags */}
          <Field label="Tags (comma separated)">
            <input
              value={(f.tags || []).join(", ")}
              onChange={(e) => upd("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
              className={inputCls}
              placeholder="e.g. 10th pass, haryana, latest"
              data-testid="vacancy-form-tags"
            />
            {(f.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(f.tags || []).map((t, i) => (
                  <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{t}</span>
                ))}
              </div>
            )}
          </Field>

          {/* Important Links (named URL links) + PDF Attachments — clearly separated */}
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 space-y-4" data-testid="vacancy-form-links-card">
            {/* Named links */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"><FaLink /> Important Links (name + URL)</span>
                <button type="button" onClick={() => addLink("link")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold"
                  data-testid="vacancy-form-add-link">
                  <FaPlus className="text-[10px]" /> Add Link
                </button>
              </div>
              {/* quick presets */}
              <div className="flex flex-wrap gap-1.5">
                {["Official Website", "Apply Online", "Admit Card", "Result", "Notification", "Syllabus", "Answer Key"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setF((prev) => ({ ...prev, important_links: [...(prev.important_links || []), { label: p, url: "", type: "link" }] }))}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-600"
                    data-testid={`vacancy-form-preset-${p.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    + {p}
                  </button>
                ))}
              </div>
              {(f.important_links || []).map((lnk, i) => ({ lnk, i })).filter((x) => x.lnk.type !== "pdf").map(({ lnk, i }) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)_auto] gap-2 items-center bg-white rounded-lg border border-slate-200 p-2" data-testid={`vacancy-form-link-row-${i}`}>
                  <input value={lnk.label || ""} onChange={(e) => updLink(i, "label", e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-sm text-slate-900"
                    placeholder="Name (e.g. Official Website)" data-testid={`vacancy-form-link-label-${i}`} />
                  <input value={lnk.url || ""} onChange={(e) => updLink(i, "url", e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-sm text-slate-900"
                    placeholder="https://official-site.gov.in/…" data-testid={`vacancy-form-link-url-${i}`} />
                  <button type="button" onClick={() => removeLink(i)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 justify-self-end" title="Remove" data-testid={`vacancy-form-link-remove-${i}`}>
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-300" />

            {/* PDF attachments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"><FaFilePdf className="text-red-500" /> PDF Attachments (name + file)</span>
                <button type="button" onClick={() => addLink("pdf")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                  data-testid="vacancy-form-add-pdf">
                  <FaPlus className="text-[10px]" /> Add PDF
                </button>
              </div>
              {(f.important_links || []).map((lnk, i) => ({ lnk, i })).filter((x) => x.lnk.type === "pdf").map(({ lnk, i }) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)_auto] gap-2 items-center bg-white rounded-lg border border-slate-200 p-2" data-testid={`vacancy-form-pdf-row-${i}`}>
                  <input value={lnk.label || ""} onChange={(e) => updLink(i, "label", e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-sm text-slate-900"
                    placeholder="Name (e.g. Notification PDF)" data-testid={`vacancy-form-pdf-label-${i}`} />
                  <div className="flex items-center gap-2 min-w-0">
                    {lnk.url ? (
                      <a href={lnk.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-xs text-emerald-700 hover:underline flex items-center gap-1"><FaFilePdf className="text-red-500 shrink-0" /> {lnk.url.split("/").pop()}</a>
                    ) : (
                      <span className="flex-1 text-xs text-slate-400">No file uploaded yet</span>
                    )}
                    <label className="shrink-0 cursor-pointer inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">
                      <FaUpload className="text-[10px]" /> {uploadingIdx === i ? "Uploading…" : (lnk.url ? "Replace" : "Upload PDF")}
                      <input type="file" accept="application/pdf" className="hidden"
                        onChange={(e) => { uploadPdf(i, e.target.files?.[0]); e.target.value = ""; }}
                        data-testid={`vacancy-form-pdf-file-${i}`} />
                    </label>
                  </div>
                  <button type="button" onClick={() => removeLink(i)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 justify-self-end" title="Remove" data-testid={`vacancy-form-pdf-remove-${i}`}>
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Field label="Description / Notes (rich text — bold, headings, links)">
            <RichTextEditor
              value={f.description}
              onChange={(html) => upd("description", html)}
              placeholder="Type job details… use the toolbar for bold, headings, bullet points and links."
            />
          </Field>

          {/* Hindi descriptive content — auto-generated (templates + AI), editable */}
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3" data-testid="vacancy-form-hindi-card">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Hindi Content (हिंदी विवरण)</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Auto-generated (templates + AI). Edit to override; leave blank to auto-generate on first view.</p>
              </div>
              <button type="button" onClick={regenerateHindi} disabled={regenBusy}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold"
                data-testid="vacancy-form-hindi-regenerate">
                {regenBusy ? "Generating…" : "Regenerate with AI"}
              </button>
            </div>
            <Field label="Intro (परिचय)">
              <textarea value={f.hindi_intro} onChange={(e) => upd("hindi_intro", e.target.value)}
                rows={3} className={inputCls} placeholder="अभी खाली — पहली बार पेज खुलने पर auto-generate होगा" data-testid="vacancy-form-hindi-intro" />
            </Field>
            <Field label="Description (विवरण)">
              <textarea value={f.hindi_description} onChange={(e) => upd("hindi_description", e.target.value)}
                rows={5} className={inputCls} data-testid="vacancy-form-hindi-description" />
            </Field>
            <Field label="How to Apply (आवेदन कैसे करें)">
              <textarea value={f.hindi_how_to_apply} onChange={(e) => upd("hindi_how_to_apply", e.target.value)}
                rows={4} className={inputCls} data-testid="vacancy-form-hindi-how-to-apply" />
            </Field>
            <Field label="Selection Process (चयन प्रक्रिया)">
              <textarea value={f.hindi_selection_process} onChange={(e) => upd("hindi_selection_process", e.target.value)}
                rows={3} className={inputCls} data-testid="vacancy-form-hindi-selection" />
            </Field>
          </div>

          {/* Rank Math style SEO settings */}
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 space-y-3" data-testid="vacancy-form-seo-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">SEO Settings (Rank Math Style)</span>
              <span className={`text-sm font-extrabold ${seo.score >= 75 ? "text-green-600" : seo.score >= 45 ? "text-amber-600" : "text-red-500"}`} data-testid="vacancy-form-seo-score">{seo.score}/100</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${seo.score >= 75 ? "bg-green-500" : seo.score >= 45 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${seo.score}%` }} />
            </div>
            <Field label="Custom SEO Title">
              <input value={f.seo_title} onChange={(e) => upd("seo_title", e.target.value)}
                className={inputCls} placeholder={f.title || "50-60 chars ideal"} data-testid="vacancy-form-seo-title" />
            </Field>
            <Field label="Focus Keyword">
              <input value={f.focus_keyword} onChange={(e) => upd("focus_keyword", e.target.value)}
                className={inputCls} placeholder="e.g. Haryana Police Bharti 2026" data-testid="vacancy-form-focus-keyword" />
            </Field>
            <Field label="Meta Description">
              <textarea value={f.seo_description} onChange={(e) => upd("seo_description", e.target.value)}
                rows={2} className={inputCls} placeholder="120-160 chars ideal" data-testid="vacancy-form-seo-description" />
            </Field>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {seo.checks.map((c, i) => (
                <li key={i} className={`text-[11px] flex items-center gap-1.5 ${c.ok ? "text-green-700" : "text-slate-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.ok ? "bg-green-500" : "bg-slate-300"}`} /> {c.label}
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp auto-summary preview */}
          <div className="rounded-xl border-2 border-dashed border-[#25D366]/50 bg-green-50 p-4" data-testid="vacancy-form-whatsapp-preview">
            <span className="text-[11px] font-bold uppercase tracking-wider text-green-700">WhatsApp Summary Preview (save par auto-generate hogi)</span>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-slate-800 leading-relaxed">{waPreview}</pre>
          </div>
        </div>
      </form>
    </div>
  );
};

export default VacancyForm;
