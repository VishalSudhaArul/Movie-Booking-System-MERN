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

const MIN_PASSWORD = 6;

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const redirectTo = location.state?.from || "/";

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
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
    if (form.name.trim().length < 2) next.name = "Enter your full name.";
    if (!form.email.trim()) next.email = "Enter your email address.";
    else if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";
    if (form.password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters.`;
    if (!form.confirm) next.confirm = "Re-enter your password.";
    else if (form.password !== form.confirm) next.confirm = "Passwords don't match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const finishSignUp = (data) => {
    saveSession(data);
    toast.success(`Welcome to CineBook${data.name ? `, ${data.name.split(" ")[0]}` : ""}!`);
    navigate(redirectTo, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await API.post("/api/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      finishSignUp(data);
    } catch (err) {
      setError(
        /exists/i.test(err.response?.data?.message || "")
          ? "An account with this email already exists. Try signing in instead."
          : getErrorMessage(err, "We couldn't create your account. Please try again.")
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
      finishSignUp(data);
    } catch (err) {
      setError(getErrorMessage(err, "Google sign-up failed. Please try again."));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Book tickets faster and keep all your bookings in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" state={location.state} className="font-semibold text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </>
      }
    >
      <FormAlert message={error} onDismiss={() => setError("")} />

      <GoogleSignIn onSelect={handleGoogleAuth} loading={googleLoading} dividerLabel="or sign up with email" />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          id="name"
          name="name"
          label="Full name"
          icon="user"
          autoComplete="name"
          placeholder="Your name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
        />
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
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            id="password"
            name="password"
            label="Password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            hint={`At least ${MIN_PASSWORD} characters`}
          />
          <PasswordField
            id="confirm"
            name="confirm"
            label="Confirm password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={form.confirm}
            onChange={handleChange}
            error={errors.confirm}
          />
        </div>
        <div className="pt-2">
          <SubmitButton loading={loading} loadingLabel="Creating account…">
            Create account
          </SubmitButton>
        </div>
      </form>
    </AuthLayout>
  );
}
