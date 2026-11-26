import React, { forwardRef, useId, useState } from "react";
import Icon from "./Icon";

// Form controls. Each one wires its label, hint and error to the input with
// htmlFor / aria-describedby / aria-invalid, so screen readers announce them.

const describedBy = (id, error, hint) =>
  [error ? `${id}-error` : null, !error && hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;

function Message({ id, error, hint }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="field-error">
        {error}
      </p>
    );
  }
  return hint ? (
    <p id={`${id}-hint`} className="help-text">
      {hint}
    </p>
  ) : null;
}

function Label({ id, label, required }) {
  if (!label) return null;
  return (
    <label htmlFor={id} className="label">
      {label}
      {required && (
        <span className="ml-0.5 text-danger-400" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

/** Text input with an optional leading icon. */
export const TextField = forwardRef(function TextField(
  { id: idProp, label, icon, error, hint, required, className = "", wrapperClassName = "", ...props },
  ref
) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <div className={wrapperClassName}>
      <Label id={id} label={label} required={required} />
      <div className="relative">
        {icon && (
          <Icon
            name={icon}
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
          />
        )}
        <input
          id={id}
          ref={ref}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`input ${icon ? "pl-10" : ""} ${error ? "input-error" : ""} ${className}`}
          {...props}
        />
      </div>
      <Message id={id} error={error} hint={hint} />
    </div>
  );
});

/** Password input with a show/hide toggle. */
export const PasswordField = forwardRef(function PasswordField(
  { id: idProp, label, error, hint, required, wrapperClassName = "", ...props },
  ref
) {
  const auto = useId();
  const id = idProp || auto;
  const [visible, setVisible] = useState(false);
  return (
    <div className={wrapperClassName}>
      <Label id={id} label={label} required={required} />
      <div className="relative">
        <Icon name="lock" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <input
          id={id}
          ref={ref}
          type={visible ? "text" : "password"}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`input pl-10 pr-12 ${error ? "input-error" : ""}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-fg-muted transition duration-fast hover:bg-fill hover:text-fg"
        >
          <Icon name={visible ? "eyeOff" : "eye"} className="h-4 w-4" />
        </button>
      </div>
      <Message id={id} error={error} hint={hint} />
    </div>
  );
});

/**
 * Search box with a leading icon and a clear button once there is text.
 * `label` is required for screen readers; it is visually hidden unless
 * `showLabel` is set.
 */
export const SearchInput = forwardRef(function SearchInput(
  { id: idProp, label, showLabel = false, value, onChange, onClear, className = "", wrapperClassName = "", ...props },
  ref
) {
  const auto = useId();
  const id = idProp || auto;
  const clear = () => {
    if (onClear) onClear();
    else onChange?.({ target: { value: "" } });
  };
  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className={showLabel ? "label" : "sr-only"}>
        {label}
      </label>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <input
          id={id}
          ref={ref}
          type="search"
          value={value}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.stopPropagation();
              clear();
            }
          }}
          className={`input pl-10 ${value ? "pr-11" : ""} [&::-webkit-search-cancel-button]:appearance-none ${className}`}
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-fg-muted transition duration-fast hover:bg-fill hover:text-fg"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
});

/** Native select with the shared look (keyboard and mobile pickers for free). */
export const Select = forwardRef(function Select(
  { id: idProp, label, error, hint, required, className = "", wrapperClassName = "", children, ...props },
  ref
) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <div className={wrapperClassName}>
      <Label id={id} label={label} required={required} />
      <select
        id={id}
        ref={ref}
        required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`select ${error ? "input-error" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
      <Message id={id} error={error} hint={hint} />
    </div>
  );
});

/** Multi-line text input. */
export const TextArea = forwardRef(function TextArea(
  { id: idProp, label, error, hint, required, className = "", wrapperClassName = "", rows = 4, ...props },
  ref
) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <div className={wrapperClassName}>
      <Label id={id} label={label} required={required} />
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`input resize-y ${error ? "input-error" : ""} ${className}`}
        {...props}
      />
      <Message id={id} error={error} hint={hint} />
    </div>
  );
});

/** Checkbox or radio with its label (a 44px-tall touch target). */
export const Choice = forwardRef(function Choice(
  { id: idProp, type = "checkbox", label, description, className = "", ...props },
  ref
) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <label
      htmlFor={id}
      className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg py-2.5 text-sm text-fg-body ${className}`}
    >
      <input
        id={id}
        ref={ref}
        type={type}
        className={`${type === "radio" ? "radio" : "checkbox"} mt-0.5`}
        aria-describedby={description ? `${id}-desc` : undefined}
        {...props}
      />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {description && (
          <span id={`${id}-desc`} className="mt-0.5 block text-xs text-fg-subtle">
            {description}
          </span>
        )}
      </span>
    </label>
  );
});

/**
 * On/off switch (role="switch"). Use for settings that take effect at once;
 * use a checkbox inside forms that are submitted.
 */
export function Switch({ checked, onChange, label, description, id: idProp, disabled, className = "" }) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <span className="min-w-0">
        <span id={`${id}-label`} className="block text-sm font-medium text-fg-body">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="mt-0.5 block text-xs text-fg-subtle">
            {description}
          </span>
        )}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={!!checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className="switch"
      >
        <span className="switch-thumb" aria-hidden="true" />
      </button>
    </div>
  );
}
