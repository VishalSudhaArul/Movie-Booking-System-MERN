import React, { useEffect, useState } from "react";
import Icon from "./ui/Icon";
import { Spinner } from "./ui/Feedback";

/** Re-renders every `interval` ms so countdowns stay current. */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

const mmss = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * Shows the state of the server-side seat hold: saving, held with a countdown,
 * expired (with a button to hold again), or an error.
 */
export default function HoldCountdown({ hold, selectedCount, onRenew, className = "" }) {
  const now = useNow(1000);
  if (!selectedCount) return null;

  if (hold.status === "saving" || (hold.status === "idle" && selectedCount)) {
    return (
      <p className={`flex items-center gap-2 text-xs text-gray-400 ${className}`} role="status">
        <Spinner className="h-3.5 w-3.5" /> Holding your seats…
      </p>
    );
  }
  if (hold.status === "error") {
    return (
      <p className={`flex items-center gap-2 text-xs text-danger-300 ${className}`} role="alert">
        <Icon name="alert" className="h-4 w-4" /> {hold.error}
        <button onClick={onRenew} className="ml-auto font-semibold underline">Retry</button>
      </p>
    );
  }
  if (hold.status === "conflict") {
    return (
      <p className={`flex items-center gap-2 text-xs text-gold-400 ${className}`} role="status">
        <Icon name="alert" className="h-4 w-4" /> Updating your hold…
      </p>
    );
  }
  if (hold.status !== "held" || !hold.expiresAt) return null;

  const left = new Date(hold.expiresAt).getTime() - now;
  if (left <= 0) {
    return (
      <div className={`flex items-center gap-2 text-xs text-gold-400 ${className}`} role="alert">
        <Icon name="clock" className="h-4 w-4" /> Your hold expired.
        <button onClick={onRenew} className="ml-auto font-semibold text-brand-300 underline hover:text-brand-200">
          Hold again
        </button>
      </div>
    );
  }
  return (
    <p className={`flex items-center gap-2 text-xs ${left <= 60000 ? "text-gold-400" : "text-gray-300"} ${className}`}>
      <Icon name="clock" className="h-4 w-4" />
      Held for you for <span className="font-mono font-semibold text-white" data-testid="seat-hold-timer">{mmss(left)}</span>
    </p>
  );
}
