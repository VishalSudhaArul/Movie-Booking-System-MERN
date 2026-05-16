import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName");
  const role = localStorage.getItem("role");
  const isLoggedIn = !!userId;
  
  // Show admin link if role is admin OR if they entered the bypass password
  const isAdmin = role === "admin" || role === "theaterOwner" || sessionStorage.getItem("admin_bypass") === "true";

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.removeItem("admin_bypass");
    navigate("/login");
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Home Link */}
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2 text-white font-bold text-xl hover:text-red-500 transition"
            >
              <span className="text-2xl">🎬</span>
              <span>CineBook</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="text-gray-300 hover:text-red-500 transition font-medium"
              >
                Home
              </Link>
              <Link
                to="/movies"
                className="text-gray-300 hover:text-red-500 transition font-medium"
              >
                Movies
              </Link>
            </div>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-6">
            {isLoggedIn && (
              <Link
                to="/my-bookings"
                className="text-gray-300 hover:text-white transition font-medium"
              >
                My Bookings
              </Link>
            )}

            <Link
              to="/admin/dashboard"
              className={`${isAdmin ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'} transition font-medium flex items-center gap-1`}
            >
              <span className="text-xs">⚙️</span> Admin
            </Link>

            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm font-medium border-l border-gray-700 pl-4">
                  👋 {userName || "User"}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-red-600/20"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white transition font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-red-600/20"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-300 hover:text-white focus:outline-none"
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

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0B0B0F] border-t border-gray-800 px-6 py-6 space-y-4 shadow-2xl">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-red-500 font-medium">
            Home
          </Link>
          <Link to="/movies" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-red-500 font-medium">
            Movies
          </Link>
          {isLoggedIn && (
            <Link to="/my-bookings" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white font-medium">
              My Bookings
            </Link>
          )}
          <Link to="/admin/dashboard" onClick={() => setMenuOpen(false)} className="block text-yellow-400 font-medium">
            ⚙️ Admin Panel
          </Link>
          <div className="pt-4 border-t border-gray-800">
            {isLoggedIn ? (
              <div className="space-y-4">
                <span className="block text-gray-500 text-sm">Logged in as {userName}</span>
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-600/20"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-center text-gray-300 hover:text-white font-medium py-2">
                  Login
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="block bg-red-600 text-white text-center py-3 rounded-xl font-bold">
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