import React, { useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import Icon from "./ui/Icon";
import { getSession } from "../lib/session";

/**
 * AdminGate — wraps admin-only pages.
 * Only signed-in admins and theatre owners get through. This only controls
 * what the browser shows: every admin API call is also checked on the server.
 */
function AdminGate({ children }) {
  const location = useLocation();
  const { isLoggedIn, isAdmin } = getSession();

  // Clear the flag left behind by the old password gate.
  useEffect(() => {
    sessionStorage.removeItem("admin_bypass");
  }, []);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (isAdmin) return children;

  return (
    <main id="main" className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-ink-950 p-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-400">
          <Icon name="lock" className="h-7 w-7" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Staff only</h1>
        <p className="mt-1.5 text-sm text-gray-400">
          This area is for cinema staff. Your account doesn't have admin access.
        </p>
        <Link to="/" className="btn-primary mt-6 w-full">Back to site</Link>
      </div>
    </main>
  );
}

export default AdminGate;
