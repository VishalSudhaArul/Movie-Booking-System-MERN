import React, { useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import API from "../api";
import { FormAlert, PasswordField, SubmitButton } from "../components/AuthLayout";
import { Logo } from "../components/Navbar";
import { useToast } from "../components/ui/Toast";
import { safeRedirectPath } from "../lib/session";
import useAdminSession, { isAdminArea, saveAdminSession, takeExpiredNotice } from "../lib/adminSession";

const DASHBOARD = "/admin/dashboard";

// After signing in, only go on to an admin page (never back to this one).
const adminRedirect = (path) => {
  const safe = safeRedirectPath(path);
  return isAdminArea(safe.split(/[?#]/)[0]) ? safe : DASHBOARD;
};

const messageFor = (err) => {
  const code = err.response?.status;
  if (code === 401) return "Incorrect admin password";
  if (code === 400) return "Enter the admin password.";
  if (code === 429 || code === 503) return err.response?.data?.message || "Admin sign-in isn't available right now.";
  if (!err.response) return "We couldn't reach the server. Check your connection and try again.";
  return "We couldn't sign you in. Please try again.";
};

/**
 * Admin access, reached from the Admin entry in the navbar. Password only:
 * no email, username or customer account. The password is checked on the
 * server (POST /api/auth/admin/login), which returns a short-lived admin
 * session; the password itself is never kept in the browser.
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const redirectTo = adminRedirect(location.state?.from || new URLSearchParams(location.search).get("next"));
  const { active } = useAdminSession();

  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [expired] = useState(takeExpiredNotice);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  if (active && !loading) return <Navigate to={redirectTo} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setFieldError("Enter the admin password.");
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.post("/api/auth/admin/login", { password });
      setPassword("");
      saveAdminSession(data);
      toast.success("Signed in to admin");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(messageFor(err));
      setPassword("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="relative flex min-h-screen-nav items-center justify-center px-4 py-10 sm:py-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 max-w-xl rounded-full bg-brand-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="card relative w-full max-w-sm p-6 sm:p-8" data-testid="admin-access">
        <Link to="/" aria-label="CineBook home" className="mx-auto mb-7 flex w-fit">
          <Logo />
        </Link>
        <h1 className="sr-only">Admin access</h1>

        {expired && !error && (
          <p role="status" className="mb-5 rounded-xl border border-line-strong bg-fill px-4 py-3 text-sm text-gray-300" data-testid="admin-expired-notice">
            Your admin session has ended. Sign in again to continue.
          </p>
        )}
        <FormAlert message={error} onDismiss={() => setError("")} />

        <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-label="Admin access">
          <PasswordField
            id="admin-password"
            name="password"
            label="Admin password"
            autoComplete="current-password"
            autoFocus
            ref={inputRef}
            value={password}
            maxLength={256}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldError) setFieldError("");
            }}
            error={fieldError}
          />
          <SubmitButton loading={loading} loadingLabel="Checking…">
            Sign in
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
