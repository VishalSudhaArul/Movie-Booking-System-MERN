import React, { useState } from "react";
import Icon from "./ui/Icon";

/** Movie poster with lazy loading, a fade-in and a graceful fallback when the image fails. */
export default function Poster({ src, alt = "", className = "", eager = false }) {
  const [status, setStatus] = useState(src ? "loading" : "error");
  const [shownSrc, setShownSrc] = useState(src);

  // The image address often arrives after the first render (data still loading)
  // or changes (a different movie). Start over only when it really changes, during
  // render, so a cached image's onLoad can never be overwritten afterwards.
  if (src !== shownSrc) {
    setShownSrc(src);
    setStatus(src ? "loading" : "error");
  }

  return (
    <div className={`relative overflow-hidden bg-ink-800 ${className}`}>
      {status !== "error" && (
        <img
          key={src}
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {status === "loading" && <div className="skeleton absolute inset-0 rounded-none" />}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink-700 to-ink-900 p-3 text-center text-gray-500">
          <Icon name="film" className="h-8 w-8" />
          {alt && <span className="line-clamp-2 text-xs font-medium">{alt}</span>}
        </div>
      )}
    </div>
  );
}
