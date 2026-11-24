import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Icon from "./Icon";

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: "check", ring: "border-emerald-500/40", tint: "bg-emerald-500/15 text-emerald-300" },
  error: { icon: "alert", ring: "border-brand-500/50", tint: "bg-brand-500/15 text-brand-300" },
  info: { icon: "info", ring: "border-white/15", tint: "bg-white/10 text-gray-200" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, type = "info", duration = 3500) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      show,
      success: (m, d) => show(m, "success", d),
      error: (m, d) => show(m, "error", d || 5000),
      info: (m, d) => show(m, "info", d),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type] || STYLES.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm animate-fadeUp items-start gap-3 rounded-xl border ${s.ring} bg-ink-800 p-3.5 shadow-2xl`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.tint}`}>
                <Icon name={s.icon} className="h-4 w-4" />
              </span>
              <p className="flex-1 pt-0.5 text-sm text-gray-100">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-gray-500 transition hover:text-white"
                aria-label="Dismiss notification"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
