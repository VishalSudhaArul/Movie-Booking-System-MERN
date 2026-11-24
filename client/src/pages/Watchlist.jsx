import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import MovieCard from "../components/MovieCard";
import PageHeader from "../components/ui/PageHeader";
import TrailerModal from "../components/TrailerModal";
import { EmptyState, ErrorState, MovieGridSkeleton } from "../components/ui/Feedback";
import { useWatchlist } from "../context/WatchlistContext";
import { getSession } from "../lib/session";

export default function Watchlist() {
  const { isLoggedIn } = getSession();
  const { items } = useWatchlist();
  const [status, setStatus] = useState(isLoggedIn ? "loading" : "signed-out");
  const [movies, setMovies] = useState([]);
  const [trailerMovie, setTrailerMovie] = useState(null);

  const load = useCallback(() => {
    if (!isLoggedIn) return;
    setStatus("loading");
    API.get("/api/users/watchlist")
      .then((res) => {
        setMovies(Array.isArray(res.data) ? res.data.filter((m) => m && m._id) : []);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [isLoggedIn]);

  useEffect(() => {
    load();
  }, [load]);

  // Removing a movie with its heart button updates the shared watchlist; keep the grid in step.
  const savedIds = new Set(items.map((m) => m._id || m));
  const visible = status === "ready" ? movies.filter((m) => savedIds.has(m._id)) : movies;

  return (
    <main id="main" className="container-page py-8 sm:py-10">
      <PageHeader
        eyebrow="Watchlist"
        title="Saved movies"
        subtitle="Movies you've saved with the heart button. Book whenever you're ready."
        icon="heart"
        actions={status === "ready" && visible.length > 0 && <span className="badge">{visible.length} saved</span>}
      />

      <div className="mt-8">
        {status === "signed-out" ? (
          <EmptyState
            icon="heart"
            title="Sign in to see your watchlist"
            message="Save movies you want to watch and find them here on any device."
            action={<Link to="/login" state={{ from: "/watchlist" }} className="btn-primary">Sign in</Link>}
          />
        ) : status === "loading" ? (
          <MovieGridSkeleton count={5} />
        ) : status === "error" ? (
          <ErrorState title="We couldn't load your watchlist" onRetry={load} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="heart"
            title="Your watchlist is empty"
            message="Tap the heart on any movie to save it here."
            action={<Link to="/movies" className="btn-primary">Browse movies</Link>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((movie) => (
              <MovieCard key={movie._id} movie={movie} onPlayTrailer={setTrailerMovie} />
            ))}
          </div>
        )}
      </div>

      {trailerMovie && (
        <TrailerModal isOpen onClose={() => setTrailerMovie(null)} trailerUrl={trailerMovie.trailerUrl} movieTitle={trailerMovie.title} />
      )}
    </main>
  );
}
