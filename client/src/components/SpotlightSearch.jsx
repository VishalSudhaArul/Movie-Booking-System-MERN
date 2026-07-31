import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function SpotlightSearch({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState([]);
  const [snacks, setSnacks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        API.get("/api/movies").catch(() => ({ data: [] })),
        API.get("/api/snacks").catch(() => ({ data: [] })),
      ]).then(([resMovies, resSnacks]) => {
        setMovies(resMovies.data || []);
        setSnacks(resSnacks.data || []);
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredMovies = movies.filter(
    (m) =>
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      m.genre.toLowerCase().includes(query.toLowerCase())
  );

  const filteredSnacks = snacks.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center pt-20 p-4 animate-fadeIn">
      <div className="bg-[#0F0F17] border border-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0">
        
        {/* Search Header */}
        <div className="p-4 border-b border-gray-800/80 flex items-center gap-3 bg-[#0A0A0F]">
          <span className="text-xl text-gray-400">🔍</span>
          <input
            autoFocus
            placeholder="Type to search movies, genres, popcorn, beverages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-xl transition"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="py-8 text-center text-xs text-gray-500">Searching CineBook directory...</div>
          ) : (
            <>
              {/* Movies Section */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-red-400 mb-3">
                  🎬 Movies ({filteredMovies.length})
                </h4>
                {filteredMovies.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No matching movies found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredMovies.slice(0, 4).map((m) => (
                      <div
                        key={m._id}
                        onClick={() => {
                          onClose();
                          navigate(`/movie/${m._id}`);
                        }}
                        className="bg-gray-950 hover:bg-red-950/40 border border-gray-800/80 hover:border-red-800 p-2.5 rounded-2xl flex items-center gap-3 cursor-pointer transition"
                      >
                        <img
                          src={m.poster}
                          alt={m.title}
                          className="w-10 h-14 object-cover rounded-xl border border-gray-800"
                        />
                        <div className="overflow-hidden">
                          <h5 className="text-xs font-bold text-white truncate">{m.title}</h5>
                          <span className="text-[10px] text-red-400 font-semibold">{m.genre}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Snacks Section */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-400 mb-3">
                  🍿 CinePantry Snacks ({filteredSnacks.length})
                </h4>
                {filteredSnacks.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No matching snacks found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredSnacks.slice(0, 4).map((s) => (
                      <div
                        key={s._id}
                        onClick={() => {
                          onClose();
                          navigate("/snacks");
                        }}
                        className="bg-gray-950 hover:bg-amber-950/40 border border-gray-800/80 hover:border-amber-800 p-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🍿</span>
                          <div>
                            <h5 className="text-xs font-bold text-white">{s.name}</h5>
                            <span className="text-[10px] text-gray-400">{s.category || "Snacks"}</span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-amber-400">₹{s.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0A0A0F] border-t border-gray-800/80 text-center text-[10px] text-gray-500">
          Tip: Press <kbd className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded font-mono">Ctrl + K</kbd> anywhere to open Spotlight Search
        </div>

      </div>
    </div>
  );
}
