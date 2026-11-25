// ScreenTrailer.jsx
// State and controls for the trailer on the 3D auditorium's screen.
// The picture itself is drawn by MovieScreen inside the scene; the controls
// live outside it, in the 3D view's own overlay, so nothing covers the screen.

import React, { useCallback, useMemo, useState } from "react";
import Icon from "../ui/Icon";
import { trailerSource } from "../../lib/trailerSource";

const fresh = (source, autoplay) => ({
  key: source ? source.key : "",
  // `active` mounts the player; it stays mounted once started so pausing is instant.
  active: !!source && autoplay,
  playing: !!source && autoplay,
  muted: true,
  status: !source ? "none" : autoplay ? "loading" : "ready",
});

/**
 * Trailer state for one movie.
 * Autoplays (muted) unless the visitor prefers reduced motion or the device is
 * low-powered; then the poster stays until they press Play.
 */
export function useScreenTrailer(trailerUrl, { reducedMotion = false, lowPower = false } = {}) {
  const source = useMemo(() => trailerSource(trailerUrl), [trailerUrl]);
  const autoplay = !reducedMotion && !lowPower;
  const [state, setState] = useState(() => fresh(source, autoplay));

  // A different movie (or trailer): start over, during render, so the old
  // trailer's state never shows for the new one.
  const key = source ? source.key : "";
  if (state.key !== key) setState(fresh(source, autoplay));

  const onStatus = useCallback(
    (status) =>
      setState((s) => {
        if (s.status === "failed") return s;
        if (status === "failed") return { ...s, status, active: false, playing: false };
        if (status === "playing") return { ...s, status, playing: true };
        // Paused by the player (e.g. autoplay refused): show the Play button.
        if (status === "paused") return { ...s, status, playing: false };
        return { ...s, status };
      }),
    []
  );

  const play = useCallback(
    () => setState((s) => (s.status === "failed" || s.status === "none" ? s : { ...s, active: true, playing: true, status: s.active ? s.status : "loading" })),
    []
  );
  const pause = useCallback(() => setState((s) => ({ ...s, playing: false, status: s.active ? "paused" : s.status })), []);
  const toggleMute = useCallback(() => setState((s) => ({ ...s, muted: !s.muted })), []);

  const screen = useMemo(
    () => ({ source, active: state.active, playing: state.playing, muted: state.muted, onStatus }),
    [source, state.active, state.playing, state.muted, onStatus]
  );

  return { ...state, source, screen, play, pause, toggleMute };
}

const STATUS_TEXT = {
  ready: "Trailer ready",
  loading: "Loading trailer…",
  buffering: "Buffering…",
  playing: "Trailer playing",
  paused: "Trailer paused",
  failed: "Trailer unavailable · showing the poster",
};

const btn = "rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-40";

/** Play / pause and sound for the screen trailer. Hidden when there's no trailer. */
export function TrailerControls({ trailer, className = "" }) {
  if (trailer.status === "none") return null;
  const failed = trailer.status === "failed";
  const running = trailer.playing && !failed;

  return (
    <div
      className={`glass flex items-center gap-1 rounded-xl p-1 ${className}`}
      role="group"
      aria-label="Screen trailer"
      data-testid="trailer-controls"
      data-status={trailer.status}
    >
      <span className="flex items-center gap-1.5 px-2 text-xs text-gray-300" aria-live="polite">
        <Icon name="film" className={`h-3.5 w-3.5 ${failed ? "text-gray-500" : "text-brand-300"}`} />
        <span data-testid="trailer-status">{STATUS_TEXT[trailer.status] || ""}</span>
      </span>
      {!failed && (
        <>
          <button
            type="button"
            className={btn}
            onClick={running ? trailer.pause : trailer.play}
            aria-label={running ? "Pause trailer" : "Play trailer"}
          >
            <Icon name={running ? "pause" : "play"} className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={btn}
            onClick={trailer.toggleMute}
            disabled={!trailer.active}
            aria-label={trailer.muted ? "Unmute trailer" : "Mute trailer"}
            aria-pressed={!trailer.muted}
          >
            <Icon name={trailer.muted ? "volumeOff" : "volume"} className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
