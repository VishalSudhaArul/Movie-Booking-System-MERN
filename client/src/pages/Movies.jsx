import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function Movies() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [trailerMovie, setTrailerMovie] = useState(null);
  const [activeHero, setActiveHero] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    axios
      .get(`${API_URL}/api/movies`)
      .then((res) => {
        setMovies(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [API_URL]);

  /* ================= AUTO HERO ROTATION ================= */
  useEffect(() => {
    if (!movies.length) return;
    const interval = setInterval(() => {
      setActiveHero((prev) => (prev + 1) % Math.min(movies.length, 5));
    }, 8000);
    return () => clearInterval(interval);
  }, [movies]);

  /* ================= GENRES ================= */
  const genres = useMemo(() => {
    const unique = ["All", ...new Set(movies.map((m) => m.genre))];
    return unique;
  }, [movies]);

  /* ================= FILTER LOGIC ================= */
  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const matchSearch = movie.title.toLowerCase().includes(search.toLowerCase());
      const matchGenre = selectedGenre === "All" || movie.genre === selectedGenre;
      return matchSearch && matchGenre;
    });
  }, [movies, search, selectedGenre]);

  if (loading) {
    return (
      <div className="bg-[#050507] min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="bg-[#050507] text-white min-h-screen selection:bg-red-600/30">
      {/* ================= HERO SECTION ================= */}
      <section className="relative h-[95vh] w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {movies[activeHero] && (
            <motion.div
              key={activeHero}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0"
            >
              <motion.img
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 10, ease: "linear" }}
                src={movies[activeHero].poster}
                alt="Hero Background"
                className="w-full h-full object-cover brightness-[0.4]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-[#050507]/40" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050507] via-[#050507]/60 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-24 max-w-5xl">
          <AnimatePresence mode="wait">
            {movies[activeHero] && (
              <motion.div
                key={`content-${activeHero}`}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 30, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-widest">
                    Hot Pick
                  </span>
                  <span className="text-gray-300 text-sm font-medium tracking-wide">
                    {movies[activeHero].genre}
                  </span>
                </div>

                <h1 className="text-6xl md:text-8xl font-black mb-6 leading-none tracking-tighter">
                  {movies[activeHero].title}
                </h1>

                <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed font-light">
                  {movies[activeHero].description ||
                    "An epic journey awaits in this cinematic masterpiece. Experience the thrill, the emotion, and the action on the big screen."}
                </p>

                <div className="flex flex-wrap gap-5">
                  <button
                    onClick={() => navigate(`/movies/${movies[activeHero]._id}`)}
                    className="group relative px-10 py-4 bg-red-600 text-white font-bold rounded-full overflow-hidden transition-all hover:pr-14"
                  >
                    <span className="relative z-10">BOOK TICKETS</span>
                    <span className="absolute right-6 opacity-0 group-hover:opacity-100 transition-all">
                      →
                    </span>
                  </button>

                  {movies[activeHero].trailerUrl && (
                    <button
                      onClick={() => setTrailerMovie(movies[activeHero])}
                      className="px-10 py-4 border border-white/20 bg-white/5 backdrop-blur-md rounded-full font-bold hover:bg-white/10 transition"
                    >
                      WATCH TRAILER
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hero Slider Dots */}
        <div className="absolute bottom-12 right-24 z-20 flex gap-3">
          {movies.slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveHero(i)}
              className={`h-1.5 transition-all duration-500 rounded-full ${
                activeHero === i ? "w-12 bg-red-600" : "w-3 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      </section>

      {/* ================= MAIN CONTENT ================= */}
      <div className="relative z-20 px-6 md:px-24 -mt-32 pb-32">
        {/* Filter Bar */}
        <div className="mb-20">
          <div className="flex flex-col md:flex-row gap-8 items-end justify-between bg-[#111115]/80 backdrop-blur-2xl p-8 rounded-3xl border border-white/5 shadow-2xl">
            <div className="w-full md:w-1/3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-3 block">
                Search Universe
              </label>
              <input
                type="text"
                placeholder="Find a movie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border-b border-white/10 py-3 outline-none focus:border-red-600 transition text-xl font-light placeholder:text-gray-700"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`px-6 py-2 rounded-full text-xs font-bold tracking-widest transition-all ${
                    selectedGenre === g
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                      : "bg-white/5 border border-white/10 text-gray-400 hover:border-red-600 hover:text-white"
                  }`}
                >
                  {g.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Movie Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-16"
        >
          <AnimatePresence>
            {filteredMovies.map((movie, index) => (
              <motion.div
                key={movie._id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="group relative"
              >
                <div
                  onClick={() => navigate(`/movies/${movie._id}`)}
                  className="relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#1a1a1f] shadow-2xl shadow-black"
                >
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                    <button className="w-full py-3 bg-red-600 text-white font-bold rounded-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      QUICK BOOK
                    </button>
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                    <span className="text-yellow-500 text-xs">★</span>
                    <span className="text-white text-[10px] font-bold">
                      {movie.rating || "8.5"}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-bold truncate tracking-tight mb-1 group-hover:text-red-500 transition-colors">
                    {movie.title}
                  </h3>
                  <div className="flex items-center justify-between text-gray-500 text-[10px] font-bold tracking-[0.1em] uppercase">
                    <span>{movie.genre}</span>
                    <span>{movie.duration || "2h 15m"}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredMovies.length === 0 && (
          <div className="py-40 text-center">
            <span className="text-8xl mb-8 block">🎬</span>
            <h2 className="text-3xl font-light text-gray-600">No movies match your search.</h2>
          </div>
        )}
      </div>

      {/* ================= TRAILER MODAL ================= */}
      <AnimatePresence>
        {trailerMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              <button
                onClick={() => setTrailerMovie(null)}
                className="absolute top-6 right-6 z-10 w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-red-600 rounded-full transition-colors text-xl"
              >
                ✕
              </button>
              <iframe
                src={trailerMovie.trailerUrl}
                title={trailerMovie.title}
                className="w-full h-full"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Movies;
