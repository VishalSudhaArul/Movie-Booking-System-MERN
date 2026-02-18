// import { useEffect, useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import { motion, AnimatePresence } from "framer-motion";

// function Movies() {
//   const [movies, setMovies] = useState([]);
//   const [search, setSearch] = useState("");
//   const [selectedGenre, setSelectedGenre] = useState("All");
//   const [trailerMovie, setTrailerMovie] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [heroIndex, setHeroIndex] = useState(0);
//   const navigate = useNavigate();

//   /* ================= FETCH MOVIES ================= */
//   useEffect(() => {
//     axios.get("http://localhost:5000/api/movies")
//       .then(res => {
//         setMovies(res.data);
//         setLoading(false);
//       });
//   }, []);

//   /* ================= AUTO HERO SLIDER ================= */
//   useEffect(() => {
//     if (!movies.length) return;
//     const interval = setInterval(() => {
//       setHeroIndex(prev => (prev + 1) % movies.length);
//     }, 5000);
//     return () => clearInterval(interval);
//   }, [movies]);

//   /* ================= GENRES ================= */
//   const dynamicGenres = [
//     "All",
//     ...new Set(movies.map(m => m.genre))
//   ];

//   /* ================= FILTER ================= */
//   const filteredMovies = movies.filter(movie => {
//     const matchSearch = movie.title.toLowerCase().includes(search.toLowerCase());
//     const matchGenre =
//       selectedGenre === "All" ||
//       movie.genre?.toLowerCase().includes(selectedGenre.toLowerCase());

//     return matchSearch && matchGenre;
//   });

//   /* ================= LOADING UI ================= */
//   if (loading) {
//     return (
//       <div className="bg-black min-h-screen flex items-center justify-center text-white">
//         <div className="animate-pulse text-2xl">Loading Movies...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-[#0c0c0f] min-h-screen text-white">

//       {/* ================= NAVBAR ================= */}
//       <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/10">
//         <div className="flex justify-between items-center px-10 py-4">
//           <h1 className="text-2xl font-bold text-red-600 tracking-wider">
//             QuickShow
//           </h1>

//           <div className="flex gap-8 text-gray-300">
//             <span className="hover:text-white cursor-pointer transition">Home</span>
//             <span className="text-white font-semibold">Movies</span>
//             <span className="hover:text-white cursor-pointer transition">Bookings</span>
//           </div>

//           <div className="bg-red-600 w-10 h-10 flex items-center justify-center rounded-full font-bold">
//             V
//           </div>
//         </div>
//       </div>

//       {/* ================= HERO SLIDER ================= */}
//       {movies[heroIndex] && (
//         <motion.div
//           key={heroIndex}
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ duration: 1 }}
//           className="relative h-[85vh] overflow-hidden"
//         >
//           <img
//             src={movies[heroIndex].poster}
//             alt="hero"
//             className="absolute w-full h-full object-cover scale-110 brightness-50"
//           />

//           <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent"></div>

//           <div className="relative z-10 h-full flex flex-col justify-center px-10 md:px-20 max-w-4xl">

//             <span className="bg-red-600/20 text-red-500 px-4 py-1 rounded-full text-sm mb-6 w-fit border border-red-600/30">
//               {movies[heroIndex].genre}
//             </span>

//             <h1 className="text-6xl font-extrabold mb-4">
//               {movies[heroIndex].title}
//             </h1>

//             <div className="flex gap-6 text-gray-400 mb-6">
//               <span>⭐ {movies[heroIndex].rating || "8.5"}</span>
//               <span>⏱ {movies[heroIndex].duration || "2h 20m"}</span>
//               <span>📅 {movies[heroIndex].releaseYear || "2026"}</span>
//             </div>

//             <p className="text-gray-300 mb-6 max-w-xl">
//               {movies[heroIndex].description ||
//                 "Experience cinematic brilliance with immersive storytelling and stunning visuals."}
//             </p>

//             <div className="flex gap-4">
//               <button
//                 onClick={() => navigate(`/movie/${movies[heroIndex]._id}`)}
//                 className="bg-red-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-red-700 transition shadow-lg shadow-red-600/40"
//               >
//                 🎟 Book Now
//               </button>

//               <button
//                 onClick={() => setTrailerMovie(movies[heroIndex])}
//                 className="bg-white/10 backdrop-blur-md px-8 py-3 rounded-lg hover:bg-white/20 transition"
//               >
//                 ▶ Watch Trailer
//               </button>
//             </div>
//           </div>
//         </motion.div>
//       )}

