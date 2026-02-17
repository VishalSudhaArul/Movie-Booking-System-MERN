// import { useEffect, useState } from "react";
// import axios from "axios";

// function Admin() {

//   const [movies, setMovies] = useState([]);

//   const [movie, setMovie] = useState({
//     title: "",
//     description: "",
//     duration: "",
//     poster: "",
//     genre: ""
//   });

//   const [show, setShow] = useState({
//     movieId: "",
//     theatre: "",
//     date: "",
//     time: ""
//   });

//   // 🔹 Load movies
//   useEffect(() => {
//     axios.get("http://localhost:5000/api/movies")
//       .then(res => setMovies(res.data));
//   }, []);

//   const handleMovieChange = (e) => {
//     setMovie({ ...movie, [e.target.name]: e.target.value });
//   };

//   const handleShowChange = (e) => {
//     setShow({ ...show, [e.target.name]: e.target.value });
//   };

//   const addMovie = () => {
//     axios.post("http://localhost:5000/api/movies", movie)
//       .then(() => {
//         alert("🎬 Movie Added");
//         return axios.get("http://localhost:5000/api/movies");
//       })
//       .then(res => setMovies(res.data));
//   };

//   const addShow = () => {
//     axios.post("http://localhost:5000/api/shows", show)
//       .then(() => alert("🎭 Show Added"));
//   };

//   // 🔥 DELETE MOVIE
//   const deleteMovie = (id) => {
//     axios.delete(`http://localhost:5000/api/movies/${id}`)
//       .then(() => {
//         setMovies(movies.filter(movie => movie._id !== id));
//       });
//   };

//   return (
//     <div className="bg-black min-h-screen text-white p-10">

//       <h1 className="text-3xl font-bold mb-10 text-center">
//         Admin Dashboard
//       </h1>

//       {/* ===== FORMS ===== */}
//       <div className="grid grid-cols-2 gap-10">

//         {/* 🎬 Add Movie */}
//         <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
//           <h2 className="text-xl font-semibold mb-6">Add Movie</h2>

//           <div className="space-y-4">
//             <input name="title" placeholder="Movie Title" onChange={handleMovieChange} className="w-full p-2 rounded bg-gray-800" />
//             <input name="description" placeholder="Description" onChange={handleMovieChange} className="w-full p-2 rounded bg-gray-800" />
//             <input name="duration" placeholder="Duration" onChange={handleMovieChange} className="w-full p-2 rounded bg-gray-800" />
//             <input name="poster" placeholder="Poster URL" onChange={handleMovieChange} className="w-full p-2 rounded bg-gray-800" />
//             <input name="genre" placeholder="Genre" onChange={handleMovieChange} className="w-full p-2 rounded bg-gray-800" />

//             <button onClick={addMovie} className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 w-full">
//               Add Movie
//             </button>
//           </div>
//         </div>

//         {/* 🎭 Add Show */}
//         <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
//           <h2 className="text-xl font-semibold mb-6">Add Show</h2>

//           <div className="space-y-4">
//             <select name="movieId" onChange={handleShowChange} className="w-full p-2 rounded bg-gray-800">
//               <option>Select Movie</option>
//               {movies.map(m => (
//                 <option key={m._id} value={m._id}>{m.title}</option>
//               ))}
//             </select>

//             <input name="theatre" placeholder="Theatre Name" onChange={handleShowChange} className="w-full p-2 rounded bg-gray-800" />
//             <input type="date" name="date" onChange={handleShowChange} className="w-full p-2 rounded bg-gray-800" />
//             <input name="time" placeholder="Show Time" onChange={handleShowChange} className="w-full p-2 rounded bg-gray-800" />

//             <button onClick={addShow} className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 w-full">
//               Add Show
//             </button>
//           </div>
//         </div>

//       </div>

//       {/* ===== MOVIE TABLE ===== */}
//       <div className="bg-gray-900 p-6 rounded-xl shadow-lg mt-12">
//         <h2 className="text-xl font-semibold mb-4">Movie List</h2>

//         <table className="w-full text-left">
//           <thead>
//             <tr className="border-b border-gray-700 text-gray-400">
//               <th className="p-2">Title</th>
//               <th className="p-2">Genre</th>
//               <th className="p-2">Action</th>
//             </tr>
//           </thead>

//           <tbody>
//             {movies.map(movie => (
//               <tr key={movie._id} className="border-b border-gray-800">
//                 <td className="p-2">{movie.title}</td>
//                 <td className="p-2">{movie.genre}</td>
//                 <td className="p-2">
//                   <button
//                     onClick={() => deleteMovie(movie._id)}
//                     className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//       </div>

//     </div>
//   );
// }

// export default Admin;













import { useEffect, useState } from "react";
import axios from "axios";

