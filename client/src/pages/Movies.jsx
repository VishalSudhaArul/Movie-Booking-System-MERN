import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useCatalog from "../hooks/useCatalog";
import MovieCard from "../components/MovieCard";
import Icon from "../components/ui/Icon";
import TrailerModal from "../components/TrailerModal";
import { EmptyState, ErrorState, MovieGridSkeleton } from "../components/ui/Feedback";
import { splitGenres } from "../lib/format";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "now", label: "Now showing" },
  { value: "soon", label: "Coming soon" },
];

const SORTS = {
  popular: { label: "Most showtimes", fn: (a, b) => b.upcomingShowCount - a.upcomingShowCount || b.showCount - a.showCount },
  rating: { label: "Top rated", fn: (a, b) => (b.avgRating || 0) - (a.avgRating || 0) },
  newest: { label: "Recently added", fn: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) },
  title: { label: "Title A–Z", fn: (a, b) => a.title.localeCompare(b.title) },
};

function Movies() {
  const { movies, loading, error, reload } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [trailerMovie, setTrailerMovie] = useState(null);

  const status = STATUS_TABS.some((t) => t.value === params.get("status")) ? params.get("status") : "all";
  const query = params.get("q") || "";
  const genre = params.get("genre") || "All";
  const language = params.get("lang") || "All";
  const sort = SORTS[params.get("sort")] ? params.get("sort") : "popular";

  // Filters live in the URL so results can be shared and survive a refresh.
  const setParam = (key, value, defaultValue) => {
    const next = new URLSearchParams(params);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const genres = useMemo(() => {
    const set = new Set();
    movies.forEach((m) => splitGenres(m.genre).forEach((g) => set.add(g)));
    return ["All", ...Array.from(set).sort()];
  }, [movies]);

  const languages = useMemo(() => {
    const set = new Set(movies.map((m) => m.language).filter(Boolean));
    return set.size ? ["All", ...Array.from(set).sort()] : [];
  }, [movies]);

  const counts = useMemo(
    () => ({
      all: movies.length,
      now: movies.filter((m) => m.status === "now").length,
      soon: movies.filter((m) => m.status === "soon").length,
    }),
    [movies]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movies
      .filter((m) => {
        if (status !== "all" && m.status !== status) return false;
        if (genre !== "All" && !splitGenres(m.genre).includes(genre)) return false;
        if (language !== "All" && m.language !== language) return false;
        if (!q) return true;
        return (
          m.title?.toLowerCase().includes(q) ||
          m.genre?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.language?.toLowerCase().includes(q)
        );
      })
      .sort(SORTS[sort].fn);
  }, [movies, status, genre, language, query, sort]);

  const isFiltering = !!query.trim() || genre !== "All" || language !== "All" || status !== "all";

  return (
    <main id="main" className="min-h-screen bg-ink-950">
      <div className="border-b border-white/[0.07] bg-ink-900">
        <div className="container-page py-10">
          <p className="eyebrow mb-2">Browse</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Movies</h1>
          <p className="mt-2 text-sm text-gray-400">
            Find a movie, pick a showtime and choose your seats.
          </p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1 md:max-w-md">
              <Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => setParam("q", e.target.value)}
                placeholder="Search by title, genre or keyword"
                aria-label="Search movies"
                className="input pl-10"
              />
            </div>

            <div className="flex gap-3">
              {languages.length > 0 && (
                <select
                  value={language}
                  onChange={(e) => setParam("lang", e.target.value, "All")}
                  aria-label="Filter by language"
                  className="input w-auto pr-8"
                >
                  {languages.map((l) => (
                    <option key={l} value={l}>
                      {l === "All" ? "All languages" : l}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={sort}
                onChange={(e) => setParam("sort", e.target.value, "popular")}
                aria-label="Sort movies"
                className="input w-auto pr-8"
              >
                {Object.entries(SORTS).map(([key, s]) => (
                  <option key={key} value={key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        {/* Status tabs */}
        <div className="mb-5 inline-flex rounded-xl border border-white/[0.07] bg-ink-900 p-1" role="tablist" aria-label="Movie status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => setParam("status", tab.value, "all")}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                status === tab.value ? "bg-white/[0.1] text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs font-normal text-gray-500">{counts[tab.value]}</span>
            </button>
          ))}
        </div>

        {/* Genre chips */}
        {genres.length > 2 && (
          <div className="scroll-row -mx-4 mb-8 px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by genre">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setParam("genre", g, "All")}
                aria-pressed={genre === g}
                className={`chip ${genre === g ? "chip-active" : ""}`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {loading && movies.length === 0 ? (
          <MovieGridSkeleton count={10} />
        ) : error && movies.length === 0 ? (
          <ErrorState title="We couldn't load movies" onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title={isFiltering ? "No movies match your filters" : "No movies yet"}
            message={
              isFiltering
                ? "Try a different search or clear the filters to see everything."
                : "New releases will appear here as soon as they're added."
            }
            action={
              isFiltering && (
                <button className="btn-secondary" onClick={() => setParams({}, { replace: true })}>
                  Clear all filters
                </button>
              )
            }
          />
        ) : (
          <>
            <p className="mb-5 text-sm text-gray-400" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "movie" : "movies"}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filtered.map((movie) => (
                <MovieCard key={movie._id} movie={movie} onPlayTrailer={setTrailerMovie} />
              ))}
            </div>
          </>
        )}
      </div>

      <TrailerModal
        isOpen={!!trailerMovie}
        onClose={() => setTrailerMovie(null)}
        trailerUrl={trailerMovie?.trailerUrl}
        movieTitle={trailerMovie?.title}
      />
    </main>
  );
}

export default Movies;
