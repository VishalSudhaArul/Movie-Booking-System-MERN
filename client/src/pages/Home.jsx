import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m as motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import useCatalog from "../hooks/useCatalog";
import MovieCard from "../components/MovieCard";
import Poster from "../components/Poster";
import Icon from "../components/ui/Icon";
import TrailerModal, { getYouTubeEmbedUrl } from "../components/TrailerModal";
import { EmptyState, ErrorState, MovieGridSkeleton } from "../components/ui/Feedback";
import {
  formatDuration,
  formatShowDate,
  formatShowTime,
  getShowDateTime,
  splitGenres,
} from "../lib/format";

const HeroTrailer = lazy(() => import("../components/HeroTrailer"));

const HERO_COUNT = 5;
const HERO_INTERVAL_MS = 7000;
const GRID = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
const EASE = [0.22, 1, 0.36, 1];

/* ───────────────────────── Page ───────────────────────── */

function Home() {
  const { movies, upcomingShows, loading, error, reload } = useCatalog();
  const [trailerMovie, setTrailerMovie] = useState(null);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [showDemo, setShowDemo] = useState(false);

  const nowShowing = useMemo(
    () => movies.filter((m) => m.status === "now").sort((a, b) => b.upcomingShowCount - a.upcomingShowCount),
    [movies]
  );
  const comingSoon = useMemo(() => movies.filter((m) => m.status === "soon"), [movies]);
  const topRated = useMemo(
    () =>
      movies
        .filter((m) => m.avgRating)
        .sort((a, b) => b.avgRating - a.avgRating || b.totalRatings - a.totalRatings)
        .slice(0, 8),
    [movies]
  );
  const heroMovies = useMemo(() => (nowShowing.length ? nowShowing : movies).slice(0, HERO_COUNT), [nowShowing, movies]);

  const genres = useMemo(() => {
    const counts = {};
    nowShowing.forEach((m) => splitGenres(m.genre).forEach((g) => (counts[g] = (counts[g] || 0) + 1)));
    return ["All", ...Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 8)];
  }, [nowShowing]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nowShowing.filter((m) => {
      const matchesQuery =
        !q || m.title?.toLowerCase().includes(q) || m.genre?.toLowerCase().includes(q) || m.language?.toLowerCase().includes(q);
      const matchesGenre = genre === "All" || splitGenres(m.genre).includes(genre);
      return matchesQuery && matchesGenre;
    });
  }, [nowShowing, query, genre]);

  const cinemaCount = useMemo(() => new Set(upcomingShows.map((s) => s.theatre).filter(Boolean)).size, [upcomingShows]);
  const isFiltering = query.trim() !== "" || genre !== "All";

  return (
    // LazyMotion loads only the animation features this page uses, keeping the
    // first download small.
    <LazyMotion features={domAnimation}>
    <main id="main" className="min-h-screen">
      <CinematicHero
        movies={heroMovies}
        loading={loading}
        error={error}
        reload={reload}
        upcomingCount={upcomingShows.length}
        onTrailer={setTrailerMovie}
        paused={!!trailerMovie}
      />

      {movies.length > 0 && (
        <StatsStrip nowShowing={nowShowing.length} showtimes={upcomingShows.length} cinemas={cinemaCount} />
      )}

      {nowShowing.length > 0 && (
        <PosterRail
          id="in-cinemas"
          eyebrow="In cinemas"
          title="Tonight's big screen"
          movies={nowShowing.slice(0, 12)}
          action={{ to: "/movies", label: "All movies" }}
        />
      )}

      <StorySection movies={nowShowing.length ? nowShowing : movies} />

      <ShowtimeDiscovery shows={upcomingShows} movies={movies} loading={loading} />

      {topRated.length >= 3 && (
        <PosterRail id="top-rated" eyebrow="Audience favourites" title="Top rated" movies={topRated} ranked />
      )}

      {/* ───────────── Browse everything now showing ───────────── */}
      <section className="container-page pb-20 pt-4" aria-labelledby="now-showing-title">
        <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1.5">Find your film</p>
            <h2 id="now-showing-title" className="section-title">
              Now showing
            </h2>
          </div>
          <Link to="/movies" className="btn-ghost -mr-2 text-sm">
            View all <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </Reveal>

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
                <button key={g} onClick={() => setGenre(g)} aria-pressed={genre === g} className={`chip ${genre === g ? "chip-active" : ""}`}>
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
            message={isFiltering ? "Try a different title or clear the filters." : "Check back soon — new showtimes are added regularly."}
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

      {comingSoon.length > 0 && (
        <PosterRail
          id="coming-soon"
          eyebrow="On the way"
          title="Coming soon"
          movies={comingSoon.slice(0, 12)}
          action={{ to: "/movies?status=soon", label: "View all" }}
        />
      )}

      {/* ───────────── Why CineBook ───────────── */}
      <section className="container-page pb-16" aria-label="What you get with CineBook">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────── Gesture-control demo (loaded on demand) ───────────── */}
      <section className="container-page pb-20" aria-labelledby="demo-title">
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow mb-1.5">CineBook Labs · Concept preview</p>
              <h2 id="demo-title" className="text-xl font-bold text-white">
                Touch-free booking with motion control
              </h2>
              <p className="mt-1 max-w-xl text-sm text-gray-400">
                An animated concept of a gesture-controlled kiosk for cinema lobbies. It's a demo, not a live feature.
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
    </LazyMotion>
  );
}

