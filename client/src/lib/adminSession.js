// adminSession.js
// The admin session from the password-only Admin sign-in.
//
// - Kept apart from the customer session: its own token, in sessionStorage
//   (gone when the tab closes, never in localStorage), sent only by admin pages.
// - The password itself is never stored or kept anywhere in the browser.
// - Nothing here grants access: the server checks the admin session on every
//   admin API call, and this hook asks the server whether it's still valid.

import { useEffect, useState } from "react";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const TOKEN_KEY = "cinebook:adminToken";
const EXPIRES_KEY = "cinebook:adminExpiresAt";
export const ADMIN_SESSION_EVENT = "cinebook:admin-session";

const EXPIRED_KEY = "cinebook:adminExpiredNotice";

/** Remembers that the session ran out, for a notice on the sign-in page. */
export function markExpired() {
  sessionStorage.setItem(EXPIRED_KEY, "1");
}

/** Reads and clears that notice. */
export function takeExpiredNotice() {
  const flag = read(EXPIRED_KEY);
  if (flag) sessionStorage.removeItem(EXPIRED_KEY);
  return !!flag;
}

const announce = () => window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));

const read = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

export const getAdminSession = () => {
  const token = read(TOKEN_KEY);
  const expiresAt = Date.parse(read(EXPIRES_KEY) || "") || 0;
  return { token, expiresAt, active: !!token && expiresAt > Date.now() };
};

export const saveAdminSession = ({ token, expiresAt }) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRES_KEY, expiresAt);
  announce();
};

export const clearAdminSession = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_KEY);
  cache = { token: null, promise: null, ok: false };
  announce();
};

/** Pages that act as admin, and so send the admin token. */
export const isAdminArea = (pathname = window.location.pathname) =>
  pathname === "/scanner" || (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login"));

/** Signs out on the server (revokes the session), then forgets it here. */
export const signOutAdmin = async () => {
  const { token } = getAdminSession();
  clearAdminSession();
  if (!token) return;
  try {
    const res = await fetch(`${BASE}/api/auth/admin/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    await res.text().catch(() => "");
  } catch (e) {
    // Offline: the session still expires on the server by itself.
  }
};

// One server check per token per page load.
let cache = { token: null, promise: null, ok: false };

const verify = (token) => {
  if (cache.token === token && (cache.ok || cache.promise)) return cache.promise || Promise.resolve("verified");
  cache = { token, promise: null, ok: false };
  cache.promise = fetch(`${BASE}/api/auth/admin/session`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
    .then(async (res) => {
      // Read the body so the connection is released (an unread body stays open).
      await res.text().catch(() => "");
      return res.status === 401 ? "expired" : res.ok ? "verified" : "error";
    })
    .catch(() => "error")
    .then((result) => {
      if (cache.token !== token) return result;
      cache.promise = null;
      cache.ok = result === "verified";
      if (result === "expired") {
        markExpired();
        clearAdminSession();
      }
      return result;
    });
  return cache.promise;
};

/**
 * - status: "none" | "checking" | "verified" | "error"
 * - active: there is an unexpired admin session in this tab (not yet checked)
 * The session is dropped by itself when it expires.
 */
export default function useAdminSession({ verifyWithServer = false } = {}) {
  const [session, setSession] = useState(getAdminSession);
  const [check, setCheck] = useState(() => (cache.ok && cache.token === session.token ? "verified" : null));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const onChange = () => setSession(getAdminSession());
    window.addEventListener(ADMIN_SESSION_EVENT, onChange);
    return () => window.removeEventListener(ADMIN_SESSION_EVENT, onChange);
  }, []);

  // Forget the session the moment it runs out.
  const { token, expiresAt, active } = session;
  useEffect(() => {
    if (!token) return undefined;
    const left = expiresAt - Date.now();
    if (left <= 0) {
      markExpired();
      clearAdminSession();
      return undefined;
    }
    // setTimeout can't wait longer than ~24 days; sessions are hours at most.
    const timer = window.setTimeout(() => {
      markExpired();
      clearAdminSession();
    }, Math.min(left, 2 ** 31 - 1));
    return () => window.clearTimeout(timer);
  }, [token, expiresAt]);

  useEffect(() => {
    if (!verifyWithServer || !active) {
      setCheck(null);
      return undefined;
    }
    let alive = true;
    if (!(cache.ok && cache.token === token)) setCheck(null);
    verify(token).then((result) => alive && setCheck(result));
    return () => {
      alive = false;
    };
  }, [verifyWithServer, token, active, attempt]);

  let status = "none";
  if (active) status = !verifyWithServer ? "verified" : !check ? "checking" : check === "verified" ? "verified" : check === "expired" ? "none" : "error";

  return { active, status, expiresAt, retry: () => setAttempt((n) => n + 1) };
}


/** For tests. */
export const resetAdminSessionCache = () => {
  cache = { token: null, promise: null, ok: false };
};