//       {/* ================= SEARCH & FILTER ================= */}
//       <div className="px-10 md:px-20 py-12">
//         <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">

//           <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
//             <input
//               type="text"
//               placeholder="Search movies..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="w-full md:w-1/3 bg-[#1a1a1f] p-3 rounded-lg outline-none focus:ring-2 focus:ring-red-600"
//             />

//             <div className="flex gap-3 flex-wrap">
//               {dynamicGenres.map(g => (
//                 <button
//                   key={g}
//                   onClick={() => setSelectedGenre(g)}
//                   className={`px-4 py-2 rounded-full text-sm transition ${
//                     selectedGenre === g
//                       ? "bg-red-600 text-white"
//                       : "bg-[#1c1c1c] text-gray-300 hover:bg-red-600"
//                   }`}
//                 >
//                   {g}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ================= MOVIE GRID ================= */}
//       <div className="px-10 md:px-20 pb-20 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">

//         {filteredMovies.length === 0 && (
//           <div className="col-span-full text-center text-gray-400 text-xl">
//             No movies found 🎬
//           </div>
//         )}

//         {filteredMovies.map((movie, index) => (
//           <motion.div
//             key={movie._id}
//             initial={{ opacity: 0, y: 40 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             transition={{ delay: index * 0.1 }}
//             whileHover={{ scale: 1.05 }}
//             className="relative rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
//           >
//             <img
//               src={movie.poster}
//               alt="poster"
//               className="w-full h-[420px] object-cover"
//             />

//             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>

//             <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 text-xs rounded-full">
//               ⭐ {movie.rating || "8.5"}
//             </div>

//             <div className="absolute bottom-0 p-5 w-full">
//               <h2 className="text-xl font-semibold mb-1">
//                 {movie.title}
//               </h2>

//               <p className="text-gray-400 text-sm mb-3">
//                 {movie.genre}
//               </p>

//               <button
//                 onClick={() => navigate(`/movie/${movie._id}`)}
//                 className="w-full bg-red-600 py-2 rounded-lg hover:bg-red-700 transition"
//               >
//                 View Shows
//               </button>
//             </div>
//           </motion.div>
//         ))}
//       </div>

//       {/* ================= TRAILER MODAL ================= */}
//       <AnimatePresence>
//         {trailerMovie && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50"
//           >
//             <motion.div
//               initial={{ scale: 0.8 }}
//               animate={{ scale: 1 }}
//               exit={{ scale: 0.8 }}
//               className="bg-[#111] p-6 rounded-2xl w-[90%] md:w-[60%]"
//             >
//               <div className="flex justify-between mb-4">
//                 <h2 className="text-2xl font-bold">{trailerMovie.title}</h2>
//                 <button
//                   onClick={() => setTrailerMovie(null)}
//                   className="text-gray-400 hover:text-white"
//                 >
//                   ✕
//                 </button>
//               </div>

//               <div className="aspect-video">
//                 <iframe
//                   width="100%"
//                   height="100%"
//                   src={trailerMovie.trailerUrl}
//                   title="Trailer"
//                   allowFullScreen
//                   className="rounded-lg"
//                 ></iframe>
//               </div>

//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//     </div>
//   );
// }

// export default Movies;







