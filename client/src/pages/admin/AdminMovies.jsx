import { useEffect, useState } from "react";
import API from "../../api";
import TrailerModal, { getYouTubeEmbedUrl } from "../../components/TrailerModal";

function AdminMovies() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedGenreFilter, setSelectedGenreFilter] = useState("All");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [poster, setPoster] = useState("");
  const [genre, setGenre] = useState("");
  const [trailerUrl, setTrailerUrl] = useState("");

  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // In-app Trailer Modal state for grid cards
  const [activeTrailer, setActiveTrailer] = useState(null);

  const predefinedGenres = [
    "Action",
    "Sci-Fi",
    "Drama",
    "Comedy",
    "Thriller",
    "Horror",
    "Romance",
    "Animation",
  ];

  /* FETCH MOVIES */
  const fetchMovies = async () => {
    try {
      const res = await API.get("/api/movies");
      setMovies(res.data || []);
    } catch (err) {
      console.log("Fetch movies error:", err);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  /* SAVE / UPDATE MOVIE */
  const saveMovie = async () => {
    if (!title.trim() || !poster.trim()) {
      return alert("Title and Poster URL are required!");
    }

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        duration: Number(duration) || 120,
        poster: poster.trim(),
        genre: genre.trim() || "Action",
        trailerUrl: trailerUrl.trim(),
      };

      if (editId) {
        await API.put(`/api/movies/${editId}`, payload);
        setEditId(null);
      } else {
        await API.post("/api/movies", payload);
      }

      // Reset form
      resetForm();
      fetchMovies();
    } catch (err) {
      console.log("Save movie error:", err);
      alert("Error saving movie: " + (err.response?.data?.message || err.message));
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDuration("");
    setPoster("");
    setGenre("");
    setTrailerUrl("");
    setEditId(null);
  };

  /* EDIT HANDLER */
  const handleEdit = (m) => {
    setEditId(m._id);
    setTitle(m.title || "");
    setDescription(m.description || "");
    setDuration(m.duration || "");
    setPoster(m.poster || "");
    setGenre(m.genre || "");
    setTrailerUrl(m.trailerUrl || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* DELETE HANDLER */
  const deleteMovie = async () => {
    try {
      await API.delete(`/api/movies/${deleteId}`);
      setDeleteId(null);
      fetchMovies();
    } catch (err) {
      console.log("Delete movie error:", err);
      alert("Error deleting movie: " + (err.response?.data?.message || err.message));
    }
  };

  // Duration Helper
  const formatDuration = (mins) => {
    if (!mins) return "N/A";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const filteredMovies = movies.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.genre.toLowerCase().includes(search.toLowerCase());
    const matchesGenre =
      selectedGenreFilter === "All" ||
      m.genre.toLowerCase() === selectedGenreFilter.toLowerCase();
    return matchesSearch && matchesGenre;
  });

  const previewEmbedUrl = getYouTubeEmbedUrl(trailerUrl);

  return (
    <div className="bg-[#08080C] min-h-screen text-white p-6 md:p-12 pb-24">
      
      {/* 🎬 Header & Admin Stats */}
      <div className="max-w-7xl mx-auto space-y-6 mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/30 text-red-400 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <span>⚙️</span> Cinema Catalog Manager
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Movie Control Center & Trailer Studio
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-gray-900/90 border border-gray-800 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Movies</span>
              <span className="text-xl font-extrabold text-white">{movies.length}</span>
            </div>
            <div className="bg-gray-900/90 border border-gray-800 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">With Trailers</span>
              <span className="text-xl font-extrabold text-red-500">
                {movies.filter((m) => !!m.trailerUrl).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 📝 FORM & LIVE IN-APP TRAILER PREVIEW BOX */}
      <div className="max-w-7xl mx-auto bg-gray-900/70 border border-gray-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl mb-12">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>{editId ? "✏️ Edit Movie Details" : "➕ Add New Movie to Catalog"}</span>
          </h2>
          {editId && (
            <button
              onClick={resetForm}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-3 py-1.5 rounded-xl transition"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Form Inputs */}
          <div className="lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Movie Title *</label>
                <input
                  placeholder="e.g. Inception"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-2xl text-sm text-white focus:outline-none focus:border-red-500 transition"
                />
              </div>

              {/* Genre */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Genre *</label>
                <input
                  placeholder="e.g. Action / Sci-Fi"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-2xl text-sm text-white focus:outline-none focus:border-red-500 transition"
                />
              </div>

            </div>

            {/* Quick Genre Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-gray-500 font-bold mr-1">Quick Genre:</span>
              {predefinedGenres.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(g)}
                  className="text-[11px] bg-gray-950 hover:bg-red-950/60 border border-gray-800 hover:border-red-800 text-gray-300 hover:text-red-400 px-2.5 py-1 rounded-xl transition"
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Duration (Minutes)</label>
                <input
                  type="number"
                  placeholder="e.g. 148"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-2xl text-sm text-white focus:outline-none focus:border-red-500 transition"
                />
              </div>

              {/* Poster URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Poster Image URL *</label>
                <input
                  placeholder="https://..."
                  value={poster}
                  onChange={(e) => setPoster(e.target.value)}
                  className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-2xl text-sm text-white focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* 🎬 YouTube Trailer Link Box */}
            <div className="space-y-1.5 bg-red-950/20 border border-red-800/40 p-4 rounded-2xl">
              <label className="text-xs font-bold text-red-400 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>🎬</span> YouTube Trailer Link (Plays In-App)
                </span>
                <span className="text-[10px] text-gray-400 font-normal">Supports watch, share, or embed URLs</span>
              </label>
              <input
                placeholder="e.g. https://www.youtube.com/watch?v=YoHD9XEInc0"
                value={trailerUrl}
                onChange={(e) => setTrailerUrl(e.target.value)}
                className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-2xl text-sm text-white focus:outline-none focus:border-red-500 transition font-mono"
              />
              <p className="text-[11px] text-gray-400">
                Paste any YouTube trailer link here. It will render and play inside an embedded player box directly in CineBook!
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Synopsis / Description</label>
              <textarea
                rows="3"
                placeholder="Enter movie storyline summary..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-2xl text-sm text-white focus:outline-none focus:border-red-500 transition"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={saveMovie}
              className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-extrabold py-4 rounded-2xl transition shadow-xl shadow-red-600/30 text-base"
            >
              {editId ? "💾 Save Changes & Update Movie" : "🚀 Add Movie to CineBook"}
            </button>
          </div>

          {/* Right Live Preview Column (Poster Card + Embedded Trailer Player Box) */}
          <div className="lg:col-span-5 space-y-4 bg-gray-950 p-6 rounded-3xl border border-gray-800/80 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span>👁️</span> Live In-App Preview
              </h3>

              {/* Poster Preview */}
              <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-[16/10] border border-gray-800 mb-4 shadow-xl">
                {poster ? (
                  <img
                    src={poster}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 space-y-2">
                    <span className="text-3xl">🎬</span>
                    <span className="text-xs">Enter Poster Image URL</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-4 flex flex-col justify-end">
                  <span className="text-xs text-red-400 font-bold">{genre || "Genre"}</span>
                  <h4 className="text-lg font-bold text-white">{title || "Movie Title"}</h4>
                  <span className="text-[11px] text-gray-300">Duration: {formatDuration(Number(duration))}</span>
                </div>
              </div>

              {/* 📺 Embedded Live YouTube Player Box */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>📺</span> Embedded Trailer Box (Plays Inside App)
                </span>

                {previewEmbedUrl ? (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-red-500/40 bg-black shadow-2xl">
                    <iframe
                      src={previewEmbedUrl}
                      title="Trailer Live Preview"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 flex flex-col items-center justify-center p-4 text-center space-y-2">
                    <span className="text-2xl text-gray-600">▶</span>
                    <p className="text-xs text-gray-500">
                      Paste a YouTube URL in the Trailer box on the left to test the player directly inside this box!
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[11px] text-gray-500 text-center pt-2">
              All movies saved with trailers will feature the in-app player for visitors.
            </div>
          </div>

        </div>
      </div>

      {/* 🔍 SEARCH & FILTERS BAR */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        
        <div className="relative w-full md:w-80">
          <input
            placeholder="🔍 Search title or genre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3.5 bg-gray-900/90 border border-gray-800 rounded-2xl text-sm text-white focus:outline-none focus:border-red-500 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-3.5 text-xs text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Genre filter buttons */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setSelectedGenreFilter("All")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedGenreFilter === "All"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            All Movies ({movies.length})
          </button>
          {predefinedGenres.map((g) => {
            const count = movies.filter((m) => m.genre.toLowerCase() === g.toLowerCase()).length;
            return (
              <button
                key={g}
                onClick={() => setSelectedGenreFilter(g)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedGenreFilter === g
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {g} ({count})
              </button>
            );
          })}
        </div>

      </div>

      {/* 🎬 MOVIE GRID CATALOG */}
      <div className="max-w-7xl mx-auto">
        {filteredMovies.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-800 rounded-3xl bg-gray-900/30 space-y-3">
            <span className="text-4xl block">🎬</span>
            <p className="text-gray-400 font-semibold">No movies found matching criteria.</p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedGenreFilter("All");
              }}
              className="text-xs text-red-400 font-bold hover:underline"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredMovies.map((m) => {
              const hasTrailer = !!m.trailerUrl;

              return (
                <div
                  key={m._id}
                  className="bg-gray-900/90 border border-gray-800/80 rounded-3xl overflow-hidden shadow-2xl hover:border-gray-700 transition flex flex-col justify-between group"
                >
                  <div className="relative h-80 overflow-hidden">
                    <img
                      src={m.poster}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800";
                      }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08080C] via-transparent to-black/40 p-4 flex flex-col justify-between">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black bg-red-600/90 text-white px-2.5 py-1 rounded-full shadow">
                          {m.genre}
                        </span>
                        <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                          ⏱ {formatDuration(m.duration)}
                        </span>
                      </div>

                      {/* 🎬 In-App Trailer Play Button */}
                      {hasTrailer && (
                        <button
                          onClick={() => setActiveTrailer({ url: m.trailerUrl, title: m.title })}
                          className="self-center bg-red-600/90 hover:bg-red-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-full flex items-center gap-2 shadow-2xl backdrop-blur-md hover:scale-105 transition"
                        >
                          <span>▶</span> Watch In-App Trailer
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-white group-hover:text-red-400 transition truncate">
                        {m.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                        {m.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-800/80">
                      <button
                        onClick={() => handleEdit(m)}
                        className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-bold text-xs py-2.5 rounded-xl transition text-center"
                      >
                        ✏️ Edit
                      </button>

                      {hasTrailer && (
                        <button
                          onClick={() => setActiveTrailer({ url: m.trailerUrl, title: m.title })}
                          className="bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-400 font-bold text-xs px-3 py-2.5 rounded-xl transition"
                          title="Play Trailer In-App"
                        >
                          ▶
                        </button>
                      )}

                      <button
                        onClick={() => setDeleteId(m._id)}
                        className="bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-400 font-bold text-xs px-3.5 py-2.5 rounded-xl transition"
                        title="Delete Movie"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📺 IN-APP TRAILER MODAL FOR GRID CARDS */}
      {activeTrailer && (
        <TrailerModal
          isOpen={!!activeTrailer}
          onClose={() => setActiveTrailer(null)}
          trailerUrl={activeTrailer.url}
          movieTitle={activeTrailer.title}
        />
      )}

      {/* ⚠️ DELETE CONFIRMATION MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#111118] border border-gray-800 p-6 rounded-3xl max-w-sm w-full text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 bg-red-600/20 border border-red-500/40 rounded-2xl flex items-center justify-center text-red-500 text-2xl mx-auto">
              🗑️
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Delete Movie?</h3>
              <p className="text-xs text-gray-400 mt-1">
                Are you sure you want to delete this movie from the catalog?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={deleteMovie}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 rounded-2xl transition shadow-lg shadow-red-600/30"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs py-3 rounded-2xl transition"
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
