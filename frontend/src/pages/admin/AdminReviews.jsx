import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaStar, FaRegStar, FaTrash, FaEye, FaEyeSlash, FaExternalLinkAlt } from "react-icons/fa";
import { adminApi } from "./adminAuth";

const Stars = ({ value }) => (
  <span className="inline-flex items-center gap-0.5 text-amber-500">
    {[1, 2, 3, 4, 5].map((n) => (n <= value ? <FaStar key={n} className="text-xs" /> : <FaRegStar key={n} className="text-xs text-slate-300" />))}
  </span>
);

const AdminReviews = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi
      .get("/admin/reviews")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch((err) => toast.error(err?.response?.data?.detail || "Load failed"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggle = async (r) => {
    try {
      await adminApi.put(`/admin/reviews/${r.id}/toggle`);
      toast.success(r.hidden ? "Review ab visible hai" : "Review chhupa diya");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    }
  };

  const remove = async (r) => {
    if (!window.confirm("Yeh review delete karein?")) return;
    try {
      await adminApi.delete(`/admin/reviews/${r.id}`);
      toast.success("Review deleted");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  };

  const linkFor = (r) => (r.target_type === "blog" ? `/blogs/${r.target_id}` : `/vacancies/${r.target_id}`);

  return (
    <div data-testid="admin-reviews-page">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-[23px] font-normal text-slate-800">Reviews</h1>
        <span className="ml-auto text-xs text-slate-500">{items.length} reviews</span>
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm" data-testid="admin-reviews-list">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm" data-testid="admin-reviews-empty">Abhi koi review nahi aayi hai.</div>
        ) : (
          items.map((r) => (
            <div
              key={r.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-slate-100 ${r.hidden ? "bg-slate-50" : "hover:bg-emerald-50/40"}`}
              data-testid={`admin-review-row-${r.id}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800 text-sm">{r.name}</span>
                  <Stars value={r.rating} />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.target_type === "blog" ? "text-sky-700 bg-sky-50" : "text-emerald-700 bg-emerald-50"}`}>
                    {r.target_type}
                  </span>
                  {r.hidden && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-slate-500 bg-slate-200">Hidden</span>}
                </div>
                {r.comment && <p className="text-sm text-slate-600 mt-1 line-clamp-3">{r.comment}</p>}
                <a href={linkFor(r)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline mt-1">
                  {r.target_title || r.target_id} <FaExternalLinkAlt className="text-[9px]" />
                </a>
              </div>
              <div className="flex items-center gap-1 sm:justify-end shrink-0">
                <button
                  onClick={() => toggle(r)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                  data-testid={`admin-review-toggle-${r.id}`}
                >
                  {r.hidden ? <><FaEye /> Show</> : <><FaEyeSlash /> Hide</>}
                </button>
                <button
                  onClick={() => remove(r)}
                  className="p-2 rounded text-red-500 hover:bg-red-50"
                  data-testid={`admin-review-delete-${r.id}`}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminReviews;
