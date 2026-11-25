import React from "react";
import { Link } from "react-router-dom";
import Poster from "./Poster";
import Icon from "./ui/Icon";
import { useWatchlist } from "../context/WatchlistContext";
import { formatDuration, splitGenres } from "../lib/format";
import { getYouTubeEmbedUrl } from "./TrailerModal";

/** Poster-first movie card used across the home, browse and watchlist grids. */
export default function MovieCard({ movie, onPlayTrailer }) {
  const { isSaved, toggle } = useWatchlist();
  const saved = isSaved(movie._id);
  const genres = splitGenres(movie.genre).slice(0, 2);
  const duration = formatDuration(movie.duration);
  const hasTrailer = !!getYouTubeEmbedUrl(movie.trailerUrl);
  const comingSoon = movie.status === "soon";
  const meta = [genres.join(" · "), duration, movie.language].filter(Boolean);

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] shadow-card transition duration-300 group-hover:-translate-y-1 group-hover:border-white/20">
        <Link to={`/movies/${movie._id}`} aria-label={`${movie.title} — view details`} className="block">
          <Poster
            src={movie.poster}
            alt={movie.title}
            className="aspect-[2/3] w-full transition duration-500 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />
        </Link>

        {/* Top row: rating / status and watchlist */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          <div className="flex flex-col gap-1.5">
            {movie.avgRating ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-xs font-bold text-white backdrop-blur">
                <Icon name="star" filled className="h-3.5 w-3.5 text-gold-400" />
                {movie.avgRating.toFixed(1)}
              </span>
            ) : null}
            {comingSoon && (
              <span className="rounded-lg bg-accent-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-on-accent">
                Coming soon
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => toggle(movie)}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${movie.title} from watchlist` : `Add ${movie.title} to watchlist`}
            className={`pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition ${
              saved ? "bg-brand-500 text-on-brand" : "bg-black/60 text-white hover:bg-black/80"
            }`}
          >
            <Icon name="heart" filled={saved} className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom row: quick actions */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-2.5 transition duration-300 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
          <Link to={`/movies/${movie._id}`} className="btn-primary btn-sm flex-1">
            {comingSoon ? "View details" : "Book tickets"}
          </Link>
          {hasTrailer && onPlayTrailer && (
            <button
              type="button"
              onClick={() => onPlayTrailer(movie)}
              aria-label={`Play trailer for ${movie.title}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            >
              <Icon name="play" filled className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 min-w-0">
        <h3 className="truncate text-[15px] font-semibold text-white">
          <Link to={`/movies/${movie._id}`} className="transition hover:text-brand-400">
            {movie.title}
          </Link>
        </h3>
        {meta.length > 0 && <p className="mt-0.5 truncate text-xs text-gray-400">{meta.join("  •  ")}</p>}
      </div>
    </article>
  );
}
