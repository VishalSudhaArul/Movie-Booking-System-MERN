// useSeatHold.js
// Keeps the server-side seat hold in step with the user's selection.
//
// - Changes are debounced, then sent through ONE serialized channel: a request
//   only starts after the previous one finished, and when it finishes the
//   channel re-checks the latest selection and sends again if needed. So the
//   server always ends up holding the user's most recent selection, never an
//   older one that arrived late.
// - Responses for an outdated selection never update what's shown.
// - A 409 (someone else holds or booked a seat) removes only the taken seats
//   that are still selected, via onConflict. The server stays the authority.
// - An empty selection releases the hold (DELETE only touches this user's holds).

import { useCallback, useEffect, useRef, useState } from "react";
import API from "../api";

const keyOf = (seats) => [...seats].sort().join(",");

export const HOLD_IDLE = { status: "idle", seats: [], expiresAt: null, error: null };

/** Releases this user's holds for a show, even while the page is unloading. */
export function releaseHoldNow(showId) {
  const token = localStorage.getItem("token");
  if (!showId || !token) return;
  try {
    fetch(`${API.defaults.baseURL}/api/shows/${showId}/holds`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    }).catch(() => {});
  } catch (e) {
    // Best effort: the hold also expires on its own after a few minutes.
  }
}

/** True while the user is still on this show's seat or checkout page. */
export const inBookingFlow = (showId, pathname = window.location.pathname) =>
  pathname.startsWith(`/seats/${showId}`) || pathname.startsWith(`/addons/${showId}`);

export default function useSeatHold({ showId, selected, enabled = true, onConflict, debounceMs = 400 }) {
  const [hold, setHold] = useState(HOLD_IDLE);
  const holdRef = useRef(HOLD_IDLE);
  const desiredRef = useRef(selected);
  const serverKeyRef = useRef(null); // what the server holds for us, as far as we know (null = unknown)
  const versionRef = useRef(0); // bumps on every selection change
  const runningRef = useRef(null);
  const timerRef = useRef(null);
  const onConflictRef = useRef(onConflict);
  onConflictRef.current = onConflict;
  const aliveRef = useRef(true);

  const show = useCallback((next) => {
    holdRef.current = next;
    if (aliveRef.current) setHold(next);
  }, []);

  const sync = useCallback(() => {
    if (runningRef.current) return runningRef.current;
    const run = async () => {
      // Loop until the server matches the latest selection, or we must stop.
      for (let guard = 0; guard < 10; guard++) {
        const want = desiredRef.current;
        const wantKey = keyOf(want);
        if (serverKeyRef.current === wantKey) return;
        const version = versionRef.current;
        if (holdRef.current.status !== "saving") show({ ...holdRef.current, status: "saving" });
        try {
          if (want.length === 0) {
            await API.delete(`/api/shows/${showId}/holds`);
            serverKeyRef.current = "";
            if (version === versionRef.current) show(HOLD_IDLE);
          } else {
            const { data } = await API.post(`/api/shows/${showId}/holds`, { seats: want });
            serverKeyRef.current = keyOf(data.seats);
            if (version === versionRef.current) {
              show({ status: "held", seats: data.seats, expiresAt: data.expiresAt, error: null });
            }
          }
        } catch (err) {
          // The failed request changed nothing on the server (holds are atomic),
          // but we no longer know exactly what it holds for us.
          serverKeyRef.current = null;
          if (err.response?.status === 409) {
            const taken = (err.response.data?.seats || []).filter((n) => desiredRef.current.includes(n));
            show({ ...holdRef.current, status: "conflict", error: "Some seats were just taken" });
            if (taken.length && onConflictRef.current) onConflictRef.current(taken);
          } else {
            show({ ...holdRef.current, status: "error", error: "We couldn't hold your seats. Check your connection." });
          }
          return; // a conflict changes the selection, which schedules the next sync
        }
      }
    };
    runningRef.current = run().finally(() => {
      runningRef.current = null;
    });
    return runningRef.current;
  }, [showId, show]);

  // Selection changed: remember it and sync after a short pause.
  useEffect(() => {
    desiredRef.current = selected;
    versionRef.current += 1;
    if (!enabled) return undefined;
    // Never show a countdown for an older selection while the new one is pending.
    if (keyOf(selected) !== serverKeyRef.current && selected.length) {
      show({ ...holdRef.current, status: "saving" });
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(sync, debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [selected, enabled, sync, debounceMs]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, []);

  /** Sends any pending change now and resolves with the confirmed hold. */
  const flush = useCallback(async () => {
    clearTimeout(timerRef.current);
    await sync();
    if (serverKeyRef.current !== keyOf(desiredRef.current)) await sync();
    return holdRef.current;
  }, [sync]);

  /** Holds the same seats again (after the hold expired). */
  const renew = useCallback(() => {
    serverKeyRef.current = null;
    return sync();
  }, [sync]);

  return { hold, flush, renew };
}
