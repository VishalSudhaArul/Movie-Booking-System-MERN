import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import API from "../api";
import { useToast } from "../components/ui/Toast";
import { getErrorMessage } from "../lib/format";

const WatchlistContext = createContext(null);

/** Keeps the signed-in user's watchlist in one place for the whole app. */
export function WatchlistProvider({ children }) {
  const toast = useToast();
  const location = useLocation();
  const [items, setItems] = useState([]);
  // Re-read the token on navigation so login/logout are picked up.
  const token = useMemo(() => localStorage.getItem("token"), [location.key]);

  useEffect(() => {
    if (!token) {
      setItems([]);
      return;
    }
    let cancelled = false;
    API.get("/api/users/watchlist")
      .then((res) => {
        if (!cancelled) setItems(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const ids = useMemo(() => new Set(items.map((m) => m._id || m)), [items]);

  const toggle = useCallback(
    async (movie) => {
      if (!localStorage.getItem("token")) {
        toast.info("Sign in to save movies to your watchlist.");
        return;
      }
      try {
        const res = await API.post("/api/users/watchlist/toggle", { movieId: movie._id });
        setItems((res.data.watchlist || []).filter(Boolean));
        toast.success(
          res.data.isBookmarked
            ? `Added "${movie.title}" to your watchlist`
            : `Removed "${movie.title}" from your watchlist`
        );
      } catch (err) {
        toast.error(getErrorMessage(err, "Couldn't update your watchlist."));
      }
    },
    [toast]
  );

  const value = useMemo(
    () => ({ items, ids, isSaved: (id) => ids.has(id), toggle }),
    [items, ids, toggle]
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used inside <WatchlistProvider>");
  return ctx;
}
