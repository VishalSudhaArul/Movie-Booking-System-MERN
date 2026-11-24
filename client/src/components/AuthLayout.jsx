import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Navbar";
import Icon from "./ui/Icon";
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
