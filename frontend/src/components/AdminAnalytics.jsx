import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { FaChartLine, FaChartPie, FaChartBar, FaCoins } from "react-icons/fa";

const EMERALD = "#10b981";
const AMBER = "#fbbf24";
const SKY = "#38bdf8";
const RED = "#f87171";
const PURPLE = "#a78bfa";
const COLORS = [EMERALD, AMBER, SKY, RED, PURPLE, "#f472b6"];

const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

const AdminAnalytics = () => {
  const { lang } = useI18n();
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/admin/analytics").then(r => setData(r.data)).catch(() => {});
  }, []);
  if (!data) return <div className="glass p-10 text-center text-slate-500">Loading analytics…</div>;

  const dailyCombined = data.solar_by_day.map((s, i) => ({
    date: s.date.slice(5), // MM-DD
    Solar: s.count,
    Loan: data.loan_by_day[i]?.count || 0,
    Users: data.user_by_day[i]?.count || 0,
  }));

  const tooltipStyle = {
    backgroundColor: "rgba(15,22,19,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#e6ece9",
    fontSize: "12px",
  };

  return (
    <div className="space-y-4" data-testid="admin-analytics">
      {/* Loan amount summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: lang === "hi" ? "कुल लोन राशि" : "Total Loan Amount", val: inr(data.loan_amount.total || 0), color: "text-emerald-400" },
          { label: lang === "hi" ? "औसत लोन" : "Avg Loan", val: inr(data.loan_amount.avg || 0), color: "text-amber-400" },
          { label: lang === "hi" ? "अधिकतम लोन" : "Max Loan", val: inr(data.loan_amount.max || 0), color: "text-sky-400" },
        ].map((s, i) => (
          <div key={i} className="glass p-4" data-testid={`loan-summary-${i}`}>
            <div className="flex items-center gap-2 mb-1">
              <FaCoins className={s.color} />
              <div className="text-[11px] text-slate-400 uppercase tracking-widest">{s.label}</div>
            </div>
            <div className={`font-display text-2xl font-bold ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Line chart: applications over last 30 days */}
      <div className="glass p-5" data-testid="chart-daily-applications">
        <div className="flex items-center gap-2 mb-3">
          <FaChartLine className="text-emerald-400" />
          <h3 className="font-semibold text-white">{lang === "hi" ? "पिछले 30 दिनों में आवेदन / यूज़र्स" : "Applications & Users — last 30 days"}</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailyCombined} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} interval={4} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Solar" stroke={EMERALD} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Loan" stroke={AMBER} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Users" stroke={SKY} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-5" data-testid="chart-solar-status">
          <div className="flex items-center gap-2 mb-3">
            <FaChartPie className="text-emerald-400" />
            <h3 className="font-semibold text-white">{lang === "hi" ? "सोलर आवेदन — स्थिति" : "Solar — by Status"}</h3>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={data.solar_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {data.solar_by_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0.2)" />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5" data-testid="chart-loan-status">
          <div className="flex items-center gap-2 mb-3">
            <FaChartPie className="text-amber-400" />
            <h3 className="font-semibold text-white">{lang === "hi" ? "लोन आवेदन — स्थिति" : "Loan — by Status"}</h3>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={data.loan_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {data.loan_by_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0.2)" />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar charts by type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-5" data-testid="chart-solar-type">
          <div className="flex items-center gap-2 mb-3">
            <FaChartBar className="text-emerald-400" />
            <h3 className="font-semibold text-white">{lang === "hi" ? "सोलर — प्रकार" : "Solar — by Type"}</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.solar_by_type} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="type" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(16,185,129,0.08)" }} />
              <Bar dataKey="count" fill={EMERALD} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass p-5" data-testid="chart-loan-type">
          <div className="flex items-center gap-2 mb-3">
            <FaChartBar className="text-amber-400" />
            <h3 className="font-semibold text-white">{lang === "hi" ? "लोन — प्रकार" : "Loan — by Type"}</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.loan_by_type} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="type" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(251,191,36,0.08)" }} />
              <Bar dataKey="count" fill={AMBER} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
