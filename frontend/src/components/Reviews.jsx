import React, { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { FaStar, FaRegStar, FaUserCircle, FaCommentDots } from "react-icons/fa";

const Stars = ({ value, onChange, size = "text-lg" }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        type="button"
        key={n}
        onClick={onChange ? () => onChange(n) : undefined}
        className={`${onChange ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"} ${size} ${n <= value ? "text-amber-400" : "text-slate-500"}`}
        aria-label={`${n} star`}
        data-testid={onChange ? `review-star-${n}` : undefined}
      >
        {n <= value ? <FaStar /> : <FaRegStar />}
      </button>
    ))}
  </div>
);

const Reviews = ({ targetType, targetId, hi = false }) => {
  const [data, setData] = useState({ items: [], count: 0, average: 0 });
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!targetId) return;
    api
      .get("/reviews", { params: { target_type: targetType, target_id: targetId } })
      .then((r) => setData(r.data || { items: [], count: 0, average: 0 }))
      .catch(() => {});
  }, [targetType, targetId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error(hi ? "कृपया अपना नाम भरें" : "Please enter your name");
    if (!rating) return toast.error(hi ? "कृपया रेटिंग चुनें" : "Please choose a rating");
    setBusy(true);
    try {
      await api.post("/reviews", { target_type: targetType, target_id: targetId, name, rating, comment });
      toast.success(hi ? "समीक्षा जुड़ गई — धन्यवाद!" : "Review posted — thank you!");
      setName(""); setRating(0); setComment("");
      load();
    } catch {
      toast.error(hi ? "समीक्षा सबमिट नहीं हुई" : "Could not submit review");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20 outline-none text-sm";

  return (
    <div className="glass p-6 mt-8" data-testid="reviews-section">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
          <FaCommentDots className="text-emerald-400" /> {hi ? "समीक्षाएँ" : "Reviews"}
        </h3>
        {data.count > 0 && (
          <div className="flex items-center gap-2" data-testid="reviews-average">
            <Stars value={Math.round(data.average)} />
            <span className="text-white font-bold">{data.average}</span>
            <span className="text-slate-400 text-sm">({data.count})</span>
          </div>
        )}
      </div>

      {/* Submit form */}
      <form onSubmit={submit} className="space-y-3 mb-6" data-testid="review-form">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-300">{hi ? "आपकी रेटिंग:" : "Your rating:"}</span>
          <Stars value={rating} onChange={setRating} size="text-2xl" />
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={hi ? "आपका नाम" : "Your name"}
          className={inputCls}
          data-testid="review-name"
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={hi ? "अपना अनुभव लिखें (वैकल्पिक)" : "Write your experience (optional)"}
          className={inputCls}
          data-testid="review-comment"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold px-5 py-2.5 text-sm transition"
          data-testid="review-submit"
        >
          {busy ? (hi ? "भेजा जा रहा है…" : "Submitting…") : (hi ? "समीक्षा पोस्ट करें" : "Post Review")}
        </button>
      </form>

      {/* List */}
      <div className="space-y-3" data-testid="reviews-list">
        {data.items.length === 0 ? (
          <p className="text-slate-400 text-sm" data-testid="reviews-empty">
            {hi ? "अभी तक कोई समीक्षा नहीं — पहली समीक्षा आप दें!" : "No reviews yet — be the first to review!"}
          </p>
        ) : (
          data.items.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4" data-testid={`review-item-${r.id}`}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="flex items-center gap-2 text-white font-semibold text-sm">
                  <FaUserCircle className="text-slate-400 text-lg" /> {r.name}
                </span>
                <Stars value={r.rating} size="text-sm" />
              </div>
              {r.comment && <p className="text-slate-300 text-sm leading-relaxed">{r.comment}</p>}
              <p className="text-[11px] text-slate-500 mt-1.5">
                {new Date(r.created_at).toLocaleDateString(hi ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;
