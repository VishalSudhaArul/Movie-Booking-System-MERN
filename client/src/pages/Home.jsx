import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import useCatalog from "../hooks/useCatalog";
import MovieCard from "../components/MovieCard";
import Poster from "../components/Poster";
import Icon from "../components/ui/Icon";
import TrailerModal, { getYouTubeEmbedUrl } from "../components/TrailerModal";
import { EmptyState, ErrorState, MovieGridSkeleton } from "../components/ui/Feedback";
import { formatDuration, splitGenres } from "../lib/format";

const HeroTrailer = lazy(() => import("../components/HeroTrailer"));

const HERO_COUNT = 5;
const HERO_INTERVAL_MS = 7000;
const GRID = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

function Home() {
  const { movies, loading, error, reload } = useCatalog();
  const [activeHero, setActiveHero] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [trailerMovie, setTrailerMovie] = useState(null);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [showDemo, setShowDemo] = useState(false);

  const nowShowing = useMemo(
    () =>
      movies
        .filter((m) => m.status === "now")
        .sort((a, b) => b.upcomingShowCount - a.upcomingShowCount),
    [movies]
  );
  const comingSoon = useMemo(() => movies.filter((m) => m.status === "soon"), [movies]);
  const topRated = useMemo(
    () =>
      movies
        .filter((m) => m.avgRating)
        .sort((a, b) => b.avgRating - a.avgRating || b.totalRatings - a.totalRatings)
        .slice(0, 5),
    [movies]
  );

  const heroMovies = useMemo(
    () => (nowShowing.length ? nowShowing : movies).slice(0, HERO_COUNT),
    [nowShowing, movies]
  );

  const genres = useMemo(() => {
    const counts = {};
    nowShowing.forEach((m) => splitGenres(m.genre).forEach((g) => (counts[g] = (counts[g] || 0) + 1)));
    return ["All", ...Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 8)];
  }, [nowShowing]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nowShowing.filter((m) => {
      const matchesQuery =
        !q ||
        m.title?.toLowerCase().includes(q) ||
        m.genre?.toLowerCase().includes(q) ||
        m.language?.toLowerCase().includes(q);
      const matchesGenre = genre === "All" || splitGenres(m.genre).includes(genre);
      return matchesQuery && matchesGenre;
    });
  }, [nowShowing, query, genre]);

  // Auto-advance the hero, pausing on hover/focus and while a trailer is open
  useEffect(() => {
    if (heroMovies.length < 2 || heroPaused || trailerMovie) return undefined;
    const timer = setInterval(
      () => setActiveHero((prev) => (prev + 1) % heroMovies.length),
      HERO_INTERVAL_MS
    );
    return () => clearInterval(timer);
  }, [heroMovies.length, heroPaused, trailerMovie]);

  const hero = heroMovies[Math.min(activeHero, heroMovies.length - 1)];
  const isFiltering = query.trim() !== "" || genre !== "All";

  return (
    <main id="main" className="min-h-screen bg-ink-950">
      {/* ───────────── Hero ───────────── */}
      <section
        className="relative -mt-16 overflow-hidden pt-16"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        onFocus={() => setHeroPaused(true)}
        onBlur={() => setHeroPaused(false)}
        aria-roledescription="carousel"
        aria-label="Featured movies"
      >
        {loading && !hero ? (
          <HeroSkeleton />
        ) : hero ? (
          <>
            {/* Backdrop: the poster, blurred and darkened */}
            <div className="absolute inset-0" aria-hidden="true">
              <img
                key={hero._id}
                src={hero.poster}
                alt=""
                className="h-full w-full scale-110 object-cover opacity-50 blur-2xl animate-fadeIn"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/60" />
            </div>

            <div className="container-page relative flex min-h-[540px] items-center gap-10 py-12 md:min-h-[600px] lg:gap-16">
              <div key={hero._id} className="max-w-2xl flex-1 animate-fadeUp">
                <p className="eyebrow mb-4">{hero.status === "now" ? "Now showing" : "Featured"}</p>
                <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {hero.title}
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-gray-300">
                  {hero.avgRating ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-white">
                      <Icon name="star" filled className="h-4 w-4 text-gold-400" />
                      {hero.avgRating.toFixed(1)}
                      <span className="font-normal text-gray-400">({hero.totalRatings})</span>
                    </span>
                  ) : null}
                  {formatDuration(hero.duration) && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="clock" className="h-4 w-4 text-gray-400" />
                      {formatDuration(hero.duration)}
                    </span>
                  )}
                  {hero.language && <span className="badge">{hero.language}</span>}
                  {splitGenres(hero.genre)
                    .slice(0, 3)
                    .map((g) => (
                      <span key={g} className="badge">
                        {g}
                      </span>
                    ))}
                </div>

                {hero.description && (
                  <p className="mt-5 line-clamp-3 max-w-xl text-base leading-relaxed text-gray-300">
                    {hero.description}
                  </p>
                )}

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link to={`/movies/${hero._id}`} className="btn-primary btn-lg">
                    <Icon name="ticket" className="h-5 w-5" />
                    Book tickets
                  </Link>
                  {getYouTubeEmbedUrl(hero.trailerUrl) && (
                    <button onClick={() => setTrailerMovie(hero)} className="btn-secondary btn-lg">
                      <Icon name="play" filled className="h-4 w-4" />
                      Watch trailer
                    </button>
                  )}
                </div>

                {heroMovies.length > 1 && (
                  <div className="mt-10 flex items-center gap-2" role="tablist" aria-label="Choose featured movie">
                    {heroMovies.map((m, i) => (
                      <button
                        key={m._id}
                        role="tab"
                        aria-selected={i === activeHero}
                        aria-label={`Show ${m.title}`}
                        onClick={() => setActiveHero(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === activeHero ? "w-8 bg-brand-500" : "w-4 bg-white/25 hover:bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <Link
                to={`/movies/${hero._id}`}
                key={`poster-${hero._id}`}
                className="hidden shrink-0 animate-fadeUp md:block"
                aria-label={`${hero.title} — view details`}
                tabIndex={-1}
              >
                <Poster
                  src={hero.poster}
                  alt={hero.title}
                  eager
                  className="aspect-[2/3] w-[260px] rounded-2xl border border-white/10 shadow-2xl lg:w-[300px]"
                />
              </Link>
            </div>
          </>
        ) : (
          <div className="container-page py-24">
            {error ? (
              <ErrorState title="We couldn't load movies" onRetry={reload} />
            ) : (
              <EmptyState
                icon="film"
                title="No movies yet"
                message="New releases will appear here as soon as they're added."
              />
            )}
          </div>
        )}
      </section>

      {/* ───────────── Now showing ───────────── */}
      <section className="container-page pb-16 pt-6" aria-labelledby="now-showing-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1.5">In cinemas</p>
            <h2 id="now-showing-title" className="section-title">
              Now showing
            </h2>
          </div>
          <Link to="/movies" className="btn-ghost -mr-2 text-sm">
            View all <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-80">
            <Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or genre"
              aria-label="Search movies now showing"
              className="input pl-10"
            />
          </div>
          {genres.length > 2 && (
            <div className="scroll-row -mx-4 px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter by genre">
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  aria-pressed={genre === g}
                  className={`chip ${genre === g ? "chip-active" : ""}`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && movies.length === 0 ? (
          <MovieGridSkeleton count={10} />
        ) : error && movies.length === 0 ? (
          <ErrorState title="We couldn't load movies" onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title={isFiltering ? "No movies match your search" : "Nothing showing right now"}
            message={
              isFiltering
                ? "Try a different title or clear the filters."
                : "Check back soon — new showtimes are added regularly."
            }
            action={
              isFiltering && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setQuery("");
                    setGenre("All");
                  }}
                >
                  Clear filters
                </button>
              )
            }
          />
        ) : (
          <div className={GRID}>
            {filtered.slice(0, 10).map((movie) => (
              <MovieCard key={movie._id} movie={movie} onPlayTrailer={setTrailerMovie} />
            ))}
          </div>
        )}

        {filtered.length > 10 && (
          <div className="mt-10 text-center">
            <Link to="/movies" className="btn-secondary">
              See all {filtered.length} movies
            </Link>
          </div>
        )}
      </section>

      {/* ───────────── Top rated ───────────── */}
      {topRated.length >= 3 && (
        <section className="container-page pb-16" aria-labelledby="top-rated-title">
          <div className="mb-6">
            <p className="eyebrow mb-1.5">Audience favourites</p>
            <h2 id="top-rated-title" className="section-title">
              Top rated
            </h2>
          </div>
          <div className={GRID}>
            {topRated.map((movie) => (
              <MovieCard key={movie._id} movie={movie} onPlayTrailer={setTrailerMovie} />
            ))}
          </div>
        </section>
      )}

      {/* ───────────── Coming soon ───────────── */}
      {comingSoon.length > 0 && (
        <section className="container-page pb-16" aria-labelledby="coming-soon-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-1.5">On the way</p>
              <h2 id="coming-soon-title" className="section-title">
                Coming soon
              </h2>
            </div>
            <Link to="/movies?status=soon" className="btn-ghost -mr-2 text-sm">
              View all <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
          <div className={GRID}>
            {comingSoon.slice(0, 5).map((movie) => (
              <MovieCard key={movie._id} movie={movie} onPlayTrailer={setTrailerMovie} />
            ))}
          </div>
        </section>
      )}

      {/* ───────────── Why CineBook ───────────── */}
      <section className="container-page pb-16" aria-label="What you get with CineBook">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon="grid"
            title="Pick your exact seats"
            text="See the live seat map for every show and choose where you sit before you pay."
            to="/movies"
            cta="Browse movies"
          />
          <FeatureCard
            icon="popcorn"
            title="Snacks without the queue"
            text="Add popcorn, drinks and parking to your booking, or order food on its own."
            to="/snacks"
            cta="See the menu"
          />
          <FeatureCard
            icon="qr"
            title="Tickets on your phone"
            text="Every booking comes with a QR ticket you can show at the gate or download as a PDF."
            to="/my-bookings"
            cta="My bookings"
          />
        </div>
      </section>

      {/* ───────────── Gesture-control demo (loaded on demand) ───────────── */}
      <section className="container-page pb-20" aria-labelledby="demo-title">
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow mb-1.5">CineBook Labs</p>
              <h2 id="demo-title" className="text-xl font-bold text-white">
                Touch-free booking with motion control
              </h2>
              <p className="mt-1 max-w-xl text-sm text-gray-400">
                A preview of our gesture-controlled kiosk experience for cinema lobbies.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => setShowDemo((v) => !v)} aria-expanded={showDemo}>
                <Icon name={showDemo ? "close" : "play"} filled={!showDemo} className="h-4 w-4" />
                {showDemo ? "Hide preview" : "Play preview"}
              </button>
              <a href="/hero-video.html" target="_blank" rel="noreferrer" className="btn-ghost">
                Open full screen
              </a>
            </div>
          </div>
          {showDemo && (
            <div className="border-t border-white/[0.07] p-4 sm:p-6">
              <Suspense fallback={<div className="skeleton h-64 w-full rounded-2xl" />}>
                <HeroTrailer />
              </Suspense>
            </div>
          )}
        </div>
      </section>

      <TrailerModal
        isOpen={!!trailerMovie}
        onClose={() => setTrailerMovie(null)}
        trailerUrl={trailerMovie?.trailerUrl}
        movieTitle={trailerMovie?.title}
      />
    </main>
  );
}

function FeatureCard({ icon, title, text, to, cta }) {
  return (
    <div className="card flex flex-col p-6">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-gray-400">{text}</p>
      <Link
        to={to}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 transition hover:text-brand-300"
      >
        {cta} <Icon name="arrowRight" className="h-4 w-4" />
      </Link>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="container-page flex min-h-[540px] items-center gap-16 py-12 md:min-h-[600px]" role="status" aria-label="Loading featured movies">
      <div className="max-w-2xl flex-1 space-y-5">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-14 w-4/5" />
        <div className="skeleton h-5 w-2/3" />
        <div className="skeleton h-16 w-full max-w-xl" />
        <div className="flex gap-3">
          <div className="skeleton h-12 w-40 rounded-xl" />
          <div className="skeleton h-12 w-40 rounded-xl" />
        </div>
      </div>
      <div className="skeleton hidden aspect-[2/3] w-[300px] rounded-2xl md:block" />
    </div>
  );
}

export default Home;