/* ───────────────────────── Motion helpers ───────────────────────── */

/** Fades and lifts its children in once they scroll into view. */
function Reveal({ children, className = "", delay = 0, as = "div" }) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/** Tilts toward the mouse pointer (mouse only; touch and reduced motion stay flat). */
function useTilt(max = 8) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 180, damping: 18 });
  const rotateY = useSpring(ry, { stiffness: 180, damping: 18 });
  const handlers = reduce
    ? {}
    : {
        onPointerMove: (e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          ry.set((px - 0.5) * max * 2);
          rx.set((0.5 - py) * max * 2);
          e.currentTarget.style.setProperty("--mx", `${px * 100}%`);
          e.currentTarget.style.setProperty("--my", `${py * 100}%`);
        },
        onPointerLeave: () => {
          rx.set(0);
          ry.set(0);
        },
      };
  return { style: reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }, handlers };
}

/* ───────────────────────── Hero ───────────────────────── */

function CinematicHero({ movies, loading, error, reload, upcomingCount, onTrailer, paused: externallyPaused }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const hero = movies[Math.min(active, movies.length - 1)];
  const paused = hovered || externallyPaused;

  useEffect(() => {
    if (active >= movies.length) setActive(0);
  }, [active, movies.length]);

  // Scroll-driven parallax: the backdrop drifts slower than the page, the
  // copy rises and fades, the poster sinks slightly.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.18]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const posterY = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const tilt = useTilt(7);

  const next = () => setActive((i) => (movies.length ? (i + 1) % movies.length : 0));
  const autoAdvance = movies.length > 1 && !reduce;

  if (loading && !hero) {
    return (
      <section ref={ref} aria-label="Featured movies">
        <HeroSkeleton />
      </section>
    );
  }
  if (!hero) {
    return (
      <section ref={ref} className="container-page py-24">
        {error ? (
          <ErrorState title="We couldn't load movies" onRetry={reload} />
        ) : (
          <EmptyState icon="film" title="No movies yet" message="New releases will appear here as soon as they're added." />
        )}
      </section>
    );
  }

  const genres = splitGenres(hero.genre).slice(0, 3);
  const duration = formatDuration(hero.duration);
  const words = String(hero.title || "").split(" ");

  return (
    <section
      ref={ref}
      className="relative -mt-16 flex min-h-[640px] flex-col overflow-hidden pt-16 md:min-h-[100svh] md:max-h-[980px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-roledescription="carousel"
      aria-label="Featured movies"
      data-testid="home-hero"
    >
      {/* Layer 1: the poster as a huge blurred backdrop */}
      <motion.div className="absolute inset-0" style={reduce ? undefined : { y: bgY, scale: bgScale }} aria-hidden="true">
        <AnimatePresence initial={false}>
          <motion.img
            key={hero._id}
            src={hero.poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 1.2, ease: "easeOut" }}
          />
        </AnimatePresence>
      </motion.div>

      {/* Layer 2: cinema lighting — projector beam, themed glow, haze, vignette */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute -top-1/3 left-1/2 h-[140%] w-[140%] -translate-x-1/2 opacity-60"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 0%, transparent 160deg, rgb(var(--brand-300) / 0.10) 175deg, rgb(255 255 255 / 0.06) 180deg, rgb(var(--accent-300) / 0.10) 185deg, transparent 200deg)",
          }}
        />
        <div
          className="animate-haze absolute -left-1/4 top-1/4 h-[70%] w-[80%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgb(var(--brand-500) / 0.28), transparent)" }}
        />
        <div
          className="animate-haze absolute -right-1/4 bottom-0 h-[60%] w-[70%] rounded-full blur-3xl [animation-delay:-7s]"
          style={{ background: "radial-gradient(closest-side, rgb(var(--accent-500) / 0.22), transparent)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/60 to-ink-950/0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/50" />
        <div className="absolute inset-0 shadow-[inset_0_0_160px_40px_rgba(0,0,0,0.55)]" />
      </div>

      {/* Layer 3: content */}
      <div className="container-page relative flex flex-1 items-center gap-10 py-12 lg:gap-16">
        <motion.div className="min-w-0 max-w-2xl flex-1" style={reduce ? undefined : { y: copyY, opacity: copyOpacity }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={hero._id}
              initial={reduce ? false : "hidden"}
              animate="shown"
              exit={reduce ? undefined : "gone"}
              variants={{
                hidden: {},
                shown: { transition: { staggerChildren: 0.06 } },
                gone: { opacity: 0, y: -12, transition: { duration: 0.25 } },
              }}
            >
              <motion.p variants={fadeUp} className="eyebrow mb-4 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
                </span>
                {hero.status === "now"
                  ? hero.upcomingShowCount > 0
                    ? `Now showing · ${hero.upcomingShowCount} upcoming ${hero.upcomingShowCount === 1 ? "showtime" : "showtimes"}`
                    : "Now showing"
                  : "Featured"}
              </motion.p>

              <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
                {words.map((w, i) => (
                  <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-1 align-bottom">
                    <motion.span
                      className="inline-block"
                      variants={{
                        hidden: { y: "105%" },
                        shown: { y: "0%", transition: { duration: 0.8, ease: EASE } },
                      }}
                    >
                      {w}
                      {i < words.length - 1 ? " " : ""}
                    </motion.span>
                  </span>
                ))}
              </h1>

              <motion.div variants={fadeUp} className="mt-5 flex flex-wrap items-center gap-2 text-sm text-gray-300">
                {hero.avgRating ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-white">
                    <Icon name="star" filled className="h-4 w-4 text-gold-400" />
                    {hero.avgRating.toFixed(1)}
                    <span className="font-normal text-gray-400">({hero.totalRatings})</span>
                  </span>
                ) : null}
                {duration && (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="clock" className="h-4 w-4 text-gray-400" />
                    {duration}
                  </span>
                )}
                {hero.language && <span className="badge">{hero.language}</span>}
                {genres.map((g) => (
                  <span key={g} className="badge">
                    {g}
                  </span>
                ))}
              </motion.div>

              {hero.description && (
                <motion.p variants={fadeUp} className="mt-5 line-clamp-3 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
                  {hero.description}
                </motion.p>
              )}

              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={`/movies/${hero._id}`} className="btn-primary btn-lg btn-shine">
                  <Icon name="ticket" className="h-5 w-5" />
                  Book tickets
                </Link>
                {getYouTubeEmbedUrl(hero.trailerUrl) && (
                  <button onClick={() => onTrailer(hero)} className="btn-secondary btn-lg group">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition group-hover:scale-110 group-hover:bg-white/25">
                      <Icon name="play" filled className="h-3 w-3" />
                    </span>
                    Watch trailer
                  </button>
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Sharp poster with a pointer tilt and a themed glow */}
        <motion.div className="hidden shrink-0 md:block" style={reduce ? undefined : { y: posterY }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`poster-${hero._id}`}
              initial={reduce ? false : { opacity: 0, y: 30, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -20, rotate: 2 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="relative"
            >
              <div className="absolute -inset-6 rounded-[2rem] bg-brand-gradient opacity-30 blur-3xl" aria-hidden="true" />
              <motion.div style={tilt.style} {...tilt.handlers} className="relative">
                <Link to={`/movies/${hero._id}`} aria-label={`${hero.title} — view details`} tabIndex={-1} className="block">
                  <Poster
                    src={hero.poster}
                    alt={hero.title}
                    eager
                    className="aspect-[2/3] w-[250px] rounded-2xl border border-white/15 shadow-2xl lg:w-[300px] xl:w-[330px]"
                  />
                  <div className="spotlight pointer-events-none absolute inset-0 rounded-2xl" aria-hidden="true" />
                </Link>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Featured selector with a timer bar */}
      {movies.length > 1 && (
        <div className="container-page relative pb-8">
          <div className="flex items-end justify-between gap-6">
            <div className="flex min-w-0 flex-1 gap-2 sm:gap-3" role="tablist" aria-label="Choose featured movie">
              {movies.map((m, i) => {
                const on = i === active;
                return (
                  <button
                    key={m._id}
                    role="tab"
                    aria-selected={on}
                    aria-label={`Show ${m.title}`}
                    onClick={() => setActive(i)}
                    className={`group min-w-0 flex-1 text-left transition sm:max-w-[180px] ${on ? "" : "opacity-60 hover:opacity-100"}`}
                  >
                    <span className="relative block h-1 overflow-hidden rounded-full bg-white/15">
                      {on &&
                        (autoAdvance ? (
                          <span
                            key={`bar-${m._id}`}
                            className="hero-progress absolute inset-0 rounded-full bg-brand-gradient"
                            style={{ "--hero-ms": `${HERO_INTERVAL_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
                            onAnimationEnd={next}
                          />
                        ) : (
                          <span className="absolute inset-0 rounded-full bg-brand-gradient" />
                        ))}
                    </span>
                    <span className={`mt-2 hidden truncate text-xs font-semibold sm:block ${on ? "text-white" : "text-gray-400"}`}>
                      {m.title}
                    </span>
                  </button>
                );
              })}
            </div>
            <a
              href="#in-cinemas"
              className="hidden shrink-0 flex-col items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400 transition hover:text-white md:flex"
            >
              Scroll
              <span className="flex h-8 w-5 justify-center rounded-full border border-white/25 pt-1.5">
                <span className="animate-scroll-cue h-1.5 w-1 rounded-full bg-white/70" />
              </span>
            </a>
          </div>
          {upcomingCount > 0 && <span className="sr-only">{upcomingCount} upcoming showtimes across CineBook cinemas.</span>}
        </div>
      )}
    </section>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

function HeroSkeleton() {
  return (
    <div
      className="container-page flex min-h-[600px] items-center gap-16 py-12 md:min-h-[calc(100svh-4rem)] md:max-h-[920px]"
      role="status"
      aria-label="Loading featured movies"
    >
      <div className="max-w-2xl flex-1 space-y-5">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-16 w-4/5" />
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

/* ───────────────────────── Stats (real numbers) ───────────────────────── */

function CountUp({ value }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce || !inView) {
      if (reduce) setShown(value);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 900);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduce]);
  return <span ref={ref}>{shown}</span>;
}

function StatsStrip({ nowShowing, showtimes, cinemas }) {
  const stats = [
    { icon: "film", value: nowShowing, label: nowShowing === 1 ? "movie now showing" : "movies now showing" },
    { icon: "calendar", value: showtimes, label: showtimes === 1 ? "upcoming showtime" : "upcoming showtimes" },
    { icon: "pin", value: cinemas, label: cinemas === 1 ? "cinema with shows" : "cinemas with shows" },
  ];
  return (
    <section className="container-page relative z-10 -mt-2 pb-14" aria-label="CineBook right now">
      <Reveal className="grid grid-cols-3 divide-x divide-white/[0.07] overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/70 backdrop-blur-xl">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 px-2 py-5 text-center sm:flex-row sm:justify-center sm:gap-4 sm:px-6 sm:text-left">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300 sm:flex">
              <Icon name={s.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-2xl font-extrabold text-white sm:text-3xl">
                <CountUp value={s.value} />
              </span>
              <span className="block text-[11px] leading-tight text-gray-400 sm:text-xs">{s.label}</span>
            </span>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

/* ───────────────────────── Poster rail ───────────────────────── */

function PosterRail({ id, eyebrow, title, movies, action, ranked = false }) {
  const scroller = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = () => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => {
    update();
  }, [movies]);

  const page = (dir) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section id={id} className="relative scroll-mt-20 pb-16" aria-labelledby={`${id}-title`}>
      <div className="container-page">
        <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1.5">{eyebrow}</p>
            <h2 id={`${id}-title`} className="section-title">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {action && (
              <Link to={action.to} className="btn-ghost text-sm">
                {action.label} <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            )}
            <button className="btn-icon hidden sm:inline-flex" onClick={() => page(-1)} disabled={edges.start} aria-label={`Scroll ${title} left`}>
              <Icon name="chevronLeft" className="h-5 w-5" />
            </button>
            <button className="btn-icon hidden sm:inline-flex" onClick={() => page(1)} disabled={edges.end} aria-label={`Scroll ${title} right`}>
              <Icon name="chevronRight" className="h-5 w-5" />
            </button>
          </div>
        </Reveal>
      </div>

      <div className="container-page">
        <ul
          ref={scroller}
          onScroll={update}
          className="scroll-row -mx-4 snap-x snap-mandatory gap-4 px-4 pb-4 pt-2 sm:-mx-6 sm:gap-5 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {movies.map((movie, i) => (
            <li key={movie._id} className="w-[44%] shrink-0 snap-start xs:w-[38%] sm:w-[27%] md:w-[22%] lg:w-[17.5%]">
              <RailCard movie={movie} rank={ranked ? i + 1 : null} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RailCard({ movie, rank }) {
  const tilt = useTilt(6);
  const genres = splitGenres(movie.genre).slice(0, 2).join(" · ");
  return (
    <article className="group relative">
      <motion.div style={tilt.style} {...tilt.handlers} className="relative">
        <Link
          to={`/movies/${movie._id}`}
          className="relative block overflow-hidden rounded-2xl border border-white/[0.08] shadow-card transition duration-300 group-hover:border-brand-400/50 group-hover:shadow-glow"
        >
          <Poster src={movie.poster} alt={movie.title} className="aspect-[2/3] w-full transition duration-700 group-hover:scale-[1.06]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80 transition group-hover:opacity-100" />
          <div className="spotlight pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100" />
          {rank && (
            <span
              className="pointer-events-none absolute -bottom-3 left-2 font-display text-7xl font-black leading-none text-transparent sm:text-8xl"
              style={{ WebkitTextStroke: "2px rgb(255 255 255 / 0.75)" }}
              aria-hidden="true"
            >
              {rank}
            </span>
          )}
          {movie.avgRating ? (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-xs font-bold text-white backdrop-blur">
              <Icon name="star" filled className="h-3.5 w-3.5 text-gold-400" />
              {movie.avgRating.toFixed(1)}
            </span>
          ) : null}
          <span className="absolute inset-x-3 bottom-3 translate-y-2 text-right text-xs font-semibold text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            {movie.status === "soon" ? "View details" : "Book now"} <Icon name="arrowRight" className="inline h-3.5 w-3.5" />
          </span>
        </Link>
      </motion.div>
      <h3 className="mt-3 truncate text-sm font-semibold text-white">
        {rank ? <span className="sr-only">Number {rank}: </span> : null}
        {movie.title}
      </h3>
      {genres && <p className="truncate text-xs text-gray-400">{genres}</p>}
    </article>
  );
}

/* ───────────────────────── Story (how booking works) ───────────────────────── */

const STEPS = [
  {
    key: "pick",
    title: "Pick tonight's film",
    text: "Browse what's showing with real ratings, trailers and every upcoming showtime in one place.",
  },
  {
    key: "seat",
    title: "Choose your exact seat",
    text: "Explore the auditorium in 3D or on the seat map. Seats you pick are held for 8 minutes while you check out.",
  },
  {
    key: "ticket",
    title: "Walk in with a QR ticket",
    text: "Add snacks and parking, then show the QR code at the door. Checkout is a demo: no payment is taken.",
  },
];

function StorySection({ movies }) {
  const [step, setStep] = useState(0);
  const posters = movies.slice(0, 3);

  return (
    <section className="container-page pb-20 pt-4" aria-labelledby="story-title">
      <Reveal className="mb-10 max-w-2xl">
        <p className="eyebrow mb-1.5">How it works</p>
        <h2 id="story-title" className="section-title">
          From popcorn to your perfect seat
        </h2>
      </Reveal>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ol className="space-y-6 lg:space-y-[20vh] lg:pb-[8vh] lg:pt-[4vh]">
          {STEPS.map((s, i) => (
            <StoryStep key={s.key} index={i} step={s} active={step === i} onActive={() => setStep(i)}>
              {/* On small screens each step carries its own picture. */}
              <div className="mt-5 lg:hidden">
                <StoryVisual which={s.key} posters={posters} />
              </div>
            </StoryStep>
          ))}
        </ol>
        <div className="hidden lg:block">
          <div className="sticky top-28">
            <div className="relative aspect-[4/3.4] overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-900/80 shadow-card">
              <div className="absolute inset-0 bg-brand-gradient-soft" aria-hidden="true" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={STEPS[step].key}
                  className="absolute inset-0 flex items-center justify-center p-10"
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.02, y: -12 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <StoryVisual which={STEPS[step].key} posters={posters} large />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoryStep({ index, step, active, onActive, children }) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  const onActiveRef = useRef(onActive);
  onActiveRef.current = onActive;
  useEffect(() => {
    if (inView) onActiveRef.current();
  }, [inView]);

  return (
    <li ref={ref} className={`card p-6 transition duration-500 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none ${active ? "lg:opacity-100" : "lg:opacity-35"}`}>
      <span
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl font-display text-lg font-bold transition ${
          active ? "bg-brand-gradient text-on-brand shadow-glow" : "bg-white/[0.06] text-gray-300"
        }`}
      >
        {index + 1}
      </span>
      <h3 className="font-display text-2xl font-bold text-white lg:text-4xl">{step.title}</h3>
      <p className="mt-2 max-w-md text-base leading-relaxed text-gray-400 lg:text-lg">{step.text}</p>
      {children}
    </li>
  );
}

function StoryVisual({ which, posters, large = false }) {
  if (which === "pick") {
    return (
      <div className={`relative mx-auto flex items-end justify-center ${large ? "h-72 w-full" : "h-48 w-full"}`} aria-hidden="true">
        {posters.length === 0 && <Icon name="film" className="h-16 w-16 text-brand-300" />}
        {posters.map((m, i) => {
          const offset = i - (posters.length - 1) / 2;
          return (
            <div
              key={m._id}
              className={`absolute bottom-0 overflow-hidden rounded-xl border border-white/15 shadow-2xl ${large ? "w-40" : "w-28"}`}
              style={{
                transform: `translateX(${offset * (large ? 120 : 80)}px) rotate(${offset * 8}deg) translateY(${Math.abs(offset) * 14}px)`,
                zIndex: 10 - Math.abs(offset),
              }}
            >
              <Poster src={m.poster} alt="" className="aspect-[2/3] w-full" />
            </div>
          );
        })}
      </div>
    );
  }
  if (which === "seat") {
    const rows = ["A", "B", "C", "D", "E"];
    const picked = new Set(["C4", "C5"]);
    const booked = new Set(["A2", "A3", "B6", "D1", "D2", "E5", "E6"]);
    return (
      <div className="mx-auto w-full max-w-sm" aria-hidden="true">
        <div className="mx-auto mb-6 h-2 w-4/5 rounded-full bg-gradient-to-r from-transparent via-white/70 to-transparent shadow-[0_8px_30px_rgb(var(--brand-300)/0.6)]" />
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r} className="flex justify-center gap-1.5">
              {Array.from({ length: 8 }, (_, i) => {
                const id = `${r}${i + 1}`;
                const cls = picked.has(id)
                  ? "border-brand-400 bg-brand-500 shadow-glow"
                  : booked.has(id)
                  ? "border-transparent bg-white/[0.08]"
                  : "border-white/25 bg-white/[0.03]";
                return <span key={id} className={`h-6 w-6 rounded-t-md rounded-b-[3px] border ${i === 3 ? "mr-3" : ""} ${cls}`} />;
              })}
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-gray-400">Illustration · seats C4 and C5 selected</p>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-xs" aria-hidden="true">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-ink-850 shadow-2xl">
        <div className="bg-brand-gradient px-5 py-4 text-on-brand">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Admit</p>
          <p className="font-display text-xl font-bold">{posters[0]?.title || "Your movie"}</p>
        </div>
        <div className="flex items-center gap-4 px-5 py-5">
          <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-white text-ink-950">
            <Icon name="qr" className="h-14 w-14" />
          </span>
          <div className="space-y-1 text-xs text-gray-400">
            <p>
              Seats <span className="font-semibold text-white">C4, C5</span>
            </p>
            <p>Show this at the door</p>
          </div>
        </div>
        <div className="border-t border-dashed border-white/15 px-5 py-3 text-[11px] text-gray-500">Example ticket</div>
      </div>
    </div>
  );
}

/* ───────────────────────── Showtime discovery ───────────────────────── */

const dayKey = (show) => String(show.date || "").slice(0, 10);

function dayLabel(key) {
  const d = getShowDateTime({ date: key, time: "00:00" });
  if (!d) return key;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return formatShowDate(key, { weekday: "short", day: "numeric", month: "short" });
}

function ShowtimeDiscovery({ shows, movies, loading }) {
  const movieById = useMemo(() => new Map(movies.map((m) => [String(m._id), m])), [movies]);
  const sorted = useMemo(
    () => [...shows].sort((a, b) => (getShowDateTime(a)?.getTime() || 0) - (getShowDateTime(b)?.getTime() || 0)),
    [shows]
  );
  const days = useMemo(() => [...new Set(sorted.map(dayKey))].slice(0, 6), [sorted]);
  const [day, setDay] = useState(null);
  const activeDay = day && days.includes(day) ? day : days[0];

  const cinemas = useMemo(() => {
    const map = new Map();
    sorted
      .filter((s) => dayKey(s) === activeDay)
      .forEach((s) => {
        const name = s.theatre || "CineBook cinema";
        if (!map.has(name)) map.set(name, new Map());
        const byMovie = map.get(name);
        if (!byMovie.has(s.movieId)) byMovie.set(s.movieId, []);
        byMovie.get(s.movieId).push(s);
      });
    return [...map.entries()].slice(0, 6);
  }, [sorted, activeDay]);

  if (loading && shows.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-20" aria-labelledby="showtimes-title">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-brand-500/[0.05] to-transparent" aria-hidden="true" />
      <div className="container-page relative">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1.5">Showtimes</p>
            <h2 id="showtimes-title" className="section-title">
              What's on at your cinema
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-gray-400">Pick a time to go straight to the seat map.</p>
          </div>
        </Reveal>

        {days.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No upcoming showtimes yet"
            message="New showtimes appear here as soon as the cinema schedules them."
            action={
              <Link to="/movies" className="btn-secondary">
                Browse movies
              </Link>
            }
          />
        ) : (
          <>
            <div className="scroll-row -mx-4 mb-6 px-4 sm:mx-0 sm:px-0" role="group" aria-label="Choose a day">
              {days.map((d) => (
                <button key={d} onClick={() => setDay(d)} aria-pressed={d === activeDay} className={`chip ${d === activeDay ? "chip-active" : ""}`}>
                  {dayLabel(d)}
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {cinemas.map(([name, byMovie], ci) => (
                <Reveal key={`${activeDay}-${name}`} delay={Math.min(ci, 3) * 0.06} className="card p-5">
                  <h3 className="flex items-center gap-2 text-base font-bold text-white">
                    <Icon name="pin" className="h-4 w-4 text-brand-400" />
                    {name}
                  </h3>
                  <ul className="mt-4 space-y-4">
                    {[...byMovie.entries()].slice(0, 3).map(([movieId, list]) => {
                      const movie = movieById.get(movieId);
                      if (!movie) return null;
                      return (
                        <li key={movieId} className="flex gap-3">
                          <Link to={`/movies/${movie._id}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
                            <Poster src={movie.poster} alt="" className="h-[72px] w-12 rounded-lg" />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link to={`/movies/${movie._id}`} className="block truncate text-sm font-semibold text-white transition hover:text-brand-300">
                              {movie.title}
                            </Link>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {list.slice(0, 5).map((show) => (
                                <Link
                                  key={show._id}
                                  to={`/seats/${show._id}`}
                                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-gray-200 transition hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-500/15 hover:text-white"
                                  aria-label={`${movie.title} at ${name}, ${dayLabel(activeDay)} ${formatShowTime(show.time)}`}
                                >
                                  {formatShowTime(show.time)}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Reveal>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── Features ───────────────────────── */

const FEATURES = [
  {
    icon: "grid",
    title: "Pick your exact seats",
    text: "See the live seat map for every show, or walk the auditorium in 3D, before you book.",
    to: "/movies",
    cta: "Browse movies",
  },
  {
    icon: "popcorn",
    title: "Snacks without the queue",
    text: "Add popcorn, drinks and parking to your booking, or order food on its own.",
    to: "/snacks",
    cta: "See the menu",
  },
  {
    icon: "qr",
    title: "Tickets on your phone",
    text: "Every booking comes with a QR ticket you can show at the gate or download as a PDF.",
    to: "/my-bookings",
    cta: "My bookings",
  },
];

function FeatureCard({ icon, title, text, to, cta }) {
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div className="card group relative flex h-full flex-col overflow-hidden p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-500/30" onPointerMove={onMove}>
      <div className="spotlight pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100" aria-hidden="true" />
      <span className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 transition group-hover:scale-110">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h3 className="relative text-lg font-bold text-white">{title}</h3>
      <p className="relative mt-1.5 flex-1 text-sm leading-relaxed text-gray-400">{text}</p>
      <Link to={to} className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 transition hover:text-brand-300">
        {cta} <Icon name="arrowRight" className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

export default Home;
