import { useEffect } from "react";
import { BACKEND_URL } from "@/lib/api";

// Injects Google Search Console verification meta + Google Analytics (GA4)
// based on settings saved in the admin panel (Analytics & SEO).
const SeoHead = () => {
  useEffect(() => {
    let cancelled = false;
    fetch(`${BACKEND_URL}/api/site-settings`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;

        // Google Search Console verification meta tag
        if (data.gsc_verification) {
          const raw = String(data.gsc_verification);
          const content = raw.includes("<meta")
            ? (raw.match(/content=["']([^"']+)["']/)?.[1] || "")
            : raw.trim();
          if (content && !document.querySelector('meta[name="google-site-verification"]')) {
            const m = document.createElement("meta");
            m.name = "google-site-verification";
            m.content = content;
            document.head.appendChild(m);
          }
        }

        // Webpushr push notifications (site key from admin panel)
        if (data.webpushr_key && !window.__webpushrLoaded) {
          window.__webpushrLoaded = true;
          const key = String(data.webpushr_key).trim();
          window.webpushr = window.webpushr || function () { (window.webpushr.q = window.webpushr.q || []).push(arguments); };
          window._webpushrScriptReady = function () {
            window.webpushr("fetch_id", function (sid) {
              if (!sid) return;
              fetch(`${BACKEND_URL}/api/webpushr/subscriber`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriber_id: Number(sid) }) }).catch(() => {});
            });
          };
          const js = document.createElement("script");
          js.id = "webpushr-jssdk"; js.async = true; js.src = "https://cdn.webpushr.com/app.min.js";
          document.head.appendChild(js);
          window.webpushr("setup", { key });
        }

        // Google Analytics (GA4)
        if (data.ga4_id && !window.__ga4Loaded) {
          window.__ga4Loaded = true;
          const s = document.createElement("script");
          s.async = true;
          s.src = `https://www.googletagmanager.com/gtag/js?id=${data.ga4_id}`;
          document.head.appendChild(s);
          window.dataLayer = window.dataLayer || [];
          window.gtag = function () { window.dataLayer.push(arguments); };
          window.gtag("js", new Date());
          window.gtag("config", data.ga4_id);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return null;
};

export default SeoHead;
