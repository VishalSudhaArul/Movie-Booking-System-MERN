// useVerifiedSession.js
// The role saved in localStorage is only a hint (anyone can edit it in the
// browser). Before showing staff-only links or pages, ask the server who this
// token belongs to: GET /api/users/me reads the role from the database.
// Every admin API is still protected on the server; this only decides what the
// browser shows.

import { useEffect, useState } from "react";
import { clearSession, getSession, SESSION_EVENT } from "./session";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const STAFF_ROLES = ["admin", "theaterOwner"];

// One check per token per page load, shared by every component that asks.
let cache = { token: null, promise: null, result: null };

const verify = (token) => {
  if (cache.token === token && (cache.result || cache.promise)) return cache.promise || Promise.resolve(cache.result);
  cache = { token, promise: null, result: null };
  cache.promise = fetch(`${BASE}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (res) => {
      if (res.status === 401) return { status: "signed-out" };
      if (!res.ok) return { status: "error" };
      const me = await res.json();
      return { status: "ok", role: me.role || "user", name: me.name };
    })
    .catch(() => ({ status: "error" }))
    .then((result) => {
      if (cache.token !== token) return result; // signed out or switched account meanwhile
      cache.promise = null;
      // Don't cache failures, so the next page can try again.
      cache.result = result.status === "ok" ? result : null;
      if (result.status === "ok") {
        // Keep the UI hint in step with the database (e.g. after a promotion).
        if (localStorage.getItem("role") !== result.role) {
          localStorage.setItem("role", result.role);
          window.dispatchEvent(new Event(SESSION_EVENT));
        }
      } else if (result.status === "signed-out") {
        clearSession(); // the token is invalid or expired
      }
      return result;
    });
  return cache.promise;
};

/** For tests. */
export const resetVerifiedSession = () => {
  cache = { token: null, promise: null, result: null };
};

/**
 * The session plus a server-checked role:
 * - status: "anonymous" | "checking" | "verified" | "error"
 * - isStaff: true only after the server confirmed an admin or theatre-owner role
 */
export default function useVerifiedSession() {
  const [session, setSession] = useState(getSession);
  const [check, setCheck] = useState(() =>
    cache.result && cache.token === session.token ? cache.result : null
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const onChange = () => setSession(getSession());
    window.addEventListener(SESSION_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SESSION_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const { token, isLoggedIn } = session;
  useEffect(() => {
    if (!isLoggedIn) {
      setCheck(null);
      return undefined;
    }
    let alive = true;
    if (!(cache.result && cache.token === token)) setCheck(null);
    verify(token).then((result) => alive && setCheck(result));
    return () => {
      alive = false;
    };
  }, [token, isLoggedIn, attempt]);

  let status = "anonymous";
  if (isLoggedIn) status = !check ? "checking" : check.status === "ok" ? "verified" : "error";

  return {
    ...session,
    status,
    isStaff: status === "verified" && STAFF_ROLES.includes(check.role),
    retry: () => setAttempt((n) => n + 1),
  };
}
