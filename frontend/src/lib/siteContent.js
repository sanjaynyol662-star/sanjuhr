/**
 * Site Content client — fetches the admin-editable content bundle from
 * /api/site-content once and exposes a lightweight React hook + a plain
 * async getter for the SEO component (which needs the value synchronously
 * inside <Helmet>).
 *
 * We cache the bundle in-memory so every page swap doesn't refire the request.
 */
import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/lib/api";

let _cache = null;
let _inflight = null;
const _listeners = new Set();

export const loadSiteContent = async () => {
  if (_cache) return _cache;
  if (_inflight) return _inflight;
  _inflight = axios
    .get(`${API}/site-content`)
    .then((r) => {
      _cache = r.data?.content || {};
      _listeners.forEach((cb) => cb(_cache));
      return _cache;
    })
    .catch(() => {
      _cache = {};
      return _cache;
    })
    .finally(() => {
      _inflight = null;
    });
  return _inflight;
};

/** Force a re-fetch (called by admin panel after PUT). */
export const invalidateSiteContent = async () => {
  _cache = null;
  return loadSiteContent();
};

/** Synchronous read — returns cached value or empty object. */
export const getSiteContent = () => _cache || {};

/** React hook — returns the whole bundle and re-renders on updates. */
export const useSiteContent = () => {
  const [c, setC] = useState(_cache || {});
  useEffect(() => {
    if (!_cache) loadSiteContent().then(setC);
    const cb = (v) => setC({ ...v });
    _listeners.add(cb);
    return () => _listeners.delete(cb);
  }, []);
  return c;
};

/** Convenience getter for a single key. */
export const useContentKey = (key) => {
  const all = useSiteContent();
  return all[key] || {};
};
