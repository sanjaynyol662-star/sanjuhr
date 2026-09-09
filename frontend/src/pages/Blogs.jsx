import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import SEO from "@/components/SEO";
import { useI18n } from "@/context/I18nContext";
import { FaCalendarAlt, FaNewspaper, FaChevronRight } from "react-icons/fa";

import { BACKEND_URL as BACKEND } from "@/lib/api";

const Blogs = () => {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/blogs")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : r.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="blogs-page">
      <SEO seoKey="seo:blogs" path="/blogs" />
      <div className="section-eyebrow">Blogs</div>
      <h1 className="section-title !text-3xl" data-testid="blogs-heading">
        {hi ? "ब्लॉग और करियर गाइड" : "Blogs & Career Guides"}
      </h1>
      <p className="text-slate-400 mt-2 text-sm max-w-2xl">
        {hi
          ? "Haryana Jobs से जुड़े ताज़ा articles — exam preparation, recruitment guides और solar subsidy की जानकारी।"
          : "Latest articles on Haryana Jobs — exam preparation, recruitment guides and solar subsidy info."}
      </p>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {[...Array(3)].map((_, i) => <div key={i} className="glass h-64 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="glass p-10 text-center text-slate-400 mt-8" data-testid="blogs-empty">
          <FaNewspaper className="mx-auto text-3xl mb-3 text-slate-500" />
          {hi ? "अभी कोई article नहीं है — जल्द ही आएगा!" : "No articles yet — coming soon!"}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8" data-testid="blogs-grid">
          {items.map((b, i) => (
            <Link
              key={b.id}
              to={`/blogs/${b.slug}`}
              className="glass overflow-hidden group hover:border-emerald-500/40 transition flex flex-col"
              data-testid={`blog-card-${b.slug}`}
            >
              {b.image_url ? (
                <img src={`${BACKEND}${b.image_url}`} alt={b.title} className="w-full h-44 object-contain bg-slate-900/40" loading="lazy" />
              ) : (
                <div className="w-full h-44 bg-gradient-to-br from-emerald-900/60 to-slate-900 grid place-items-center">
                  <FaNewspaper className="text-4xl text-emerald-500/40" />
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-2">
                  <FaCalendarAlt />
                  {new Date(b.created_at).toLocaleDateString(hi ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <h2 className="font-display font-bold text-white text-lg leading-snug group-hover:text-emerald-400 transition mb-2">{b.title}</h2>
                <p className="text-sm text-slate-400 line-clamp-2 flex-1">{b.excerpt}</p>
                <span className="mt-3 text-sm font-semibold text-emerald-400 inline-flex items-center gap-1">
                  {hi ? "पढ़ें" : "Read"} <FaChevronRight className="text-xs group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blogs;
