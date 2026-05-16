import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName");
  const role = localStorage.getItem("role");
  const isLoggedIn = !!userId;
  const isAdmin = role === "admin";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 text-white font-bold text-xl hover:text-red-400 transition"
          >
            <span className="text-2xl">🎬</span>
            <span>CineBook</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/movies"
              className="text-gray-300 hover:text-white transition font-medium"
            >
              Movies
            </Link>

            {isLoggedIn && (
              <Link
                to="/my-bookings"
                className="text-gray-300 hover:text-white transition font-medium"
              >
                My Bookings
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className="text-yellow-400 hover:text-yellow-300 transition font-medium"
              >
                Admin Panel
              </Link>
            )}

            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm">
                  👋 {userName || "User"}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
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
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
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
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-4 space-y-3">
          <Link to="/movies" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white">
            Movies
          </Link>
          {isLoggedIn && (
            <Link to="/my-bookings" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white">
              My Bookings
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="block text-yellow-400 hover:text-yellow-300">
              Admin Panel
            </Link>
          )}
          {isLoggedIn ? (
            <>
              <span className="block text-gray-500 text-sm">Logged in as {userName}</span>
              <button
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white">
                Login
              </Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="block bg-red-600 text-white text-center py-2 rounded-lg font-semibold">
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}