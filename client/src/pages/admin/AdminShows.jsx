import { useEffect, useState } from "react";
import axios from "axios";

function AdminShows() {

  const [movies,setMovies] = useState([]);
  const [shows,setShows] = useState([]);

  const [movieId,setMovieId] = useState("");
  const [theatre,setTheatre] = useState("");
  const [date,setDate] = useState("");
  const [time,setTime] = useState("");

  const [balconyPrice,setBalconyPrice] = useState("");
  const [firstPrice,setFirstPrice] = useState("");
  const [secondPrice,setSecondPrice] = useState("");

  const [editId,setEditId] = useState(null);
  const [deleteId,setDeleteId] = useState(null);


  /* ---------- FETCH ---------- */

  const fetchData = async () => {

    const movieRes = await axios.get("http://localhost:5000/api/movies");
    const showRes = await axios.get("http://localhost:5000/api/shows");

    setMovies(movieRes.data);
    setShows(showRes.data);
  };

  useEffect(()=>{
    fetchData();
  },[]);


  /* ---------- SAVE SHOW ---------- */

  const saveShow = async () => {

 if (
  movieId.trim() === "" ||
  theatre.trim() === "" ||
  date.trim() === "" ||
  time.trim() === "" ||
  balconyPrice === "" ||
  firstPrice === "" ||
  secondPrice === ""
) {
  alert("Fill all fields");
  return;
}


  if(editId){

    await axios.put(
      `http://localhost:5000/api/shows/${editId}`,
      {
        movieId,
        theatre,
        date,
        time,
        balconyPrice,
        firstClassPrice: firstPrice,
        secondClassPrice: secondPrice
      }
    );

    setEditId(null);

  } else {

    await axios.post(
      "http://localhost:5000/api/shows",
      {
        movieId,
        theatre,
        date,
        time,
        balconyPrice,
        firstClassPrice: firstPrice,
        secondClassPrice: secondPrice
      }
    );
  }

  setMovieId("");
  setTheatre("");
  setDate("");
  setTime("");
  setBalconyPrice("");
  setFirstPrice("");
  setSecondPrice("");

  fetchData();
};



  /* ---------- RESET FORM ---------- */

  const resetForm = () => {
    setMovieId("");
    setTheatre("");
    setDate("");
    setTime("");
    setBalconyPrice("");
    setFirstPrice("");
    setSecondPrice("");
    setEditId(null);
  };


  /* ---------- DELETE ---------- */

  const deleteShow = async () => {

    await axios.delete(
      `http://localhost:5000/api/shows/${deleteId}`
    );

    setDeleteId(null);
    fetchData();
  };


  return (

    <div className="bg-black min-h-screen text-white p-8">

      <h1 className="text-3xl font-bold mb-8">
        🎭 Manage Shows
      </h1>


      {/* ---------- FORM ---------- */}

      {/* ---------- FORM ---------- */}

<div className="bg-[#0f172a] p-6 rounded-xl mb-10">

  <div className="grid md:grid-cols-4 gap-4 mb-4">

    {/* Movie */}
    <select
      value={movieId}
      onChange={e=>setMovieId(e.target.value)}
      className="p-3 bg-[#020617] rounded w-full"
    >
      <option value="">Select Movie</option>
      {movies.map(m=>(
        <option key={m._id} value={m._id}>
          {m.title}
        </option>
      ))}
    </select>

    {/* Theatre */}
    <input
      placeholder="Theatre"
      value={theatre}
      onChange={e=>setTheatre(e.target.value)}
      className="p-3 bg-[#020617] rounded w-full"
    />

    {/* Date */}
    <input
      type="date"
      value={date}
      onChange={e=>setDate(e.target.value)}
      className="p-3 bg-[#020617] rounded w-full"
    />

    {/* Time */}
    {/* <input
      type="time"
      value={time}
      onChange={e=>setTime(e.target.value)}
      className="p-3 bg-[#020617] rounded w-full"
    /> */}
    <input
//   type="time"
//   value={time || ""}
//   onChange={(e) => setTime(e.target.value)}
//   className="p-3 bg-[#020617] rounded w-full text-white"
//   required
// />

  type="time"
  value={time}
  onChange={(e) => setTime(e.target.value)}
  className="p-3 bg-[#020617] rounded text-white"
  required
/>



  </div>

  {/* PRICE ROW */}
  <div className="grid md:grid-cols-4 gap-4">

    <input
      type="number"
      placeholder="Balcony Price"
      value={balconyPrice}
      onChange={e=>setBalconyPrice(e.target.value)}
      className="p-3 bg-[#020617] rounded w-full"
    />

    <input
      type="number"
      placeholder="First Class Price"
      value={firstPrice}
      onChange={e=>setFirstPrice(e.target.value)}
      className="p-3 bg-[#020617] rounded w-full"
    />

    <input
      type="number"
      placeholder="Second Class Price"
      value={secondPrice}
      onChange={e=>setSecondPrice(e.target.value)}
      className="p-3 bg-[#020617] rounded w-full"
    />

    <button
      onClick={saveShow}
      className="bg-red-600 rounded text-white font-semibold"
    >
      {editId ? "Update Show" : "Add Show"}
    </button>

  </div>

</div>


      {/* ---------- SHOW LIST ---------- */}

      <div className="grid md:grid-cols-2 gap-6">

        {shows.map(s=>(

          <div
            key={s._id}
            className="bg-gradient-to-br from-[#0f172a] to-[#020617] p-6 rounded-xl flex gap-5"
          >

            <img
              src={s.movieId?.poster}
              alt="poster"
              className="w-24 h-32 rounded object-cover"
            />

            <div className="flex-1">

              <h2 className="text-xl font-semibold">
                {s.movieId?.title}
              </h2>

              <p className="text-red-400 mt-2">
                🎭 {s.theatre}
              </p>

              <p>📅 {s.date}</p>
              <p>⏰ {s.time}</p>

              <p className="text-green-400">
                💺 {s.seats?.length} Seats
              </p>

              <div className="mt-3 text-sm text-gray-400">
                Balcony ₹{s.balconyPrice} |
                First ₹{s.firstClassPrice} |
                Second ₹{s.secondClassPrice}
              </div>

              <div className="flex gap-3 mt-4">

                <button
                  onClick={()=>{
                    setEditId(s._id);
                    setMovieId(s.movieId?._id);
                    setTheatre(s.theatre);
                    setDate(s.date);
                    setTime(s.time);
                    setBalconyPrice(s.balconyPrice);
                    setFirstPrice(s.firstClassPrice);
                    setSecondPrice(s.secondClassPrice);
                  }}
                  className="bg-yellow-400 px-4 py-2 rounded text-black"
                >
                  Edit
                </button>

                <button
                  onClick={()=>setDeleteId(s._id)}
                  className="bg-red-500 px-4 py-2 rounded"
                >
                  Delete
                </button>

              </div>

            </div>

          </div>

        ))}

      </div>


      {/* ---------- DELETE MODAL ---------- */}

      {deleteId && (

        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center">

          <div className="bg-[#0f172a] p-8 rounded-xl">

            <h2 className="mb-5 text-xl">
              Delete Show?
            </h2>

            <div className="flex gap-5">

              <button
                onClick={deleteShow}
                className="bg-red-600 px-6 py-2 rounded"
              >
                Delete
              </button>

              <button
                onClick={()=>setDeleteId(null)}
                className="bg-gray-600 px-6 py-2 rounded"
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default AdminShows;
