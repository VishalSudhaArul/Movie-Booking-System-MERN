import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ErrorState, PageLoader } from "./ui/Feedback";
import useAdminSession from "../lib/adminSession";

/**
 * AdminGate — wraps admin-only pages.
 * Only an admin session from the Admin sign-in gets through, and only after
 * the server has confirmed it is still valid. A customer account never opens
 * these pages. Every admin API call is also checked on the server.
 */
function AdminGate({ children }) {
  const location = useLocation();
  const { status, retry } = useAdminSession({ verifyWithServer: true });

  // Clear the flag left behind by the old password gate.
  useEffect(() => {
    sessionStorage.removeItem("admin_bypass");
  }, []);

  if (status === "none") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (status === "checking") return <PageLoader label="Checking your access…" />;

  if (status === "error") {
    return (
      <main id="main" className="container-page flex min-h-screen-nav items-center justify-center py-16">
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

  return children;
}

export default AdminGate;
