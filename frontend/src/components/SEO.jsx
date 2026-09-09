import React from "react";
import { Helmet } from "react-helmet-async";
import { useContentKey } from "../lib/siteContent";

/**
 * Reusable SEO component. Renders <title>, meta description, keywords, canonical,
 * Open Graph, Twitter Card and optional JSON-LD structured data.
 *
 * Preferred usage — bind the page to an admin-managed key so the SEO team can
 * edit it live without a redeploy:
 *   <SEO seoKey="seo:home" path="/" />
 *
 * Legacy usage (still supported) — pass title/description explicitly:
 *   <SEO title="..." description="..." path="/vacancies" jsonLd={...} />
 */
const SITE_URL = "https://hrdigitalservices.in";
const DEFAULT_IMAGE = `${SITE_URL}/og-cover.png`;

const SEO = ({
  seoKey,
  title,
  description,
  keywords,
  path = "",
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
  jsonLd = null,
}) => {
  const admin = useContentKey(seoKey || "");

  // Explicit prop wins; admin-managed value comes next; hardcoded default last.
  const effectiveTitle = title || admin.title || "";
  const effectiveDesc =
    description ||
    admin.description ||
    "Kagdana, Sirsa's Government-approved rooftop solar vendor. Consultation, site survey, installation assistance + latest sarkari job alerts for students.";
  const effectiveKeywords = keywords || admin.keywords || "";

  const fullTitle = effectiveTitle
    ? `${effectiveTitle} | HR Digital Services`
    : "HR Digital Services | Govt. Approved Rooftop Solar Vendor · Sirsa";
  const url = `${SITE_URL}${path}`;

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={effectiveDesc} />
      {effectiveKeywords && <meta name="keywords" content={effectiveKeywords} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={effectiveDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={effectiveDesc} />
      <meta name="twitter:image" content={image} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
