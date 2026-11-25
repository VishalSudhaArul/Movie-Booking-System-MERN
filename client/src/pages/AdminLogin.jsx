import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import API from "../api";
import AuthLayout, {
  FormAlert,
  PasswordField,
  SubmitButton,
  TextField,
  isValidEmail,
} from "../components/AuthLayout";
import { PageLoader } from "../components/ui/Feedback";
import { useToast } from "../components/ui/Toast";
import { safeRedirectPath, saveSession } from "../lib/session";
import { getErrorMessage } from "../lib/format";
import useVerifiedSession from "../lib/useVerifiedSession";

const DASHBOARD = "/admin/dashboard";

// After signing in, only go on to a staff page (never back to this one).
const staffRedirect = (path) => {
  const safe = safeRedirectPath(path);
  const isStaffPage = (safe.startsWith("/admin/") || safe === "/scanner") && !safe.startsWith("/admin/login");
  return isStaffPage ? safe : DASHBOARD;
};

/**
 * Admin sign-in, reached from the Admin entry in the navbar.
 * The server checks the password and reads the role from the database
 * (POST /api/auth/admin/login); a customer account is refused and no session
 * is saved. Nothing here decides access on its own: AdminGate checks the role
 * with the server again, and every admin API is protected on the server.
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const redirectTo = staffRedirect(location.state?.from || new URLSearchParams(location.search).get("next"));
  const { isLoggedIn, status, isStaff, userName } = useVerifiedSession();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!loading) {
    if (isStaff) return <Navigate to={redirectTo} replace />;
    if (status === "checking") return <PageLoader label="Checking your access…" />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = "Enter your email address.";
    else if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";
    if (!form.password) next.password = "Enter your password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await API.post("/api/auth/admin/login", {
        email: form.email.trim(),
        password: form.password,
      });
      saveSession(data);
      toast.success(`Signed in to admin${data.name ? ` as ${data.name.split(" ")[0]}` : ""}`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const code = err.response?.status;
      setError(
        code === 403
          ? "This account doesn't have admin access. Sign in with an administrator account."
          : code === 400
          ? "That email and password don't match. Please try again."
          : getErrorMessage(err, "We couldn't sign you in. Please try again.")
      );
      setForm((f) => ({ ...f, password: "" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Admin sign in"
      subtitle="For cinema staff. Sign in with your administrator account."
      footer={
        <>
          Not staff?{" "}
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Customer sign in
          </Link>
        </>
      }
    >
      {isLoggedIn && status === "verified" && !isStaff && (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300" data-testid="admin-login-notice">
          You're signed in{userName ? ` as ${userName}` : ""}, but that account doesn't have admin access.
          Sign in with an administrator account to continue.
        </p>
      )}

      <FormAlert message={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-label="Admin sign in">
        <TextField
          id="admin-email"
          name="email"
          label="Email address"
          icon="mail"
          type="email"
          autoComplete="username"
          placeholder="admin@example.com"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />
        <PasswordField
          id="admin-password"
          name="password"
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />
        <div className="pt-2">
          <SubmitButton loading={loading} loadingLabel="Checking…">
            Sign in to admin
          </SubmitButton>
        </div>
      </form>
    </AuthLayout>
  );
}
