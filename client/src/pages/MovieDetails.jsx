import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import API from "../api";
import Poster from "../components/Poster";
import Icon from "../components/ui/Icon";
import TrailerModal, { getYouTubeEmbedUrl } from "../components/TrailerModal";
import { EmptyState, ErrorState, Spinner } from "../components/ui/Feedback";
import { useToast } from "../components/ui/Toast";
import { useWatchlist } from "../context/WatchlistContext";
import { getSession } from "../lib/session";
import {
  formatDate,
  formatDuration,
  formatPrice,
  formatShowDate,
  formatShowTime,
  getErrorMessage,
  getShowDateTime,
  isUpcomingShow,
  splitGenres,
} from "../lib/format";

const REVIEW_MIN = 10;
const REVIEW_MAX = 500;

function MovieDetails() {
  const { movieId } = useParams();
  const location = useLocation();
  const toast = useToast();
  const { isSaved, toggle } = useWatchlist();
  const { isLoggedIn } = getSession();

  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error | missing
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(() => {
    API.get(`/api/reviews/movie/${movieId}`)
      .then((res) => {
        setReviews(res.data.reviews || []);
        setAvgRating(res.data.avgRating || 0);
        setTotalRatings(res.data.totalRatings || 0);
      })
      .catch(() => {});
  }, [movieId]);

  const load = useCallback(() => {
    setStatus("loading");
    setSelectedDate(null);
    Promise.all([
      API.get(`/api/movies/${movieId}`),
      API.get(`/api/shows/movie/${movieId}`).catch(() => ({ data: [] })),
    ])
      .then(([movieRes, showsRes]) => {
        if (!movieRes.data) {
          setStatus("missing");
          return;
        }
        setMovie(movieRes.data);
        setShows(Array.isArray(showsRes.data) ? showsRes.data : []);
        setStatus("ready");
      })
      .catch((err) => setStatus(err?.response?.status === 404 ? "missing" : "error"));
    fetchReviews();
  }, [movieId, fetchReviews]);

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
  }, [load]);

  // Group shows by date, upcoming first; earlier shows are kept in a separate group.
  const { upcomingDates, earlierShows } = useMemo(() => {
    const byTime = (a, b) => (getShowDateTime(a)?.getTime() || 0) - (getShowDateTime(b)?.getTime() || 0);
    const upcoming = shows.filter((s) => isUpcomingShow(s)).sort(byTime);
    const earlier = shows.filter((s) => !isUpcomingShow(s)).sort((a, b) => byTime(b, a));
    const dates = [];
    upcoming.forEach((show) => {
      let group = dates.find((d) => d.date === show.date);
      if (!group) {
        group = { date: show.date, shows: [] };
        dates.push(group);
      }
      group.shows.push(show);
    });
    return { upcomingDates: dates, earlierShows: earlier };
  }, [shows]);

  const activeDate = upcomingDates.find((d) => d.date === selectedDate) || upcomingDates[0];

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: movie.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch (e) {
      /* user dismissed the share sheet */
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    const comment = userComment.trim();
    if (!userRating) return setReviewError("Please choose a star rating.");
    if (comment.length < REVIEW_MIN)
      return setReviewError(`Please write at least ${REVIEW_MIN} characters.`);

    setReviewError("");
    setSubmitting(true);
    try {
      await API.post(`/api/reviews`, { movieId, rating: userRating, comment });
      toast.success("Thanks! Your review has been posted.");
      setUserComment("");
      setUserRating(0);
      fetchReviews();
    } catch (err) {
      setReviewError(getErrorMessage(err, "We couldn't post your review. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") return <DetailsSkeleton />;

  if (status === "error" || status === "missing") {
    return (
      <main id="main" className="container-page min-h-[70vh] py-16">
        {status === "missing" ? (
          <EmptyState
            icon="film"
            title="Movie not found"
            message="This movie may have been removed or the link is incorrect."
            action={
              <Link to="/movies" className="btn-primary">
                Browse movies
              </Link>
            }
          />
        ) : (
          <ErrorState title="We couldn't load this movie" onRetry={load} />
        )}
      </main>
    );
  }

  const saved = isSaved(movie._id);
  const genres = splitGenres(movie.genre);
  const hasTrailer = !!getYouTubeEmbedUrl(movie.trailerUrl);
  const cast = (movie.cast || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const facts = [
    { label: "Duration", value: formatDuration(movie.duration) },
    { label: "Language", value: movie.language },
    { label: "Release date", value: movie.releaseDate ? formatDate(movie.releaseDate) : "" },
    { label: "Director", value: movie.director },
  ].filter((f) => f.value);

  return (
    <main id="main" className="min-h-screen">
      {/* ───────────── Banner ───────────── */}
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="absolute inset-0" aria-hidden="true">
          <img src={movie.poster} alt="" className="h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/60" />
        </div>

        <div className="container-page relative py-8 sm:py-12">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-gray-400">
            <Link to="/" className="hover:text-white">Home</Link>
            <Icon name="chevronRight" className="h-3 w-3" />
            <Link to="/movies" className="hover:text-white">Movies</Link>
            <Icon name="chevronRight" className="h-3 w-3" />
            <span className="truncate text-gray-300">{movie.title}</span>
          </nav>

          <div className="flex flex-col gap-6 sm:flex-row sm:gap-8 lg:gap-12">
            <div className="mx-auto w-44 shrink-0 sm:mx-0 sm:w-56 lg:w-72">
              <div className="relative">
                <Poster
                  src={movie.poster}
                  alt={`${movie.title} poster`}
                  eager
                  className="aspect-[2/3] w-full rounded-2xl border border-white/10 shadow-2xl"
                />
                {hasTrailer && (
                  <button
                    onClick={() => setIsTrailerOpen(true)}
                    className="group absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 transition hover:bg-black/40"
                    aria-label="Play trailer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Icon name="play" filled className="ml-0.5 h-6 w-6" />
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                {movie.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-300">
                <a href="#reviews" className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 py-1.5 transition hover:bg-white/[0.12]">
                  <Icon name="star" filled className="h-4 w-4 text-gold-400" />
                  {totalRatings > 0 ? (
                    <>
                      <span className="font-bold text-white">{Number(avgRating).toFixed(1)}</span>
                      <span className="text-gray-400">
                        / 5 · {totalRatings} {totalRatings === 1 ? "review" : "reviews"}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-300">No ratings yet</span>
                  )}
                </a>
                {formatDuration(movie.duration) && (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="clock" className="h-4 w-4 text-gray-400" />
                    {formatDuration(movie.duration)}
                  </span>
                )}
                {movie.language && <span>{movie.language}</span>}
              </div>

              {genres.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <Link key={g} to={`/movies?genre=${encodeURIComponent(g)}`} className="badge hover:border-white/25 hover:text-white">
                      {g}
                    </Link>
                  ))}
                </div>
              )}

              <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-gray-300">{movie.description}</p>

              {facts.length > 0 && (
                <dl className="mt-6 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  {facts.map((f) => (
                    <div key={f.label}>
                      <dt className="text-xs text-gray-500">{f.label}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-white">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a href="#showtimes" className="btn-primary btn-lg">
                  <Icon name="ticket" className="h-5 w-5" />
                  Book tickets
                </a>
                {hasTrailer && (
                  <button onClick={() => setIsTrailerOpen(true)} className="btn-secondary btn-lg">
                    <Icon name="play" filled className="h-4 w-4" />
                    Trailer
                  </button>
                )}
                <button
                  onClick={() => toggle(movie)}
                  aria-pressed={saved}
                  className={`btn btn-lg border ${
                    saved
                      ? "border-brand-500/50 bg-brand-500/10 text-brand-300"
                      : "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12]"
                  }`}
                >
                  <Icon name="heart" filled={saved} className="h-4 w-4" />
                  {saved ? "Saved" : "Watchlist"}
                </button>
                <button onClick={handleShare} className="btn-icon h-[52px] w-[52px]" aria-label="Share this movie">
                  <Icon name="share" className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-10 pb-20 pt-4 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          {/* ───────────── Cast ───────────── */}
          {cast.length > 0 && (
            <section aria-labelledby="cast-title">
              <h2 id="cast-title" className="section-title mb-4 !text-2xl">Cast</h2>
              <ul className="flex flex-wrap gap-2">
                {cast.map((name) => (
                  <li key={name} className="flex items-center gap-2.5 rounded-full border border-white/[0.07] bg-ink-850 py-1.5 pl-1.5 pr-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-200">{name}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ───────────── Showtimes ───────────── */}
          <section id="showtimes" aria-labelledby="showtimes-title" className="scroll-mt-24">
            <h2 id="showtimes-title" className="section-title mb-5 !text-2xl">Showtimes</h2>

            {shows.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="No showtimes yet"
                message="Showtimes for this movie haven't been announced. Save it to your watchlist and check back soon."
                action={
                  !saved && (
                    <button className="btn-secondary" onClick={() => toggle(movie)}>
                      <Icon name="heart" className="h-4 w-4" /> Add to watchlist
                    </button>
                  )
                }
              />
            ) : (
              <div className="space-y-6">
                {upcomingDates.length > 0 ? (
                  <>
                    <div className="scroll-row -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Choose a date">
                      {upcomingDates.map((d) => {
                        const active = activeDate?.date === d.date;
                        return (
                          <button
                            key={d.date}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setSelectedDate(d.date)}
                            className={`flex min-w-[72px] shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 transition ${
                              active
                                ? "border-brand-500 bg-brand-500 text-on-brand"
                                : "border-white/[0.08] bg-ink-850 text-gray-300 hover:border-white/20"
                            }`}
                          >
                            <span className="text-[11px] font-semibold uppercase opacity-80">
                              {formatShowDate(d.date, { weekday: "short" })}
                            </span>
                            <span className="font-display text-xl font-bold leading-tight">
                              {formatShowDate(d.date, { day: "numeric" })}
                            </span>
                            <span className="text-[11px] font-semibold uppercase opacity-80">
                              {formatShowDate(d.date, { month: "short" })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <TheatreList shows={activeDate.shows} />
                  </>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-4 text-sm text-gray-300">
                    <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
                    <p>There are no upcoming showtimes for this movie right now. Earlier showtimes are listed below.</p>
                  </div>
                )}

                {earlierShows.length > 0 && (
                  <details className="group card-muted" open={upcomingDates.length === 0}>
                    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-gray-300 [&::-webkit-details-marker]:hidden">
                      <span>Earlier showtimes ({earlierShows.length})</span>
                      <Icon name="chevronDown" className="h-4 w-4 transition group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-white/[0.07] p-4">
                      <TheatreList shows={earlierShows} showDate />
                    </div>
                  </details>
                )}
              </div>
            )}
          </section>

          {/* ───────────── Reviews ───────────── */}
          <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-24">
            <h2 id="reviews-title" className="section-title mb-5 !text-2xl">
              Reviews{totalRatings > 0 && <span className="ml-2 text-base font-normal text-gray-500">{totalRatings}</span>}
            </h2>

            {reviews.length === 0 ? (
              <EmptyState
                icon="star"
                title="No reviews yet"
                message="Seen it? Be the first to share what you thought."
              />
            ) : (
              <ul className="space-y-3">
                {reviews.map((rev) => (
                  <li key={rev._id} className="card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                          {(rev.userName || "U").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{rev.userName}</p>
                          <p className="text-xs text-gray-500">{formatDate(rev.createdAt)}</p>
                        </div>
                      </div>
                      <Stars value={rev.rating} />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-gray-300">{rev.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ───────────── Review form ───────────── */}
        <aside className="lg:col-span-1">
          <div className="card sticky top-24 p-5">
            <h2 className="text-lg font-bold text-white">Rate this movie</h2>
            {isLoggedIn ? (
              <form onSubmit={handleAddReview} className="mt-4 space-y-4" noValidate>
                <div>
                  <span className="label" id="rating-label">Your rating</span>
                  <div className="flex gap-1" role="radiogroup" aria-labelledby="rating-label" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={userRating === star}
                        aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                        onClick={() => setUserRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        className={`rounded-md p-1 transition ${
                          star <= (hoverRating || userRating) ? "text-gold-400" : "text-gray-600 hover:text-gray-400"
                        }`}
                      >
                        <Icon name="star" filled className="h-7 w-7" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="review-comment" className="label">Your review</label>
                  <textarea
                    id="review-comment"
                    rows="4"
                    maxLength={REVIEW_MAX}
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    placeholder="What did you think of the movie?"
                    className="input resize-none"
                  />
                  <p className="mt-1 text-right text-[11px] text-gray-500">
                    {userComment.length}/{REVIEW_MAX}
                  </p>
                </div>

                {reviewError && (
                  <p className="field-error !mt-0" role="alert">{reviewError}</p>
                )}

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? <><Spinner className="h-4 w-4" /> Posting…</> : "Post review"}
                </button>
              </form>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-gray-400">Sign in to rate this movie and share your review.</p>
                <Link to="/login" state={{ from: location.pathname }} className="btn-secondary mt-4 w-full">
                  Sign in to review
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        trailerUrl={movie.trailerUrl}
        movieTitle={movie.title}
      />
    </main>
  );
}

/** Shows grouped by theatre, each time as a button that opens the seat map. */
function TheatreList({ shows, showDate = false }) {
  const theatres = useMemo(() => {
    const map = new Map();
    shows.forEach((show) => {
      if (!map.has(show.theatre)) map.set(show.theatre, []);
      map.get(show.theatre).push(show);
    });
    return Array.from(map.entries());
  }, [shows]);

  return (
    <ul className="space-y-3">
      {theatres.map(([theatre, list]) => {
        const prices = list
          .flatMap((s) => [s.balconyPrice, s.firstClassPrice, s.secondClassPrice])
          .filter((p) => Number(p) > 0);
        return (
          <li key={theatre} className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-gray-300">
                  <Icon name="pin" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-sans text-base font-semibold text-white">{theatre}</h3>
                  {prices.length > 0 && (
                    <p className="text-xs text-gray-400">Tickets from {formatPrice(Math.min(...prices))}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {list.map((show) => {
                const total = show.seats?.length || 0;
                const available = total ? show.seats.filter((s) => !s.isBooked).length : null;
                const soldOut = available === 0;
                const fillingFast = available !== null && !soldOut && available / total <= 0.25;
                const label = (
                  <>
                    <span className="block text-sm font-bold">{formatShowTime(show.time)}</span>
                    <span className="block text-[11px] font-medium opacity-80">
                      {showDate
                        ? formatShowDate(show.date, { day: "numeric", month: "short", year: "numeric" })
                        : soldOut
                        ? "Sold out"
                        : fillingFast
                        ? "Filling fast"
                        : "Available"}
                    </span>
                  </>
                );
                if (soldOut) {
                  return (
                    <span
                      key={show._id}
                      className="min-w-[104px] cursor-not-allowed rounded-xl border border-white/[0.07] px-4 py-2 text-center text-gray-600"
                      aria-disabled="true"
                    >
                      {label}
                    </span>
                  );
                }
                return (
                  <Link
                    key={show._id}
                    to={`/seats/${show._id}`}
                    aria-label={`${formatShowTime(show.time)} at ${theatre}, select seats`}
                    className={`min-w-[104px] rounded-xl border px-4 py-2 text-center transition hover:-translate-y-0.5 ${
                      fillingFast
                        ? "border-gold-500/40 text-gold-400 hover:bg-gold-500/10"
                        : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Stars({ value }) {
  return (
    <span className="flex shrink-0 gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          filled
          className={`h-4 w-4 ${n <= value ? "text-gold-400" : "text-gray-700"}`}
        />
      ))}
    </span>
  );
}

function DetailsSkeleton() {
  return (
    <main className="container-page min-h-screen py-12" role="status" aria-label="Loading movie">
      <div className="flex flex-col gap-8 sm:flex-row lg:gap-12">
        <div className="skeleton mx-auto aspect-[2/3] w-44 shrink-0 rounded-2xl sm:mx-0 sm:w-56 lg:w-72" />
        <div className="flex-1 space-y-4">
          <div className="skeleton h-12 w-3/4" />
          <div className="skeleton h-6 w-1/2" />
          <div className="skeleton h-24 w-full max-w-2xl" />
          <div className="flex gap-3">
            <div className="skeleton h-12 w-40 rounded-xl" />
            <div className="skeleton h-12 w-32 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="skeleton mt-12 h-40 w-full rounded-2xl" />
    </main>
  );
}

export default MovieDetails;
