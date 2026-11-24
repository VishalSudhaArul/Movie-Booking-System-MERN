import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Navbar";
import Icon from "./ui/Icon";
import Modal from "./ui/Modal";
import { Spinner } from "./ui/Feedback";

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());

const PERKS = [
  { icon: "grid", text: "Choose your exact seats on a live seat map" },
  { icon: "qr", text: "QR tickets on your phone — no printing" },
  { icon: "popcorn", text: "Pre-order snacks and skip the queue" },
];

/** Two-column shell shared by the sign-in and registration screens. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main id="main" className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center bg-ink-950 px-4 py-10">
      <div className="card grid w-full max-w-4xl overflow-hidden lg:grid-cols-2">
        {/* Visual panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-900 p-10 lg:flex">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&q=70&auto=format')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/80 to-ink-900/40" aria-hidden="true" />

          <Link to="/" className="relative" aria-label="CineBook home">
            <Logo />
          </Link>

          <div className="relative">
            <h2 className="font-display text-3xl font-extrabold leading-tight text-white">
              Your next movie night starts here.
            </h2>
            <ul className="mt-6 space-y-3.5">
              {PERKS.map((perk) => (
                <li key={perk.text} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                    <Icon name={perk.icon} className="h-4 w-4" />
                  </span>
                  {perk.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-6 sm:p-10">
          <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-gray-400">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <p className="mt-7 text-center text-sm text-gray-400">{footer}</p>}
        </div>
      </div>
    </main>
  );
}

export function FormAlert({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-brand-500/40 bg-brand-500/10 p-3.5 text-sm text-brand-300">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-brand-300 hover:text-white">
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function TextField({ id, label, icon, error, className = "", ...props }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        {icon && <Icon name={icon} className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`input ${icon ? "pl-10" : ""} ${error ? "input-error" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

export function PasswordField({ id, label, error, hint, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <Icon name="lock" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`input pl-10 pr-11 ${error ? "input-error" : ""}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:text-white"
        >
          <Icon name={visible ? "eyeOff" : "eye"} className="h-4 w-4" />
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="field-error">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}

export function SubmitButton({ loading, loadingLabel, children }) {
  return (
    <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
      {loading ? <><Spinner className="h-5 w-5" /> {loadingLabel}</> : children}
    </button>
  );
}

function GoogleMark({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

/** "Continue with Google" button plus the account chooser it opens. */
export function GoogleSignIn({ onSelect, loading, dividerLabel }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const valid = isValidEmail(email);

  const choose = async (name, address) => {
    await onSelect(name, address);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen(true)}
        className="btn btn-lg w-full border border-white/15 bg-white text-gray-900 hover:bg-gray-100"
      >
        <GoogleMark />
        {loading ? "Signing in…" : "Continue with Google"}
      </button>

      <div className="my-6 flex items-center gap-4" role="separator">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-gray-500">{dividerLabel}</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Continue with Google" subtitle="Enter the Google email you want to use" size="sm">
        <form
          className="space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) choose(email.trim().split("@")[0], email.trim());
          }}
        >
          <TextField
            id="google-email"
            label="Google email"
            icon="mail"
            type="email"
            autoComplete="email"
            placeholder="you@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary w-full" disabled={!valid || loading}>
            {loading ? <><Spinner className="h-4 w-4" /> Signing in…</> : "Continue"}
          </button>
        </form>
      </Modal>
    </>
  );
}
