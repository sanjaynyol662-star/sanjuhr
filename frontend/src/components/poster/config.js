// Site-wide constants used by the poster share feature.
export const SITE_NAME = "HR Digital Services";
export const SITE_TAGLINE = "Latest Government & Private Job Updates";
export const SITE_DOMAIN = "hrdigitalservices.in";
// Base URL for the QR code — points to the live site so scanned QRs open the
// vacancy detail page. Falls back to the current origin at runtime if unset.
export const SITE_BASE_URL =
  (typeof window !== "undefined" && window.location?.origin) ||
  "https://hrdigitalservices.in";
