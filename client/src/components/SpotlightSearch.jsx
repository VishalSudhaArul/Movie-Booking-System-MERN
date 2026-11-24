import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./ui/Icon";
import Poster from "./Poster";
import useCatalog from "../hooks/useCatalog";
import { formatDuration, splitGenres } from "../lib/format";

const SHORTCUTS = [
  { label: "All movies", path: "/movies", icon: "film" },
  { label: "Food & beverages", path: "/snacks", icon: "popcorn" },
  { label: "My bookings", path: "/my-bookings", icon: "ticket" },
  { label: "Gift cards", path: "/gift-cards", icon: "gift" },
];

function SearchPanel({ onClose }) {
  const navigate = useNavigate();
  const { movies, loading } = useCatalog();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? movies.filter(
          (m) =>
            m.title?.toLowerCase().includes(q) ||
            m.genre?.toLowerCase().includes(q) ||
            m.language?.toLowerCase().includes(q)
        )
      : movies;
    return list.slice(0, 6);
  }, [movies, query]);

  useEffect(() => setActive(0), [query]);

  const go = (path) => {
    onClose();
    navigate(path);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      go(`/movies/${results[active]._id}`);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/75 p-4 pt-[10vh] backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-2xl animate-modalScaleIn"
      >
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
          <Icon name="search" className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search movies or genres…"
            aria-label="Search movies or genres"
            className="w-full bg-transparent py-4 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          <kbd className="hidden rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 sm:block">
            ESC
          </kbd>
          <button onClick={onClose} className="text-gray-400 hover:text-white sm:hidden" aria-label="Close search">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          <p className="px-3 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            {query.trim() ? "Movies" : "Suggested"}
          </p>

          {loading && movies.length === 0 ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-14 w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              No movies match “{query.trim()}”.
            </p>
          ) : (
            <ul>
              {results.map((m, i) => (
                <li key={m._id}>
                  <button
                    onClick={() => go(`/movies/${m._id}`)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                      i === active ? "bg-white/[0.07]" : ""
                    }`}
                  >
                    <Poster src={m.poster} alt="" className="h-12 w-9 shrink-0 rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{m.title}</span>
                      <span className="block truncate text-xs text-gray-400">
                        {[splitGenres(m.genre).slice(0, 2).join(" · "), formatDuration(m.duration)]
                          .filter(Boolean)
                          .join("  •  ")}
                      </span>
                    </span>
                    <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-gray-500" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!query.trim() && (
            <>
              <p className="px-3 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Quick links
              </p>
              <div className="grid grid-cols-2 gap-1 pb-1">
                {SHORTCUTS.map((s) => (
                  <button
                    key={s.path}
                    onClick={() => go(s.path)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-gray-300 transition hover:bg-white/[0.07] hover:text-white"
                  >
                    <Icon name={s.icon} className="h-4 w-4 text-gray-400" />
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SpotlightSearch({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <SearchPanel onClose={onClose} />;
}
