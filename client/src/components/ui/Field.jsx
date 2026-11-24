import React from "react";

/** A visible label, the control, and optional help or error text. */
export default function Field({ id, label, hint, error, required, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="ml-0.5 text-danger-400" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p className="field-error" role="alert">{error}</p>
      ) : (
        hint && <p className="help-text">{hint}</p>
      )}
    </div>
  );
}
