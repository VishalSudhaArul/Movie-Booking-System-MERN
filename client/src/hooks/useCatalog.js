import { useCallback, useEffect, useState } from "react";
import API from "../api";
import { isUpcomingShow } from "../lib/format";

// Module-level cache so moving between pages doesn't refetch the catalogue.
let cache = null;
let inflight = null;
const CACHE_MS = 60 * 1000;

const movieIdOf = (show) =>
  show?.movieId && typeof show.movieId === "object" ? show.movieId._id : show?.movieId;

const loadCatalog = async () => {
  const [moviesRes, showsRes, ratingsRes] = await Promise.all([
    API.get("/api/movies"),
    // Shows and ratings only enrich the cards; the catalogue still works without them.
    API.get("/api/shows", { params: { lite: 1 } }).catch(() => ({ data: [] })),
    API.get("/api/reviews/summary").catch(() => ({ data: {} })),
  ]);

  const shows = Array.isArray(showsRes.data) ? showsRes.data : [];
  const ratings =
    ratingsRes.data && typeof ratingsRes.data === "object" && !Array.isArray(ratingsRes.data)
      ? ratingsRes.data
      : {};

  const showStats = {};
  shows.forEach((show) => {
    const id = movieIdOf(show);
    if (!id) return;
    if (!showStats[id]) showStats[id] = { total: 0, upcoming: 0 };
    showStats[id].total += 1;
    if (isUpcomingShow(show)) showStats[id].upcoming += 1;
  });

  const movies = (Array.isArray(moviesRes.data) ? moviesRes.data : []).map((movie) => {
    const stats = showStats[movie._id] || { total: 0, upcoming: 0 };
    const rating = ratings[movie._id];
    return {
      ...movie,
      showCount: stats.total,
      upcomingShowCount: stats.upcoming,
      // A movie with scheduled shows is "now showing"; one without is "coming soon".
      status: stats.total > 0 ? "now" : "soon",
      avgRating: rating?.totalRatings > 0 ? rating.avgRating : null,
      totalRatings: rating?.totalRatings || 0,
    };
  });

  return { movies, fetchedAt: Date.now() };
};

/** Movies enriched with show availability and real review ratings. */
export default function useCatalog() {
  const [state, setState] = useState({
    movies: cache?.movies || [],
    loading: !cache,
    error: null,
  });

  const load = useCallback((force = false) => {
    if (!force && cache && Date.now() - cache.fetchedAt < CACHE_MS) {
      setState({ movies: cache.movies, loading: false, error: null });
      return;
    }
    if (!cache) setState((s) => ({ ...s, loading: true, error: null }));
    if (!inflight) {
      inflight = loadCatalog().finally(() => {
        inflight = null;
      });
    }
    inflight
      .then((result) => {
        cache = result;
        setState({ movies: result.movies, loading: false, error: null });
      })
      .catch((error) => {
        setState((s) => ({ movies: s.movies, loading: false, error }));
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: () => load(true) };
}