function Admin() {

  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);

  const [movie, setMovie] = useState({
    title: "",
    description: "",
    duration: "",
    poster: "",
    genre: ""
  });

  const [show, setShow] = useState({
    movieId: "",
    theatre: "",
    date: "",
    time: ""
  });

  // 🔹 Load movies & shows
  useEffect(() => {
    axios.get("http://localhost:5000/api/movies")
      .then(res => setMovies(res.data));

    axios.get("http://localhost:5000/api/shows")
      .then(res => setShows(res.data));
  }, []);

  const handleMovieChange = (e) => {
    setMovie({ ...movie, [e.target.name]: e.target.value });
  };

  const handleShowChange = (e) => {
    setShow({ ...show, [e.target.name]: e.target.value });
  };

  const addMovie = () => {
    axios.post("http://localhost:5000/api/movies", movie)
      .then(() => axios.get("http://localhost:5000/api/movies"))
      .then(res => setMovies(res.data));
  };

  const addShow = () => {
    axios.post("http://localhost:5000/api/shows", show)
      .then(() => axios.get("http://localhost:5000/api/shows"))
      .then(res => setShows(res.data));
  };

  const deleteMovie = (id) => {
    axios.delete(`http://localhost:5000/api/movies/${id}`)
      .then(() => setMovies(movies.filter(m => m._id !== id)));
  };

  const deleteShow = (id) => {
    axios.delete(`http://localhost:5000/api/shows/${id}`)
      .then(() => setShows(shows.filter(s => s._id !== id)));
  };

  return (
    <div className="bg-black min-h-screen text-white p-10">

      <h1 className="text-3xl font-bold mb-10 text-center">
        Admin Dashboard
      </h1>

      {/* ===== FORMS ===== */}
      <div className="grid grid-cols-2 gap-10">

        {/* Add Movie */}
        <div className="bg-gray-900 p-6 rounded-xl">
          <h2 className="text-xl mb-4">Add Movie</h2>
          <input name="title" placeholder="Title" onChange={handleMovieChange} className="w-full mb-2 p-2 bg-gray-800 rounded" />
          <input name="description" placeholder="Description" onChange={handleMovieChange} className="w-full mb-2 p-2 bg-gray-800 rounded" />
          <input name="duration" placeholder="Duration" onChange={handleMovieChange} className="w-full mb-2 p-2 bg-gray-800 rounded" />
          <input name="poster" placeholder="Poster URL" onChange={handleMovieChange} className="w-full mb-2 p-2 bg-gray-800 rounded" />
          <input name="genre" placeholder="Genre" onChange={handleMovieChange} className="w-full mb-4 p-2 bg-gray-800 rounded" />
          <button onClick={addMovie} className="bg-red-600 w-full py-2 rounded">Add Movie</button>
        </div>

        {/* Add Show */}
        <div className="bg-gray-900 p-6 rounded-xl">
          <h2 className="text-xl mb-4">Add Show</h2>
          <select name="movieId" onChange={handleShowChange} className="w-full mb-2 p-2 bg-gray-800 rounded">
            <option>Select Movie</option>
            {movies.map(m => <option key={m._id} value={m._id}>{m.title}</option>)}
          </select>
          <input name="theatre" placeholder="Theatre" onChange={handleShowChange} className="w-full mb-2 p-2 bg-gray-800 rounded" />
          <input type="date" name="date" onChange={handleShowChange} className="w-full mb-2 p-2 bg-gray-800 rounded" />
          <input name="time" placeholder="Time" onChange={handleShowChange} className="w-full mb-4 p-2 bg-gray-800 rounded" />
          <button onClick={addShow} className="bg-green-600 w-full py-2 rounded">Add Show</button>
        </div>

      </div>

      {/* ===== MOVIE TABLE ===== */}
      <div className="bg-gray-900 p-6 rounded-xl mt-12">
        <h2 className="text-xl mb-4">Movies</h2>
        {movies.map(m => (
          <div key={m._id} className="flex justify-between border-b border-gray-800 py-2">
            <span>{m.title}</span>
            <button onClick={() => deleteMovie(m._id)} className="bg-red-600 px-3 py-1 rounded">Delete</button>
          </div>
        ))}
      </div>

      {/* ===== SHOW TABLE ===== */}
      <div className="bg-gray-900 p-6 rounded-xl mt-12">
        <h2 className="text-xl mb-4">Shows</h2>
        {shows.map(s => (
          <div key={s._id} className="flex justify-between border-b border-gray-800 py-2">
            <span>
              {s.theatre} — {s.date} — {s.time}
            </span>
            <button onClick={() => deleteShow(s._id)} className="bg-red-600 px-3 py-1 rounded">Delete</button>
          </div>
        ))}
      </div>

    </div>
  );
}

export default Admin;