import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function Movies() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [trailerMovie, setTrailerMovie] = useState(null);
  const [activeHero, setActiveHero] = useState(0);
  const navigate = useNavigate();

  /* ================= FETCH MOVIES ================= */
  // useEffect(() => {
  //   axios.get("http://localhost:5000/api/movies")
  //     .then(res => setMovies(res.data))
  //     .catch(err => console.log(err));
  // }, []);
  useEffect(() => {
  const API_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  axios
    .get(`${API_URL}/api/movies`)
    .then(res => setMovies(res.data))
    .catch(err => console.log(err));
}, []);


  /* ================= AUTO HERO ROTATION ================= */
  useEffect(() => {
    if (!movies.length) return;
    const interval = setInterval(() => {
      setActiveHero(prev => (prev + 1) % movies.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [movies]);

  /* ================= FILTER ================= */
  const filteredMovies = useMemo(() => {
    return movies.filter(movie =>
      movie.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [movies, search]);

  const trending = movies.slice(0, 10);
  const recommended = movies.slice(2, 14);

  return (
    <div className="bg-[#0b0b10] text-white min-h-screen overflow-x-hidden">

      {/* ================= NAVBAR ================= */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/10">
        <div className="flex justify-between items-center px-16 py-5">
          {/* <h1 className="text-2xl font-bold tracking-wider text-red-600">
            QuickShow
          </h1> */}

          {/* <div className="flex gap-10 text-gray-300">
            <span className="hover:text-white cursor-pointer">Home</span>
            <span className="text-white font-semibold">Movies</span>
            <span className="hover:text-white cursor-pointer">Bookings</span>
          </div> */}

          {/* <div className="bg-red-600 w-10 h-10 rounded-full flex items-center justify-center font-bold">
            V
          </div> */}
        </div>
      </div>

      {/* ================= CINEMATIC HERO ================= */}
      {movies[activeHero] && (
        <motion.section
          key={activeHero}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative h-[92vh] flex items-center"
        >
          <img
            src={movies[activeHero].poster}
            alt="hero"
            className="absolute inset-0 w-full h-full object-cover scale-110 brightness-50"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />

          <div className="relative z-10 max-w-4xl px-20">
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-7xl font-extrabold mb-6 leading-tight"
            >
              {movies[activeHero].title}
            </motion.h1>

            <p className="text-gray-300 text-lg mb-10">
              {movies[activeHero].genre}
            </p>

            <div className="flex gap-6">
              <button
                onClick={() => navigate(`/movie/${movies[activeHero]._id}`)}
                className="bg-red-600 hover:bg-red-700 px-10 py-4 rounded-xl text-lg font-semibold shadow-lg transition"
              >
                🎟 Book Now
              </button>

              {movies[activeHero].trailerUrl && (
                <button
                  onClick={() => setTrailerMovie(movies[activeHero])}
                  className="bg-white/10 backdrop-blur-md px-10 py-4 rounded-xl text-lg hover:bg-white/20 transition border border-white/20"
                >
                  ▶ Watch Trailer
                </button>
              )}
            </div>
          </div>
        </motion.section>
      )}

      {/* ================= SEARCH ================= */}
      <div className="px-20 -mt-16 relative z-20">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <input
            type="text"
            placeholder="Search movies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none text-lg placeholder-gray-400"
          />
        </div>
      </div>

      {/* ================= TRENDING ROW ================= */}
      <div className="px-20 mt-24">
        <h2 className="text-3xl font-bold mb-8 tracking-wide">
          Trending Now
        </h2>

        <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-6">
          {trending.map(movie => (
            <div key={movie._id} className="min-w-[220px] group relative">

              <div className="relative rounded-2xl overflow-hidden">
                <img
                  src={movie.poster}
                  alt="poster"
                  className="h-[320px] w-full object-cover transition duration-500 group-hover:scale-110"
                />

                {/* Trailer Icon */}
                {movie.trailerUrl && (
                  <button
                    onClick={() => setTrailerMovie(movie)}
                    className="absolute top-3 right-3 bg-black/70 p-2 rounded-full hover:bg-red-600 transition"
                  >
                    ▶
                  </button>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-80" />
              </div>

              <p className="mt-3 font-semibold text-lg">
                {movie.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ================= RECOMMENDED GRID ================= */}
      <div className="px-20 mt-28 pb-28">
        <h2 className="text-3xl font-bold mb-12">
          Recommended For You
        </h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
          {recommended.map(movie => (
            <motion.div
              key={movie._id}
              whileHover={{ y: -12 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl transition"
            >
              <div className="relative">
                <img
                  src={movie.poster}
                  alt="poster"
                  className="h-[300px] w-full object-cover"
                />

                {movie.trailerUrl && (
                  <button
                    onClick={() => setTrailerMovie(movie)}
                    className="absolute top-3 right-3 bg-black/70 p-2 rounded-full hover:bg-red-600 transition"
                  >
                    ▶
                  </button>
                )}
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold">
                  {movie.title}
                </h3>

                <p className="text-gray-400 text-sm mt-2">
                  {movie.genre}
                </p>

                <button
                  onClick={() => navigate(`/movie/${movie._id}`)}
                  className="mt-4 w-full bg-red-600 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  View Shows
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ================= TRAILER MODAL ================= */}
      <AnimatePresence>
        {trailerMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              className="bg-[#111] p-8 rounded-3xl w-[90%] md:w-[65%] shadow-2xl"
            >
              <div className="flex justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {trailerMovie.title}
                </h2>
                <button
                  onClick={() => setTrailerMovie(null)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="aspect-video rounded-xl overflow-hidden">
                <iframe
                  src={trailerMovie.trailerUrl}
                  title="Trailer"
                  width="100%"
                  height="100%"
                  allowFullScreen
                ></iframe>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default Movies;
