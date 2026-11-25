import React, { useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import Icon from "./ui/Icon";
import { ErrorState, PageLoader } from "./ui/Feedback";
import useVerifiedSession from "../lib/useVerifiedSession";

/**
 * AdminGate — wraps admin-only pages.
 * Only signed-in admins and theatre owners get through, and only after the
 * server has confirmed the role from the database (GET /api/users/me), so
 * editing localStorage doesn't open these pages. Every admin API call is also
 * checked on the server.
 */
function AdminGate({ children }) {
  const location = useLocation();
  const { isLoggedIn, status, isStaff, retry } = useVerifiedSession();

  // Clear the flag left behind by the old password gate.
  useEffect(() => {
    sessionStorage.removeItem("admin_bypass");
  }, []);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (status === "checking") return <PageLoader label="Checking your access…" />;

  if (status === "error") {
    return (
      <main id="main" className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <div className="w-full max-w-md">
          <ErrorState
            title="We couldn't check your access"
            message="The server didn't respond. Check your connection and try again."
            onRetry={retry}
          />
        </div>
      </main>
    );
  }

  if (isStaff) return children;

  return (
    <main id="main" className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-300">
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
