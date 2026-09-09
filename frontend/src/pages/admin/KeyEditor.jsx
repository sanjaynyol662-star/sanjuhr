/**
 * Reusable admin editor form.
 *
 * Renders one card per content key with editable inputs (long text OR single-line
 * based on the field name). On Save, PUT /api/site-content/{key} with the current
 * value; on success it invalidates the shared site-content cache so the public
 * site reflects the change immediately.
 */
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaSave, FaUndo } from "react-icons/fa";
import { adminApi } from "./adminAuth";
import { invalidateSiteContent } from "@/lib/siteContent";

const isLongField = (name) => /description|text|address|about|tagline/i.test(name);

const KeyEditor = ({ contentKey, title, hint, initialValue, onSaved }) => {
  const [value, setValue] = useState(initialValue || {});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(initialValue || {});
    setDirty(false);
  }, [initialValue]);

  const update = (k, v) => {
    setValue((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await adminApi.put(`/site-content/${encodeURIComponent(contentKey)}`, {
        value,
      });
      toast.success(`${title} saved`);
      setValue(data.value || value);
      setDirty(false);
      await invalidateSiteContent();
      onSaved?.(data.value);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setValue(initialValue || {});
    setDirty(false);
  };

  const fields = Object.keys(initialValue || {});

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-4" data-testid={`editor-${contentKey}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {hint && <p className="text-xs text-slate-500 mt-1 max-w-md">{hint}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          {dirty && (
            <button
              onClick={reset}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5"
              data-testid={`editor-${contentKey}-reset`}
            >
              <FaUndo className="text-[10px]" /> Reset
            </button>
          )}
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 disabled:bg-slate-300 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            data-testid={`editor-${contentKey}-save`}
          >
            <FaSave className="text-[10px]" /> {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {fields.map((f) => (
          <label key={f} className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {f.replace(/_/g, " ")}
            </span>
            {isLongField(f) ? (
              <textarea
                value={value[f] ?? ""}
                onChange={(e) => update(f, e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-sm text-slate-900 bg-white"
                data-testid={`editor-${contentKey}-${f}`}
              />
            ) : (
              <input
                type="text"
                value={value[f] ?? ""}
                onChange={(e) => update(f, e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-sm text-slate-900 bg-white"
                data-testid={`editor-${contentKey}-${f}`}
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
};

export default KeyEditor;
