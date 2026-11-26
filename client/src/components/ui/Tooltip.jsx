import React, { cloneElement, useId, useRef, useState } from "react";

const POSITIONS = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

/**
 * A short text hint shown on hover and on keyboard focus (WCAG 1.4.13: it
 * stays while hovered and Escape dismisses it). The child must be focusable;
 * the tip is linked with aria-describedby. Don't put essential information
 * only in a tooltip, since touch screens may never show it.
 */
export default function Tooltip({ content, side = "top", children, delay = 300 }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef();

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  const child = React.Children.only(children);
  const trigger = cloneElement(child, {
    "aria-describedby": [child.props["aria-describedby"], open ? id : null].filter(Boolean).join(" ") || undefined,
    onFocus: (e) => {
      child.props.onFocus?.(e);
      setOpen(true);
    },
    onBlur: (e) => {
      child.props.onBlur?.(e);
      hide();
    },
    onKeyDown: (e) => {
      child.props.onKeyDown?.(e);
      if (e.key === "Escape") hide();
    },
  });

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {trigger}
      {open && content && (
        <span role="tooltip" id={id} className={`tooltip ${POSITIONS[side] || POSITIONS.top}`}>
          {content}
        </span>
      )}
    </span>
  );
}
