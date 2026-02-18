// import { useEffect, useState } from "react";
// import axios from "axios";
// import { Link, useNavigate } from "react-router-dom";

// function Home() {

//   const [movies, setMovies] = useState([]);
//   const navigate = useNavigate();

//   useEffect(() => {
//     axios.get("http://localhost:5000/api/movies")
//       .then(res => setMovies(res.data))
//       .catch(err => console.log(err));
//   }, []);

//   return (
//     <div className="bg-black min-h-screen text-white px-12 py-10">

//       {/* Header Section */}
//       <div className="flex justify-between items-center mb-8">

//         <h1 className="text-3xl font-bold">
//           Now Showing
//         </h1>

//         {/* View All Button */}
//         <button
//           onClick={() => navigate("/movies")}
//           className="text-red-400 hover:text-red-500 transition"
//         >
//           View All →
//         </button>

//       </div>

//       {/* Movies Grid */}
//       <div className="grid grid-cols-5 gap-8">

//         {/* ⭐ Showing Only First 4 Movies */}
//         {movies.slice(0, 5).map(movie => (
//           <div
//             key={movie._id}
//             className="bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:scale-105 transition duration-300"
//           >

//             {/* Poster */}
//             <img
//               src={movie.poster}
//               alt={movie.title}
//               className="w-full h-72 "
//             />

//             {/* Movie Info */}
//             <div className="p-4">

//               <h3 className="text-xl font-semibold">
//                 {movie.title}
//               </h3>

//               <p className="text-gray-400">
//                 {movie.genre}
//               </p>

//               {/* View Shows Button */}
//               {/* <Link to={`/movie/${movie._id}`}> */}
//               {/* <Link to={`/shows/${movie._id}`}> */}
//               <Link to={`/movie/${movie._id}`}>
//                 <button className="bg-red-600 px-4 py-2 mt-4 rounded hover:bg-red-700 w-full">
//                   View Shows
//                 </button>
//               </Link>

//             </div>

//           </div>
//         ))}

//       </div>

//       {/* ⭐ Show More Button (Center Bottom) */}
//       {movies.length > 4 && (
//         <div className="flex justify-center mt-12">
//           <button
//             onClick={() => navigate("/movies")}
//             className="bg-red-500 px-8 py-3 rounded-lg hover:bg-red-600 transition"
//           >
//             Show More
//           </button>
//         </div>
//       )}

//     </div>
//   );
// }

// export default Home;







// import { useEffect, useState } from "react";
// import axios from "axios";
// import { Link } from "react-router-dom";

// function Home() {
//   const [movies, setMovies] = useState([]);

//   useEffect(() => {
//     axios
//       .get("http://localhost:5000/api/movies")
//       .then((res) => setMovies(res.data))
//       .catch((err) => console.log(err));
//   }, []);

//   return (
//     <div className="relative bg-black min-h-screen text-white overflow-hidden">

//       {/* ================= BACKGROUND GLOW ================= */}
//       <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/20 via-black to-red-900/20 blur-3xl opacity-40"></div>

//       <div className="relative z-10 px-8 md:px-20 py-16">

//         {/* ================= HERO SECTION ================= */}
//         <div className="mb-24">
//           <h1 className="text-5xl md:text-7xl font-extrabold leading-tight bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
//             Experience Cinema
//           </h1>

//           <p className="mt-6 text-gray-400 text-lg max-w-2xl">
//             Discover, explore and book immersive cinematic journeys with
//             cutting-edge seat selection and real-time availability.
//           </p>

//           <div className="mt-10 flex gap-6">
//             <Link
//               to="/movies"
//               className="px-8 py-3 bg-red-600 rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-600/30"
//             >
//               Explore Movies
//             </Link>

//             <Link
//               to="/mybookings"
//               className="px-8 py-3 border border-gray-700 rounded-xl hover:border-red-500 transition"
//             >
//               My Bookings
//             </Link>
//           </div>
//         </div>

//         {/* ================= FLOATING STATS ================= */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-28">

