import axios from "axios";
import { clearAdminSession, getAdminSession, isAdminArea, markExpired } from "./lib/adminSession";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
});

// The admin sign-in itself sends no token at all.
const isAdminSignIn = (url = "") => /\/api\/auth\/admin\/login$/.test(url);

// ── Attach the right token ──
// Admin pages send the admin session; every other page sends the customer's
// token. The two never mix, and the server checks each one on every request.
API.interceptors.request.use(
  (config) => {
    if (isAdminSignIn(config.url)) return config;
    const admin = isAdminArea() ? getAdminSession() : null;
    const token = admin && admin.active ? admin.token : admin ? null : localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.usedAdminSession = !!admin;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Handle 401 globally (token expired / invalid) ──
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config || {};
    const isAuthCall = /\/api\/auth\//.test(config.url || "");
    if (error.response && error.response.status === 401 && !isAuthCall) {
      const here = window.location.pathname + window.location.search;
      if (config.usedAdminSession) {
        // The admin session ran out or was signed out elsewhere.
        markExpired();
        clearAdminSession();
        window.location.href = `/admin/login?next=${encodeURIComponent(here)}`;
      } else if (!isAdminArea()) {
        ["token", "userId", "role", "userName", "user"].forEach((k) => localStorage.removeItem(k));
        if (window.location.pathname !== "/login") {
          window.location.href = `/login?next=${encodeURIComponent(here)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
