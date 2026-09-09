import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/lib/api";
import { enhanceHtml } from "@/lib/htmlContent";
import SEO from "@/components/SEO";
import RawHead from "@/components/RawHead";
import Reviews from "@/components/Reviews";
import ChannelLinks from "@/components/ChannelLinks";
import { useI18n } from "@/context/I18nContext";
import { FaWhatsapp, FaCalendarAlt, FaUser, FaNewspaper } from "react-icons/fa";
import SocialShare from "@/components/SocialShare";
import { WHATSAPP_CHANNEL_URL } from "@/lib/whatsapp";

import { BACKEND_URL as BACKEND } from "@/lib/api";

const BlogDetail = () => {
  const { slug } = useParams();
  const { lang } = useI18n();
  const hi = lang === "hi";
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/blogs/${slug}`)
      .then((r) => setBlog(r.data))
      .catch(() => setBlog(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16" data-testid="blog-detail-loading">
        <div className="glass h-96 animate-pulse" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center" data-testid="blog-detail-not-found">
        <FaNewspaper className="mx-auto text-4xl text-slate-600 mb-4" />
        <h1 className="font-display text-2xl font-bold text-white mb-4">{hi ? "ब्लॉग नहीं मिला" : "Blog not found"}</h1>
        <Link to="/blogs" className="btn-mint inline-flex" data-testid="blog-back-link">← {hi ? "सभी ब्लॉग" : "All Blogs"}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10" data-testid="blog-detail-page">
      <SEO title={blog.title} description={blog.excerpt} path={`/blogs/${blog.slug}`} type="article" />
      {blog.custom_head && <RawHead html={blog.custom_head} />}
      <Link to="/blogs" className="link-mint inline-flex items-center gap-2 text-sm mb-4" data-testid="blog-back-link">
        ← {hi ? "सभी ब्लॉग" : "All Blogs"}
      </Link>

      {blog.image_url && (
        <img src={`${BACKEND}${blog.image_url}`} alt={blog.title} className="w-full h-auto max-h-[32rem] object-contain rounded-2xl my-6 border border-white/10 bg-slate-900/40" />
      )}

      <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white leading-tight" data-testid="blog-detail-title">{blog.title}</h1>
      <div className="flex items-center gap-4 mt-4 pb-6 border-b border-white/10 text-sm text-slate-400">
        <span className="flex items-center gap-1.5"><FaUser /> {blog.author || "HR Digital Services"}</span>
        <span className="flex items-center gap-1.5">
          <FaCalendarAlt />
          {new Date(blog.created_at).toLocaleDateString(hi ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      <SocialShare title={blog.title} text={blog.excerpt || ""} lang={lang} className="mt-4" />

      <article className="vacancy-article mt-8" dangerouslySetInnerHTML={{ __html: enhanceHtml(blog.content) }} data-testid="blog-detail-content" />

      {blog.center_image_url && (
        <figure className="my-8 flex justify-center" data-testid="blog-center-image">
          <img
            src={`${BACKEND}${blog.center_image_url}`}
            alt={blog.title}
            className="max-w-full h-auto rounded-2xl border border-white/10"
          />
        </figure>
      )}

      <div className="glass mt-12 p-6 text-center !border-[#25D366]/40">
        <h3 className="font-display text-xl font-bold text-white mb-2">
          {hi ? "Latest Haryana Jobs की Updates चाहिए?" : "Want Latest Haryana Job Updates?"}
        </h3>
        <p className="text-slate-400 text-sm mb-5">
          {hi ? "WhatsApp Channel join करें — हर नई भर्ती की summary सीधे आपके phone पर।" : "Join our WhatsApp Channel — every new vacancy summary straight to your phone."}
        </p>
        <a
          href={WHATSAPP_CHANNEL_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-6 py-3.5 transition"
          data-testid="blog-join-whatsapp-button"
        >
          <FaWhatsapp className="text-lg" /> {hi ? "Join WhatsApp Channel" : "Join WhatsApp Channel"}
        </a>
      </div>

      <Reviews targetType="blog" targetId={blog.slug} hi={hi} />
      <ChannelLinks hi={hi} />
    </div>
  );
};

export default BlogDetail;