//           {[
//             { label: "Total Movies", value: movies.length },
//             { label: "Active Shows", value: movies.length * 3 },
//             { label: "Bookings Today", value: movies.length * 12 }
//           ].map((item, index) => (
//             <div
//               key={index}
//               className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-red-500 transition duration-300 shadow-xl"
//             >
//               <h2 className="text-4xl font-bold text-red-500">
//                 {item.value}
//               </h2>
//               <p className="text-gray-400 mt-2">{item.label}</p>
//             </div>
//           ))}
//         </div>

//         {/* ================= DISCOVER SECTION ================= */}
//         <h2 className="text-3xl font-semibold mb-10">
//           Discover Experiences
//         </h2>

//         <div className="flex gap-8 overflow-x-auto pb-10">

//           {movies.slice(0, 8).map((movie) => (
//             <Link
//               key={movie._id}
//               to={`/movie/${movie._id}`}
//               className="min-w-[250px] group relative"
//             >
//               <div className="rounded-2xl overflow-hidden border border-white/10 hover:border-red-500 transition duration-300">

//                 <img
//                   src={movie.poster}
//                   alt={movie.title}
//                   className="w-full h-80 object-cover group-hover:scale-110 transition duration-500"
//                 />

//               </div>

//               <div className="mt-4">
//                 <h3 className="text-lg font-semibold">
//                   {movie.title}
//                 </h3>
//                 <p className="text-gray-500 text-sm">
//                   {movie.genre}
//                 </p>
//               </div>
//             </Link>
//           ))}

//         </div>

//         {/* ================= FEATURE SPOTLIGHT ================= */}
//         {movies[0] && (
//           <div className="mt-32 grid md:grid-cols-2 gap-16 items-center">

//             <div>
//               <h2 className="text-4xl font-bold mb-6">
//                 Featured Spotlight
//               </h2>
//               <h3 className="text-2xl text-red-500 mb-4">
//                 {movies[0].title}
//               </h3>
//               <p className="text-gray-400 mb-8">
//                 {movies[0].genre}
//               </p>

//               <Link
//                 to={`/movie/${movies[0]._id}`}
//                 className="px-8 py-3 bg-red-600 rounded-xl hover:bg-red-700 transition shadow-lg"
//               >
//                 Book Now
//               </Link>
//             </div>

//             <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
//               <img
//                 src={movies[0].poster}
//                 alt={movies[0].title}
//                 className="w-full h-[450px] object-cover"
//               />
//             </div>

//           </div>
//         )}

//       </div>
//     </div>
//   );
// }

// export default Home;





