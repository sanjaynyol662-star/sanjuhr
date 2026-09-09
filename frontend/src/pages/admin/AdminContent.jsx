import React, { useEffect, useState } from "react";
import axios from "axios";
import KeyEditor from "./KeyEditor";

import { API } from "@/lib/api";

const CONTENT_KEYS = [
  {
    key: "content:hero",
    title: "Homepage Hero",
    hint: "The big heading + tagline at the top of the homepage. Provide Hindi (हिन्दी) and English versions.",
  },
  {
    key: "content:about",
    title: "About Blurb",
    hint: "Short paragraph that describes the business — used on the homepage and about page.",
  },
  {
    key: "content:contact",
    title: "Contact Info",
    hint: "Phone, WhatsApp, email and address — shown in the footer and contact page.",
  },
];

const AdminContent = () => {
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    axios
      .get(`${API}/site-content`)
      .then((r) => setBundle(r.data?.content || {}))
      .catch(() => setBundle({}))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div data-testid="admin-content-page">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Front-page Text</h1>
      <p className="text-sm text-slate-600 mb-6 max-w-2xl">
        Update the copy that appears on the homepage and in the footer. Fields are
        available in both Hindi and English — visitors see the version that matches
        the language they've selected.
      </p>
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && CONTENT_KEYS.map((p) => (
        <KeyEditor
          key={p.key}
          contentKey={p.key}
          title={p.title}
          hint={p.hint}
          initialValue={bundle?.[p.key]}
        />
      ))}
    </div>
  );
};

export default AdminContent;
