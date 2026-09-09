import React, { useRef, useState } from "react";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import { FaCloudUploadAlt, FaFilePdf, FaCheckCircle, FaTrash, FaSpinner } from "react-icons/fa";

const DOC_KINDS = [
  { id: "aadhaar", hi: "आधार कार्ड", en: "Aadhaar Card" },
  { id: "pan", hi: "PAN कार्ड", en: "PAN Card" },
  { id: "bank_statement", hi: "बैंक स्टेटमेंट", en: "Bank Statement" },
  { id: "electricity_bill", hi: "बिजली बिल", en: "Electricity Bill" },
  { id: "income_proof", hi: "आय प्रमाण", en: "Income Proof" },
  { id: "photo", hi: "फोटो", en: "Photo" },
];

/**
 * DocumentUploader — self-contained widget.
 * Props: refNo (optional, attaches uploads to an application), onChange(files)
 */
const DocumentUploader = ({ refNo, onChange, requireAuth = true, kinds = DOC_KINDS, compact = false }) => {
  const { lang } = useI18n();
  const [files, setFiles] = useState([]);        // {kind, meta}
  const [loading, setLoading] = useState(false);
  const [pickKind, setPickKind] = useState(kinds[0].id);
  const inputRef = useRef(null);

  const kindLabel = (id) => {
    const k = kinds.find(k => k.id === id);
    return k ? (lang === "hi" ? k.hi : k.en) : id;
  };

  const doUpload = async (fileObj) => {
    setLoading(true);
    const fd = new FormData();
    fd.append("file", fileObj);
    fd.append("kind", pickKind);
    if (refNo) fd.append("ref_no", refNo);
    try {
      const { data } = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const newList = [...files, data];
      setFiles(newList);
      onChange?.(newList);
      toast.success(`${kindLabel(pickKind)}: ${fileObj.name}`);
    } catch (err) {
      const d = err.response?.data?.detail;
      if (err.response?.status === 401 && requireAuth) toast.error(lang === "hi" ? "पहले लॉगिन करें" : "Please sign in first to upload documents");
      else toast.error(typeof d === "string" ? d : "Upload failed");
    } finally { setLoading(false); }
  };

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (f) doUpload(f);
    e.target.value = "";
  };

  const remove = (idx) => {
    const nl = files.filter((_, i) => i !== idx);
    setFiles(nl);
    onChange?.(nl);
  };

  return (
    <div className="glass p-4" data-testid="document-uploader">
      {!compact && (
        <div className="flex items-center gap-2 mb-3">
          <FaCloudUploadAlt className="text-emerald-400 text-xl" />
          <div className="font-semibold text-white">{lang === "hi" ? "दस्तावेज़ अपलोड" : "Upload Documents"}</div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select className="input !py-2 !w-auto text-sm" value={pickKind} onChange={(e) => setPickKind(e.target.value)} data-testid="doc-kind-select">
          {kinds.map(k => <option key={k.id} value={k.id}>{lang === "hi" ? k.hi : k.en}</option>)}
        </select>
        <input ref={inputRef} type="file" hidden accept="application/pdf,image/*" onChange={onPick} data-testid="doc-file-input" />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={loading} className="btn-outline-mint text-sm" data-testid="doc-upload-btn">
          {loading ? <FaSpinner className="animate-spin" /> : <FaCloudUploadAlt />}
          {loading ? (lang === "hi" ? "अपलोड हो रहा..." : "Uploading...") : (lang === "hi" ? "फ़ाइल चुनें" : "Choose File")}
        </button>
        <span className="text-xs text-slate-500">PDF · JPG · PNG · max 8 MB</span>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5" data-testid="uploaded-list">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <FaFilePdf className="text-red-400 shrink-0" />
                <span className="text-xs text-emerald-400 uppercase tracking-widest font-semibold shrink-0">{kindLabel(f.kind)}</span>
                <span className="text-xs text-slate-300 truncate">{f.original_name}</span>
                <span className="text-[10px] text-slate-500 shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                <FaCheckCircle className="text-emerald-400 text-xs shrink-0" />
              </div>
              <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-300 text-sm" data-testid={`doc-remove-${i}`}>
                <FaTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