import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function Home() {
  const [movies, setMovies] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState("All");

  // Get logged-in user safely
  const user = JSON.parse(localStorage.getItem("user"));

  // useEffect(() => {
  //   axios
  //     .get("http://localhost:5000/api/movies")
  //     .then((res) => setMovies(res.data))
  //     .catch((err) => console.log(err));
  // }, []);

  useEffect(() => {

  const API_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  axios
    .get(`${API_URL}/api/movies`)
    .then((res) => setMovies(res.data))
    .catch((err) => console.log("Home fetch error:", err));

}, []);


  // Genre filtering logic
  const filteredMovies =
    selectedGenre === "All"
      ? movies
      : movies.filter((movie) =>
          movie.genre?.toLowerCase().includes(selectedGenre.toLowerCase())
        );

  return (
    <div className="relative min-h-screen text-white bg-[#0B0B0F] overflow-hidden">

      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-red-900/30 to-transparent"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-900/20 blur-[160px] rounded-full"></div>

      <div className="relative z-10 px-6 md:px-24">

        {/* ================= HERO ================= */}
        <section className="min-h-[75vh] flex flex-col justify-center items-center text-center">

          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
              Experience
            </span>{" "}
            <span className="text-white">Cinema</span>
          </h1>

          <p className="mt-6 text-gray-400 text-lg max-w-2xl">
            Discover immersive cinematic journeys with seamless seat booking
            and premium theatre experiences.
          </p>

          {/* Welcome User */}
          {user && (
            <p className="mt-4 text-green-400 text-lg font-medium">
              Welcome, {user.name}
            </p>
          )}

          <div className="mt-10 flex gap-6">
            <Link
              to="/movies"
              className="px-10 py-4 bg-red-600 rounded-2xl hover:bg-red-700 transition shadow-xl shadow-red-600/40"
            >
              Explore Movies
            </Link>

            <Link
              to="/mybookings"
              className="px-10 py-4 border border-white/20 rounded-2xl hover:border-red-500 transition"
            >
              My Bookings
            </Link>
          </div>
        </section>

        {/* ================= STATS ================= */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-32">

          {[
            { label: "Movies Live", value: movies.length },
            { label: "Active Shows", value: movies.length * 3 },
            { label: "Tickets Booked", value: movies.length * 12 }
          ].map((item, index) => (
            <div
              key={index}
              className="bg-[#111118] border border-white/10 rounded-3xl p-10 hover:border-red-500 transition duration-300 shadow-xl"
            >
              <h2 className="text-5xl font-bold text-red-500">
                {item.value}
              </h2>
              <p className="text-gray-400 mt-3 uppercase tracking-widest text-sm">
                {item.label}
              </p>
            </div>
          ))}
        </section>

        {/* ================= DISCOVER EXPERIENCES ================= */}
        <section className="mb-36">
          <h2 className="text-3xl font-semibold mb-12 tracking-wide">
            Discover Experiences
          </h2>

          <div className="flex gap-10 overflow-x-auto pb-6">

            {movies.slice(0, 7).map((movie) => (
              <Link
                key={movie._id}
                to={`/movie/${movie._id}`}
                className="min-w-[300px] group"
              >
                <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 hover:border-red-500 transition duration-300">
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-[450px] object-cover group-hover:scale-110 transition duration-500"
                  />
                </div>

                <div className="mt-5">
                  <h3 className="text-lg font-semibold tracking-wide">
                    {movie.title}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {movie.genre}
                  </p>
                </div>
              </Link>
            ))}

          </div>
        </section>

        {/* ================= GENRE EXPLORER ================= */}
        <section className="mb-36">

          <h2 className="text-3xl font-semibold mb-8 tracking-wide">
            Explore by Genre
          </h2>

          <div className="flex flex-wrap gap-4 mb-12">

            {["All", "Action", "Drama", "Thriller", "Fantasy", "Comedy"].map(
              (genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-6 py-2 rounded-full text-sm transition ${
                    selectedGenre === genre
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/40"
                      : "border border-white/20 hover:border-red-500 hover:text-red-500"
                  }`}
                >
                  {genre}
                </button>
              )
            )}

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">

            {filteredMovies.slice(0, 6).map((movie) => (
              <Link
                key={movie._id}
                to={`/movie/${movie._id}`}
                className="bg-[#111118] border border-white/10 rounded-3xl overflow-hidden hover:border-red-500 transition"
              >
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-64 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-lg font-semibold">
                    {movie.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {movie.genre}
                  </p>
                </div>
              </Link>
            ))}

          </div>

        </section>

        {/* ================= NOW STREAMING ================= */}
        <section className="mb-40">

          <h2 className="text-3xl font-semibold mb-12 tracking-wide">
            Now Streaming This Week
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

            {movies.slice(0, 2).map((movie) => (
              <Link
                key={movie._id}
                to={`/movie/${movie._id}`}
                className="relative rounded-3xl overflow-hidden group"
              >
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-[400px] object-cover group-hover:scale-105 transition duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex items-end p-8">
                  <div>
                    <h3 className="text-2xl font-bold">
                      {movie.title}
                    </h3>
                    <p className="text-gray-300">
                      {movie.genre}
                    </p>
                  </div>
                </div>

              </Link>
            ))}

          </div>

        </section>

        {/* ================= WHY QUICKSHOW ================= */}
        <section className="mb-40">

          <h2 className="text-3xl font-semibold mb-12 tracking-wide text-center">
            Why Choose QuickShow
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            {[
              {
                title: "Real-Time Booking",
                desc: "Live seat availability with instant confirmation."
              },
              {
                title: "Secure Payments",
                desc: "Safe and encrypted transactions for worry-free booking."
              },
              {
                title: "Smart Discovery",
                desc: "Find trending and popular movies instantly."
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-[#111118] border border-white/10 rounded-3xl p-10 hover:border-red-500 transition duration-300"
              >
                <h3 className="text-xl font-semibold mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-400">
                  {feature.desc}
                </p>
              </div>
            ))}

          </div>

        </section>

      </div>
    </div>
  );
}

export default Home;
