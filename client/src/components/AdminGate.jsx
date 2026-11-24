import React, { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./ui/Icon";

/**
 * AdminGate — wraps admin-only pages.
 * Signed-in admins and theatre owners pass straight through; anyone else
 * is asked for the admin password.
 */
function AdminGate({ children }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // Remember the unlocked state for this browser session only
  const [passBypass, setPassBypass] = useState(sessionStorage.getItem("admin_bypass") === "true");
  const [inputPass, setInputPass] = useState("");
  const [error, setError] = useState("");

  const handleVerify = (e) => {
    e.preventDefault();
    if (inputPass === "123456") {
      sessionStorage.setItem("admin_bypass", "true");
      setPassBypass(true);
    } else {
      setError("That password isn't correct.");
    }
  };

  if (token && (role === "admin" || role === "theaterOwner")) {
    return children;
  }

  if (passBypass) {
    return children;
  }

  return (
    <main id="main" className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-ink-950 p-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-400">
          <Icon name="lock" className="h-7 w-7" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Admin access</h1>
        <p className="mt-1.5 text-sm text-gray-400">Enter the admin password to continue.</p>

        <form onSubmit={handleVerify} className="mt-6 space-y-3 text-left" noValidate>
          <label htmlFor="admin-password" className="sr-only">Admin password</label>
          <input
            id="admin-password"
            type="password"
            placeholder="Password"
            value={inputPass}
            onChange={(e) => {
              setInputPass(e.target.value);
              setError("");
            }}
            aria-invalid={!!error}
            className={`input ${error ? "input-error" : ""}`}
            autoFocus
          />
          {error && <p className="field-error" role="alert">{error}</p>}
          <button type="submit" className="btn-primary w-full">Unlock</button>
        </form>

        <Link to="/" className="btn-ghost mt-3 w-full text-xs">Back to site</Link>
      </div>
    </main>
  );
}

export default AdminGate;
