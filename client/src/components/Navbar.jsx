import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import API from "../api";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  
  const cities = ["Mumbai", "Delhi NCR", "Bengaluru", "Chennai", "Hyderabad", "Kochi", "Pune", "Kolkata"];
  const [selectedCity, setSelectedCity] = useState(
    localStorage.getItem("selectedCity") || "Mumbai"
  );
  
  const [watchlistItems, setWatchlistItems] = useState([]);

  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName");
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const isLoggedIn = !!userId;

  const isAdmin = role === "admin" || role === "theaterOwner" || sessionStorage.getItem("admin_bypass") === "true";

  // Fetch user watchlist count/items
  useEffect(() => {
    if (token) {
      API.get("/api/users/watchlist")
        .then((res) => {
          setWatchlistItems(res.data || []);
        })
        .catch(() => {});
    }
  }, [token, location.pathname]);

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    localStorage.setItem("selectedCity", city);
    setCityOpen(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.removeItem("admin_bypass");
    setWatchlistItems([]);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-[#0B0B0F]/90 backdrop-blur-xl border-b border-gray-800/80 sticky top-0 z-50 shadow-2xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 bg-gradient-to-tr from-red-600 to-pink-500 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-red-600/30 group-hover:scale-105 transition transform">
                🎬
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black text-xl tracking-tight leading-none group-hover:text-red-400 transition">
                  CineBook
                </span>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-0.5">
                  Cinema Booking
                </span>
              </div>
            </Link>

            {/* City Selector */}
            <div className="relative">
              <button
                onClick={() => setCityOpen(!cityOpen)}
                className="flex items-center gap-2 bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-300 hover:text-white transition shadow-sm"
              >
                <span className="text-red-500 text-sm">📍</span>
                <span>{selectedCity}</span>
                <span className="text-[10px] text-gray-500">▼</span>
              </button>

              {cityOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-[#13131a] border border-gray-800 rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-gray-800 text-[10px] uppercase font-bold tracking-wider text-gray-400">
                    Select Your City
                  </div>
                  {cities.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleCitySelect(city)}
                      className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center justify-between hover:bg-red-600 hover:text-white transition ${
                        selectedCity === city ? "text-red-400 font-bold bg-red-950/20" : "text-gray-300"
                      }`}
                    >
                      <span>{city}</span>
                      {selectedCity === city && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Nav links */}
            <div className="hidden lg:flex items-center gap-2">
              <Link
                to="/"
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive("/")
                    ? "bg-red-600/10 text-red-500 border border-red-500/20"
                    : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                Home
              </Link>
              <Link
                to="/movies"
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive("/movies")
                    ? "bg-red-600/10 text-red-500 border border-red-500/20"
                    : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                Movies & Shows
              </Link>
            </div>
          </div>

          {/* Right Controls */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Watchlist Quick Button */}
            {isLoggedIn && (
              <div className="relative">
                <button
                  onClick={() => setWatchlistOpen(!watchlistOpen)}
                  className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-red-500/50 px-3.5 py-2 rounded-2xl text-xs font-bold text-gray-300 hover:text-white transition"
                  title="My Watchlist"
                >
                  <span className="text-red-500 text-sm">❤️</span>
                  <span>Watchlist</span>
                  {watchlistItems.length > 0 && (
                    <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {watchlistItems.length}
                    </span>
                  )}
                </button>

                {/* Watchlist Dropdown Drawer */}
                {watchlistOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-[#121219] border border-gray-800 rounded-3xl shadow-2xl p-4 z-50">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>❤️</span> My Watchlist ({watchlistItems.length})
                      </h4>
                      <button
                        onClick={() => setWatchlistOpen(false)}
                        className="text-gray-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-3 my-3 pr-1 custom-scrollbar">
                      {watchlistItems.length === 0 ? (
                        <p className="text-gray-500 text-xs text-center py-6">
                          Your watchlist is empty. Click ❤️ on movies to save them!
                        </p>
                      ) : (
                        watchlistItems.map((item) => {
                          const movieObj = item._id ? item : { _id: item, title: "Saved Movie" };
                          return (
                            <div
                              key={movieObj._id}
                              onClick={() => {
                                navigate(`/movies/${movieObj._id}`);
                                setWatchlistOpen(false);
                              }}
                              className="flex items-center gap-3 p-2 bg-gray-900/60 hover:bg-gray-800 border border-gray-800/80 rounded-2xl cursor-pointer transition"
                            >
                              {movieObj.poster ? (
                                <img
                                  src={movieObj.poster}
                                  alt={movieObj.title}
                                  className="w-10 h-14 object-cover rounded-xl"
                                />
                              ) : (
                                <div className="w-10 h-14 bg-gray-800 rounded-xl flex items-center justify-center text-xs">🎬</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h5 className="text-xs font-bold text-white truncate">{movieObj.title}</h5>
                                <p className="text-[10px] text-gray-400">{movieObj.genre || "Action / Drama"}</p>
                              </div>
                              <span className="text-red-500 text-xs font-bold">Book →</span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <Link
                      to="/movies"
                      onClick={() => setWatchlistOpen(false)}
                      className="block w-full text-center bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold py-2 rounded-xl transition"
                    >
                      Browse More Movies
                    </Link>
                  </div>
                )}
              </div>
            )}

            {isLoggedIn && (
              <Link
                to="/my-bookings"
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive("/my-bookings")
                    ? "bg-red-600/10 text-red-500 border border-red-500/20"
                    : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                🎟️ My Tickets
              </Link>
            )}

            <Link
              to="/admin/dashboard"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isAdmin
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span>⚙️</span> Admin
            </Link>

            {isLoggedIn ? (
              <div className="flex items-center gap-3 border-l border-gray-800 pl-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="text-gray-200 text-xs font-bold truncate max-w-[100px]">
                    {userName || "User"}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="bg-gray-900 hover:bg-red-600/20 border border-gray-800 hover:border-red-500/40 text-gray-300 hover:text-red-400 text-xs font-bold px-3 py-2 rounded-xl transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white text-xs font-bold px-4 py-2 rounded-xl border border-gray-800 hover:border-gray-700 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white text-xs font-extrabold px-5 py-2.5 rounded-2xl transition shadow-lg shadow-red-600/30"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-300 hover:text-white p-2 rounded-xl bg-gray-900 border border-gray-800"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-[#0D0D12] border-t border-gray-800 px-6 py-6 space-y-4 shadow-2xl animate-fadeIn">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="block text-gray-200 hover:text-red-400 font-bold text-sm"
          >
            Home
          </Link>
          <Link
            to="/movies"
            onClick={() => setMenuOpen(false)}
            className="block text-gray-200 hover:text-red-400 font-bold text-sm"
          >
            Movies & Shows
          </Link>
          {isLoggedIn && (
            <Link
              to="/my-bookings"
              onClick={() => setMenuOpen(false)}
              className="block text-gray-200 hover:text-red-400 font-bold text-sm"
            >
              🎟️ My Tickets
            </Link>
          )}
          <Link
            to="/admin/dashboard"
            onClick={() => setMenuOpen(false)}
            className="block text-amber-400 font-bold text-sm"
          >
            ⚙️ Admin Console
          </Link>

          <div className="pt-4 border-t border-gray-800">
            {isLoggedIn ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-red-600 to-purple-600 flex items-center justify-center font-bold text-white">
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">{userName}</p>
                    <p className="text-xs text-gray-500">Active Cinema Member</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-bold text-sm shadow-lg shadow-red-600/30"
                >
                  Logout Account
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-center text-gray-200 border border-gray-800 py-3 rounded-2xl font-bold text-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="bg-red-600 text-white text-center py-3 rounded-2xl font-bold text-sm shadow-lg shadow-red-600/30"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}