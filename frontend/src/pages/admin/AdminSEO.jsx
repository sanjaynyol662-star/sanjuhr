import React, { useEffect, useState } from "react";
import axios from "axios";
import KeyEditor from "./KeyEditor";

import { API } from "@/lib/api";

const SEO_PAGES = [
  { key: "seo:vacancies", title: "Vacancy Homepage (/)", hint: "Shown on / — the highest-traffic page. Target job-seeker keywords like 'sarkari naukri', 'admit card', state names." },
  { key: "seo:solar",     title: "Solar Services (/solar)", hint: "Shown on /solar — the solar business page. Target solar-buyer keywords." },
  { key: "seo:blogs",     title: "Blogs (/blogs)", hint: "Shown on /blogs — Haryana jobs articles hub." },
  { key: "seo:services",  title: "Services",    hint: "Shown on /services." },
  { key: "seo:about",     title: "About",       hint: "Shown on /about." },
  { key: "seo:contact",   title: "Contact",     hint: "Shown on /contact." },
];

const AdminSEO = () => {
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
    <div data-testid="admin-seo-page">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Site SEO</h1>
      <p className="text-sm text-slate-600 mb-6 max-w-2xl">
        Edit the title, meta description and keywords for each page. Changes go live
        instantly on the public site (search-engine crawlers will pick them up on
        their next visit — usually 1-7 days).
      </p>
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && SEO_PAGES.map((p) => (
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

export default AdminSEO;
