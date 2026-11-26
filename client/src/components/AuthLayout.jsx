import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Navbar";
import Icon from "./ui/Icon";
import Button from "./ui/Button";

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());

const PERKS = [
  { icon: "grid", text: "Choose your exact seats on a live seat map" },
  { icon: "qr", text: "QR tickets on your phone — no printing" },
  { icon: "popcorn", text: "Pre-order snacks and skip the queue" },
];

/** Two-column shell shared by the sign-in and registration screens. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main id="main" className="relative flex min-h-screen-nav items-center justify-center px-4 py-10 page-enter">
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
          <h1 className="page-title font-extrabold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p>}
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
    <div role="alert" className="alert-error mb-5">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-m-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-danger-300 transition duration-fast hover:bg-fill hover:text-fg">
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// The sign-in screens use the shared form controls.
export { TextField, PasswordField } from "./ui/Input";

export function SubmitButton({ loading, loadingLabel, children }) {
  return (
    <Button type="submit" size="lg" fullWidth loading={loading} loadingText={loadingLabel}>
      {children}
    </Button>
  );
}
