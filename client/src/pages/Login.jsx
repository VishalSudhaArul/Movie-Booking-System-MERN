import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import API from "../api";
import AuthLayout, {
  FormAlert,
  GoogleSignIn,
  PasswordField,
  SubmitButton,
  TextField,
  isValidEmail,
} from "../components/AuthLayout";
import { useToast } from "../components/ui/Toast";
import { getSession, saveSession } from "../lib/session";
import { getErrorMessage } from "../lib/format";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  // Return to the page that asked for sign-in (e.g. seat selection).
  const redirectTo = location.state?.from || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (getSession().isLoggedIn && !loading && !googleLoading) {
    return <Navigate to={redirectTo} replace />;
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

  const finishSignIn = (data) => {
    saveSession(data);
    toast.success(`Welcome back${data.name ? `, ${data.name.split(" ")[0]}` : ""}!`);
    navigate(redirectTo, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await API.post("/api/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });
      finishSignIn(data);
    } catch (err) {
      const status = err.response?.status;
      setError(
        status === 404 || status === 400
          ? "That email and password don't match. Please try again."
          : getErrorMessage(err, "We couldn't sign you in. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (name, email) => {
    setError("");
    setGoogleLoading(true);
    try {
      const { data } = await API.post("/api/auth/google", { name, email });
      finishSignIn(data);
    } catch (err) {
      setError(getErrorMessage(err, "Google sign-in failed. Please try again."));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to book tickets and manage your bookings."
      footer={
        <>
          New to CineBook?{" "}
          <Link to="/register" state={location.state} className="font-semibold text-brand-400 hover:text-brand-300">
            Create an account
          </Link>
        </>
      }
    >
      <FormAlert message={error} onDismiss={() => setError("")} />

      <GoogleSignIn onSelect={handleGoogleAuth} loading={googleLoading} dividerLabel="or sign in with email" />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          id="email"
          name="email"
          label="Email address"
          icon="mail"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />
        <PasswordField
          id="password"
          name="password"
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />
        <div className="pt-2">
          <SubmitButton loading={loading} loadingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </div>
      </form>
    </AuthLayout>
  );
}
