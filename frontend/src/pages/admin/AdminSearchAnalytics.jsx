import React, { useEffect, useState } from "react";
import { FaSearch, FaFire, FaExclamationTriangle, FaChartBar, FaLightbulb } from "react-icons/fa";
import { adminApi } from "./adminAuth";

const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-IN") : "—");
const timeAgo = (d) => {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const Summary = ({ icon: Icon, value, label, tint, testid }) => (
  <div className="admin-card rounded-2xl bg-white p-5" data-testid={testid}>
    <div className={`w-11 h-11 rounded-2xl grid place-items-center mb-3 ${tint}`}><Icon className="text-lg" /></div>
    <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
    <div className="text-[13px] text-slate-500 mt-1 font-medium">{label}</div>
  </div>
);

const AdminSearchAnalytics = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.get("/admin/search-analytics", { params: { days } })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  const top = data?.top || [];
  const zero = data?.zero_results || [];
  const maxCount = Math.max(1, ...top.map((t) => t.count));

  return (
    <div data-testid="admin-search-analytics">
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="text-[24px] font-extrabold text-slate-900">Search Analytics</h1>
        <div className="ml-auto flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${days === d ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-100"}`}
              data-testid={`search-analytics-range-${d}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-6">Visitors क्या ढूँढ रहे हैं देखें — top searches के लिए content बनाकर site को rank कराएँ।</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Summary icon={FaSearch} value={fmt(data?.total_searches)} label="Total Searches" tint="bg-emerald-500/10 text-emerald-600" testid="sa-total" />
        <Summary icon={FaChartBar} value={fmt(data?.unique_terms)} label="Unique Terms" tint="bg-sky-500/10 text-sky-600" testid="sa-unique" />
        <Summary icon={FaExclamationTriangle} value={fmt(zero.reduce((a, z) => a + z.count, 0))} label="No-result Searches" tint="bg-amber-500/10 text-amber-600" testid="sa-zero" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top searches */}
        <div className="admin-card rounded-2xl bg-white border border-slate-200 p-5" data-testid="sa-top-list">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4"><FaFire className="text-orange-500" /> Top Searches</h3>
          {loading ? (
            <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
          ) : top.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center" data-testid="sa-top-empty">अभी तक कोई search नहीं हुई।</p>
          ) : (
            <div className="space-y-3">
              {top.map((t, i) => (
                <div key={i} data-testid={`sa-top-row-${i}`}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-800 truncate flex items-center gap-2">
                      <span className="text-slate-300 tabular-nums w-5">{i + 1}</span> {t.query}
                      {t.avg_results === 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">0 results</span>}
                    </span>
                    <span className="text-slate-500 font-bold tabular-nums shrink-0 ml-2">{fmt(t.count)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(t.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zero-result searches */}
        <div className="admin-card rounded-2xl bg-white border border-slate-200 p-5" data-testid="sa-zero-list">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-1"><FaLightbulb className="text-amber-500" /> No-result Searches</h3>
          <p className="text-xs text-slate-500 mb-4">इन terms पर कोई vacancy/post नहीं मिली — इनके लिए content बनाएँ ताकि ये searches convert हों।</p>
          {loading ? (
            <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
          ) : zero.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center" data-testid="sa-zero-empty">बढ़िया! हर search पर result मिल रहे हैं।</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {zero.map((z, i) => (
                <div key={i} className="flex items-center justify-between py-2.5" data-testid={`sa-zero-row-${i}`}>
                  <span className="text-sm font-semibold text-slate-800 truncate">{z.query}</span>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">{z.count}× · {timeAgo(z.last_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSearchAnalytics;
