/**
 * Small helper module for admin-only token storage + a preconfigured axios
 * instance that always sends the Bearer header. Kept separate from the public
 * `/lib/api.js` so we don't accidentally leak the admin token on public routes.
 */
import axios from "axios";

const KEY = "he_admin_token_v1";
import { BACKEND_URL, normalizeAxiosError } from "@/lib/api";
export const ADMIN_API = `${BACKEND_URL}/api`;

export const getAdminToken = () => {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};

export const setAdminToken = (token) => {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* localStorage disabled — session-only */
  }
};

export const clearAdminToken = () => setAdminToken("");

/** Axios instance that auto-attaches the admin Bearer header on every request. */
export const adminApi = axios.create({
  baseURL: ADMIN_API,
  withCredentials: true,
});

adminApi.interceptors.request.use((config) => {
  const t = getAdminToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      clearAdminToken();
    }
    return Promise.reject(normalizeAxiosError(err));
  }
);
