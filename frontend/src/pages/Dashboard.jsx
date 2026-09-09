import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FaSolarPanel, FaMoneyBillWave, FaFilePdf, FaUserCircle, FaFileAlt, FaPlusCircle, FaChevronRight } from "react-icons/fa";

const badgeCls = (s) => {
  const m = { submitted: "badge-submitted", under_review: "badge-review", approved: "badge-approved", rejected: "badge-rejected" };
  return `badge ${m[s] || "badge-submitted"}`;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [solar, setSolar] = useState([]);
  const [loan, setLoan] = useState([]);
  const [tab, setTab] = useState("solar");

  useEffect(() => {
    api.get("/solar/my").then(r => setSolar(r.data)).catch(() => {});
    api.get("/loan/my").then(r => setLoan(r.data)).catch(() => {});
  }, []);

  const downloadPdf = (app, kind) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129);
    doc.text("HARYANA ENTERPRISES", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Kagdana, Sirsa, Haryana | 8167862016 | haryanaenterpriseskagdana@gmail.com", 14, 24);
    doc.setDrawColor(16, 185, 129);
    doc.line(14, 27, 196, 27);
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text(`${kind === "solar" ? "Solar" : "Loan"} Application — ${app.ref_no}`, 14, 36);

    const rows = Object.entries(app)
      .filter(([k]) => !["_id", "id", "user_id"].includes(k))
      .map(([k, v]) => [k.replace(/_/g, " ").toUpperCase(), String(v ?? "-")]);
    autoTable(doc, {
      startY: 42,
      head: [["Field", "Value"]],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 249, 247] },
    });
    const y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("This is a system-generated acknowledgement. Our team will contact you within 24 hours.", 14, y);
    doc.save(`${app.ref_no}.pdf`);
  };

  const stats = [
    { icon: FaSolarPanel, label: lang === "hi" ? "सोलर आवेदन" : "Solar Applications", val: solar.length, color: "from-emerald-500 to-emerald-700" },
    { icon: FaMoneyBillWave, label: lang === "hi" ? "लोन आवेदन" : "Loan Applications", val: loan.length, color: "from-amber-500 to-amber-700" },
    { icon: FaFileAlt, label: lang === "hi" ? "कुल आवेदन" : "Total Applications", val: solar.length + loan.length, color: "from-sky-500 to-sky-700" },
    { icon: FaUserCircle, label: lang === "hi" ? "प्रोफ़ाइल" : "Profile", val: (user && user.name) || "-", color: "from-purple-500 to-purple-700", isText: true },
  ];

  const data = tab === "solar" ? solar : loan;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" data-testid="dashboard-page">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="section-eyebrow">Portal</div>
          <h1 className="section-title !text-3xl">{lang === "hi" ? "मेरा डैशबोर्ड" : "My Dashboard"}</h1>
          <p className="text-slate-400 mt-1 text-sm">{lang === "hi" ? "नमस्ते" : "Welcome"}, <b className="text-white">{user?.name}</b>! {lang === "hi" ? "यहाँ आपके सभी आवेदनों की स्थिति देखें।" : "View all your application statuses here."}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/solar/apply" className="btn-mint text-sm" data-testid="new-solar-btn"><FaPlusCircle /> {lang === "hi" ? "नया सोलर" : "New Solar"}</Link>
          <Link to="/loan/apply" className="btn-amber text-sm" data-testid="new-loan-btn"><FaPlusCircle /> {lang === "hi" ? "नया लोन" : "New Loan"}</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="glass p-5 flex items-start gap-4" data-testid={`stat-card-${i}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${s.color} text-white shrink-0`}><Icon /></div>
              <div>
                <div className="text-2xl font-display font-bold text-white truncate max-w-[10rem]">{s.val}</div>
                <div className="text-xs text-slate-400 mt-0.5 uppercase tracking-widest">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass p-4">
        <div className="flex gap-2 border-b border-white/5 mb-4 pb-1">
          <button className={`px-4 py-2 font-semibold text-sm rounded-lg transition ${tab === "solar" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "text-slate-400 hover:text-white"}`} onClick={() => setTab("solar")} data-testid="tab-solar">
            <FaSolarPanel className="inline mr-1" /> {lang === "hi" ? "सोलर" : "Solar"} <span className="ml-1 text-xs opacity-70">({solar.length})</span>
          </button>
          <button className={`px-4 py-2 font-semibold text-sm rounded-lg transition ${tab === "loan" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-white"}`} onClick={() => setTab("loan")} data-testid="tab-loan">
            <FaMoneyBillWave className="inline mr-1" /> {lang === "hi" ? "लोन" : "Loan"} <span className="ml-1 text-xs opacity-70">({loan.length})</span>
          </button>
        </div>

        {data.length === 0 ? (
          <div className="text-center py-16 text-slate-500" data-testid="empty-state">
            <FaFileAlt className="mx-auto text-5xl text-slate-600 mb-3" />
            <p className="text-slate-400 mb-4">{lang === "hi" ? "अभी तक कोई आवेदन नहीं है।" : "No applications yet."}</p>
            <Link to={tab === "solar" ? "/solar/apply" : "/loan/apply"} className="btn-mint text-sm inline-flex" data-testid="empty-apply-btn">
              <FaPlusCircle /> {lang === "hi" ? "अभी आवेदन करें" : "Apply Now"} <FaChevronRight />
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ref No</th>
                  <th>{lang === "hi" ? "प्रकार" : "Type"}</th>
                  <th>{lang === "hi" ? "नाम" : "Name"}</th>
                  <th>{lang === "hi" ? "स्थिति" : "Status"}</th>
                  <th>{lang === "hi" ? "तिथि" : "Date"}</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {data.map(a => (
                  <tr key={a.id} data-testid={`app-row-${a.ref_no}`}>
                    <td className="font-mono font-bold text-emerald-400">{a.ref_no}</td>
                    <td>{tab === "solar" ? a.application_type : a.loan_type}</td>
                    <td>{a.full_name}</td>
                    <td><span className={badgeCls(a.status)}>{a.status}</span></td>
                    <td className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => downloadPdf(a, tab)} className="text-red-400 hover:text-red-300 text-xl" data-testid={`pdf-btn-${a.ref_no}`} title="Download PDF">
                        <FaFilePdf />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
