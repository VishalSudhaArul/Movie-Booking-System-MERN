// import { useEffect, useState } from "react";
// import axios from "axios";
// import { useParams, Link } from "react-router-dom";

// function MovieDetails() {

//   const { movieId } = useParams();
//   const [shows, setShows] = useState([]);

//   useEffect(() => {

//     axios
//       .get(`http://localhost:5000/api/shows/movie/${movieId}`)
//       .then(res => setShows(res.data))
//       .catch(err => console.log(err));

//   }, [movieId]);

//   return (
//     <div className="bg-black min-h-screen text-white p-10">

//       <h1 className="text-3xl font-bold mb-8 text-center">
//         Available Shows
//       </h1>

//       {shows.length === 0 && (
//         <p className="text-center text-gray-400">
//           No shows available
//         </p>
//       )}

//       {shows.map(show => (
//         <div
//           key={show._id}
//           className="bg-gray-900 p-6 rounded mb-4 max-w-xl mx-auto"
//         >
//           <p><span className="text-gray-400">Theatre:</span> {show.theatre}</p>
//           <p><span className="text-gray-400">Date:</span> {show.date}</p>
//           <p><span className="text-gray-400">Time:</span> {show.time}</p>

//           {/* ✅ Correct Route */}
//           <Link to={`/seats/${show._id}`}>
//             <button className="bg-red-600 px-4 py-2 mt-3 rounded hover:bg-red-700">
//               Book Tickets
//             </button>
//           </Link>

//         </div>
//       ))}

//     </div>
//   );
// }

// export default MovieDetails;





import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";

function MovieDetails() {

  const { movieId } = useParams();

  const [shows, setShows] = useState([]);
  const [movie, setMovie] = useState(null);

  useEffect(() => {

    // 🎬 Get movie info
    axios.get(`http://localhost:5000/api/movies/${movieId}`)
      .then(res => setMovie(res.data));

    // 🎭 Get shows
    axios.get(`http://localhost:5000/api/shows/movie/${movieId}`)
      .then(res => setShows(res.data));

  }, [movieId]);

  if (!movie) return <p>Loading...</p>;

  return (
    <div className="bg-black min-h-screen text-white p-10">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* 🎬 Poster LEFT */}
        <div className="flex justify-center">
          <img
            src={movie.poster}
            alt={movie.title}
            className="rounded-xl shadow-lg max-h-[500px]"
          />
        </div>

        {/* 🎭 Shows RIGHT */}
        <div>

          <h1 className="text-3xl font-bold mb-6">
            Available Shows
          </h1>

          <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">

            {shows.length === 0 && (
              <p className="text-gray-400">
                No shows available
              </p>
            )}

            {shows.map(show => (
  <div
    key={show._id}
    className="bg-gray-900 p-6 rounded mb-4 max-w-xl mx-auto"
  >
    <p>
      <span className="text-gray-400">Theatre:</span> {show.theatre}
    </p>

    <p>
      <span className="text-gray-400">Date:</span> {show.date}
    </p>

    <p>
      <span className="text-gray-400">Time:</span> {show.time}
    </p>

    <Link to={`/seats/${show._id}`}>
      <button className="bg-red-600 px-4 py-2 mt-3 rounded hover:bg-red-700">
        Book Tickets
      </button>
    </Link>

  </div>
))}


          </div>

        </div>

      </div>

    </div>
  );
}

export default MovieDetails;
