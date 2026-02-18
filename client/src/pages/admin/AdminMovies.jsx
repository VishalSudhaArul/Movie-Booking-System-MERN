import { useEffect, useState } from "react";
import axios from "axios";

function AdminMovies(){

const [movies,setMovies] = useState([]);
const [search,setSearch] = useState("");

const [title,setTitle] = useState("");
const [description,setDescription] = useState("");
const [duration,setDuration] = useState("");
const [poster,setPoster] = useState("");
const [genre,setGenre] = useState("");

const [editId,setEditId] = useState(null);
const [deleteId,setDeleteId] = useState(null);

const API_URL = process.env.REACT_APP_API_URL;



/* FETCH */

// const fetchMovies = async ()=>{

//   const res = await axios.get("http://localhost:5000/api/movies");
//   setMovies(res.data);
// };

// useEffect(()=>{
//   fetchMovies();
// },[]);

/* FETCH */

const fetchMovies = async ()=>{

  const res = await axios.get("http://localhost:5000/api/movies");
  setMovies(res.data);
};

useEffect(()=>{
  fetchMovies();
},[]);

/* SAVE */

// const saveMovie = async ()=>{

//   if(!title || !poster) return alert("Fill Required Fields");

//   if(editId){

//     await axios.put(
//       `http://localhost:5000/api/movies/${editId}`,
//       {title,description,duration,poster,genre}
//     );

//     setEditId(null);

//   }else{

//     await axios.post(
//       "http://localhost:5000/api/movies",
//       {title,description,duration,poster,genre}
//     );
//   }

//   setTitle("");
//   setDescription("");
//   setDuration("");
//   setPoster("");
//   setGenre("");

//   fetchMovies();
// };

/* SAVE */

const saveMovie = async () => {

  if (!title || !poster) return alert("Fill Required Fields");

  try {

    if (editId) {

      await axios.put(
        `${API_URL}/api/movies/${editId}`,
        { title, description, duration, poster, genre }
      );

      setEditId(null);

    } else {

      await axios.post(
        `${API_URL}/api/movies`,
        { title, description, duration, poster, genre }
      );
    }

    setTitle("");
    setDescription("");
    setDuration("");
    setPoster("");
    setGenre("");

    fetchMovies();

  } catch (err) {

    console.log("Save movie error:", err);

  }
};







/* DELETE */

// const deleteMovie = async ()=>{

//   await axios.delete(
//     `http://localhost:5000/api/movies/${deleteId}`
//   );

//   setDeleteId(null);
//   fetchMovies();
// };

/* DELETE */

const deleteMovie = async () => {

  try {

    await axios.delete(
      `${API_URL}/api/movies/${deleteId}`
    );

    setDeleteId(null);
    fetchMovies();

  } catch (err) {

    console.log("Delete movie error:", err);

  }

};






return(

<div className="bg-black min-h-screen text-white p-10">

<h1 className="text-3xl font-bold mb-10">
🎬 Movie Control Center
</h1>

{/* ---------- FORM ---------- */}

<div className="bg-gradient-to-br from-[#0f172a] to-[#020617] p-6 rounded-2xl mb-12 shadow-lg">

<div className="grid md:grid-cols-5 gap-4 mb-4">

<input
placeholder="Movie Title"
value={title}
onChange={e=>setTitle(e.target.value)}
className="p-3 bg-[#020617] rounded"
/>

<input
placeholder="Genre"
value={genre}
onChange={e=>setGenre(e.target.value)}
className="p-3 bg-[#020617] rounded"
/>

<input
placeholder="Duration"
value={duration}
onChange={e=>setDuration(e.target.value)}
className="p-3 bg-[#020617] rounded"
/>

<input
placeholder="Poster URL"
value={poster}
onChange={e=>setPoster(e.target.value)}
className="p-3 bg-[#020617] rounded"
/>

<button
onClick={saveMovie}
className="bg-red-600 rounded font-semibold hover:bg-red-700 transition"
>
{editId ? "Update" : "Add Movie"}
</button>

</div>

<textarea
placeholder="Description"
value={description}
onChange={e=>setDescription(e.target.value)}
className="w-full p-4 bg-[#020617] rounded"
/>

</div>

{/* SEARCH */}

<input
placeholder="🔍 Search Movies..."
value={search}
onChange={e=>setSearch(e.target.value)}
className="p-3 bg-[#020617] rounded mb-10 w-80"
/>

{/* ---------- MOVIE GRID ---------- */}

<div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">

{movies
.filter(m=>m.title.toLowerCase().includes(search.toLowerCase()))
.map(m=>(

<div
key={m._id}
className="
relative
group
rounded-2xl
overflow-hidden
shadow-lg
bg-[#020617]
"
>

{/* Poster */}

<img
src={m.poster}
className="
h-[280px]
w-full

group-hover:scale-110
transition duration-500
"
/>

{/* Overlay */}

<div className="
absolute
bottom-0
left-0
right-0
bg-gradient-to-t from-black to-transparent
p-5
">

<h2 className="text-lg font-semibold">
{m.title}
</h2>

<div className="flex justify-between items-center mt-2">

<span className="text-red-400 text-sm bg-red-900/40 px-2 py-1 rounded">
{m.genre}
</span>

<span className="text-green-400 text-sm">
⏱ {m.duration} mins
</span>

</div>

<p className="text-gray-400 text-sm mt-2 line-clamp-2">
{m.description}
</p>

{/* ACTION BUTTONS */}

<div className="flex gap-3 mt-4">

<button
onClick={()=>{
setEditId(m._id);
setTitle(m.title);
setDescription(m.description);
setDuration(m.duration);
setPoster(m.poster);
setGenre(m.genre);
}}
className="bg-yellow-400 px-3 py-1 rounded text-black text-sm hover:scale-105 transition"
>
Edit
</button>

<button
onClick={()=>setDeleteId(m._id)}
className="bg-red-600 px-3 py-1 rounded text-sm hover:scale-105 transition"
>
Delete
</button>

</div>

</div>

</div>

))}

</div>

{/* DELETE MODAL */}

{deleteId && (

<div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center">

<div className="bg-[#0f172a] p-8 rounded-2xl">

<h2 className="text-xl mb-6">
Delete this movie?
</h2>

<div className="flex gap-6">

<button
onClick={deleteMovie}
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

export default AdminMovies;
