import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
});

// ── Attach the signed-in user's JWT to every request ──
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Handle 401 globally (token expired / invalid) ──
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCall = /\/api\/auth\//.test(error.config?.url || "");
    if (error.response && error.response.status === 401 && !isAuthCall) {
      ["token", "userId", "role", "userName", "user"].forEach((k) => localStorage.removeItem(k));
      const here = window.location.pathname + window.location.search;
      if (window.location.pathname !== "/login") {
        window.location.href = `/login?next=${encodeURIComponent(here)}`;
      }
    }
    return Promise.reject(error);
  }
);

export default API;
