import React, { forwardRef } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { Spinner } from "./Feedback";

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  "danger-solid": "btn-danger-solid",
  success: "btn-success",
};
const SIZES = { sm: "btn-sm", md: "", lg: "btn-lg" };

/**
 * The shared button. Renders a <button>, or a router <Link> when `to` is given.
 * `loading` disables it, shows a spinner and (optionally) `loadingText`, and
 * sets aria-busy so screen readers know work is in progress.
 */
const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    loadingText,
    icon,
    iconRight,
    fullWidth = false,
    to,
    type = "button",
    className = "",
    disabled,
    children,
    ...rest
  },
  ref
) {
  const classes = [VARIANTS[variant] || VARIANTS.primary, SIZES[size], fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
  const iconSize = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const content = loading ? (
    <>
      <Spinner className={iconSize} />
      {loadingText || children}
    </>
  ) : (
    <>
      {icon && <Icon name={icon} className={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} className={iconSize} />}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;

/** Square icon-only button. `label` is required: it becomes the accessible name. */
export const IconButton = forwardRef(function IconButton(
  { icon, label, size = "md", className = "", badge, type = "button", ...rest },
  ref
) {
  const box = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "";
  const glyph = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <button ref={ref} type={type} aria-label={label} className={`btn-icon relative ${box} ${className}`} {...rest}>
      <Icon name={icon} className={glyph} />
      {badge != null && badge !== 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-solid px-1 text-3xs font-bold text-on-brand"
          aria-hidden="true"
        >
          {badge}
        </span>
      )}
    </button>
  );
});
