import axios from "axios";

// Same-origin first: on any preview/production domain the ingress proxies /api
// to the backend, which avoids CORS entirely. This fixes "Failed to load" when
// the site is opened via a different preview URL than the one in .env.
const host = typeof window !== "undefined" ? window.location.hostname : "";
const sameOrigin =
  host.endsWith(".emergentagent.com") || host.includes("hrdigitalservices");

export const BACKEND_URL = sameOrigin
  ? window.location.origin
  : process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

/**
 * FastAPI/Pydantic validation errors return `detail` as an ARRAY of objects
 * (e.g. {type, loc, msg, input, ctx, url}). Rendering that object directly in
 * JSX ("toast.error(err.response.data.detail)") crashes React with
 * "Objects are not valid as a React child". This flattens any non-string
 * detail into a readable string so every caller stays safe.
 */
export function detailToString(detail) {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        if (typeof d === "string") return d;
        if (d && typeof d === "object") {
          const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "";
          return field ? `${field}: ${d.msg || ""}`.trim() : d.msg || "";
        }
        return String(d);
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof detail === "object") return detail.msg || JSON.stringify(detail);
  return String(detail);
}

/** Normalise error `detail` into a string on every response so UI never
 *  tries to render a raw validation-error object. */
export function normalizeAxiosError(err) {
  const d = err?.response?.data?.detail;
  if (d != null && typeof d !== "string") {
    try {
      err.response.data.detail = detailToString(d);
    } catch {
      /* response.data may be frozen — ignore */
    }
  }
  return err;
}

api.interceptors.response.use(
  (r) => r,
  (err) => Promise.reject(normalizeAxiosError(err))
);

export default api;
